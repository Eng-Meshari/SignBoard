'use strict';

// Must match firmware/SignBoard/config.h
const W = 128;
const H = 64;
const WS_PORT = 81;

const PEN_WIDTH = 2;          // stroke width in OLED pixels
const SEND_INTERVAL_MS = 40;  // live-stream throttle; one I2C frame push takes ~25 ms

/**
 * Threshold RGBA pixels to pure black/white *in place* (so the canvas shows exactly
 * what the OLED will) and pack them into SSD1306 page format:
 * 8 pages x 128 columns, byte = (y >> 3) * 128 + x, bit = y & 7 (LSB = top).
 */
function toBitmap(px) {
  const out = new Uint8Array(W * H / 8);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const on = px[i] > 127;
      px[i] = px[i + 1] = px[i + 2] = on ? 255 : 0;
      if (on) out[(y >> 3) * W + x] |= 1 << (y & 7);
    }
  }
  return out;
}

if (typeof module !== 'undefined') module.exports = { toBitmap, W, H };  // for tools/test_bitmap.js
else init();

function init() {
  const canvas = document.getElementById('pad');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const statusEl = document.getElementById('status');
  const liveEl = document.getElementById('live');

  // Served by the ESP32 -> same host. Served elsewhere (dev) -> ?host=<esp32-ip>.
  const host = new URLSearchParams(location.search).get('host') || location.hostname || 'signboard.local';
  const wsUrl = `ws://${host}:${WS_PORT}/`;

  let ws = null;
  let frame = null;      // latest packed 1024-byte bitmap
  let dirty = true;      // canvas changed since last pack
  let pending = false;   // frame should be delivered to the OLED
  let lastSent = 0;
  let pointerId = null;
  let last = null;

  ctx.lineWidth = PEN_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#fff';
  clear();

  // ---- Drawing (Pointer Events: finger, Apple Pencil and mouse alike) ----------

  function point(e) {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height];
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (pointerId !== null) return; // one stroke at a time, ignore extra fingers/palm
    pointerId = e.pointerId;
    canvas.setPointerCapture(pointerId);
    last = point(e);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(last[0], last[1], PEN_WIDTH / 2, 0, Math.PI * 2);
    ctx.fill();
    dirty = true;
  });

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pointerId) return;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(last[0], last[1]);
    ctx.lineTo(p[0], p[1]);
    ctx.stroke();
    last = p;
    dirty = true;
  });

  const endStroke = (e) => { if (e.pointerId === pointerId) pointerId = null; };
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);

  // Stop iPad Safari pinch-zooming the page (it ignores user-scalable=no).
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  // ---- Buttons ---------------------------------------------------------------

  function clear() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    dirty = true;
  }

  document.getElementById('clear').addEventListener('click', clear);
  document.getElementById('submit').addEventListener('click', () => { pending = true; });
  liveEl.addEventListener('change', () => { if (liveEl.checked) pending = true; });

  // ---- Pack + send loop --------------------------------------------------------
  // Packs at most once per display frame and sends at most every SEND_INTERVAL_MS,
  // only when the previous frame has left the socket. Because `pending` stays set
  // until a send succeeds, the final frame of every stroke is always delivered.

  function tick(now) {
    if (dirty) {
      dirty = false;
      const img = ctx.getImageData(0, 0, W, H);
      frame = toBitmap(img.data);
      ctx.putImageData(img, 0, 0);
      if (liveEl.checked) pending = true;
    }
    if (pending && now - lastSent >= SEND_INTERVAL_MS &&
        ws && ws.readyState === WebSocket.OPEN && ws.bufferedAmount === 0) {
      ws.send(frame);
      pending = false;
      lastSent = now;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // ---- WebSocket (auto-reconnect) ----------------------------------------------

  function setStatus(online) {
    statusEl.textContent = online ? `Connected · ${host}` : `Offline · retrying ${host}…`;
    statusEl.classList.toggle('online', online);
  }

  function connect() {
    ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      setStatus(true);
      if (liveEl.checked) pending = true; // resync the OLED with the pad
    };
    ws.onclose = () => {
      setStatus(false);
      setTimeout(connect, 1000);
    };
    ws.onmessage = (e) => console.warn('[esp32]', e.data);
  }
  connect();
}
