// Checks the canvas -> SSD1306 page-format packing in web/app.js.
// Run: node tools/test_bitmap.js
const assert = require('assert');
const { toBitmap, W, H } = require('../web/app.js');

const px = new Uint8ClampedArray(W * H * 4);
const set = (x, y, v = 255) => { px[(y * W + x) * 4] = v; };
set(0, 0);
set(0, 7);
set(0, 8);
set(5, 10);
set(127, 63);
set(1, 0, 127); // just below threshold -> off

const bits = toBitmap(px);

assert.strictEqual(bits.length, 1024);
assert.strictEqual(bits[0], 0b10000001);   // (0,0) -> bit 0, (0,7) -> bit 7 of page 0
assert.strictEqual(bits[128], 1 << 0);     // (0,8) -> first byte of page 1
assert.strictEqual(bits[128 + 5], 1 << 2); // (5,10) -> page 1, column 5, bit 2
assert.strictEqual(bits[1023], 1 << 7);    // (127,63) -> last byte, bottom bit
assert.strictEqual(bits[1], 0);            // (1,0) was 127 -> off
let count = 0;
for (const b of bits) for (let v = b; v; v >>= 1) count += v & 1;
assert.strictEqual(count, 5);              // nothing else lit
assert.strictEqual(px[4], 0);              // canvas thresholded in place (127 -> 0)
assert.strictEqual(px[2], 255);            // (0,0) forced to pure white

console.log('ok');
