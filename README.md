# SignBoard

Draw a signature or write text on an iPad, and watch it appear on a 128×64 SSD1306
OLED driven by an ESP32 in real time.

```text
 iPad Safari                                ESP32                         SSD1306
┌──────────────────┐  HTTP :80  (page)   ┌──────────────┐   I2C 400kHz   ┌─────────┐
│ <canvas 128x64>  │ ◄────────────────── │ WebServer    │                │ 128x64  │
│  touch / Pencil  │                     │              │                │  OLED   │
│  → 1-bit pack    │  WS :81 (1024 B)    │ WebSockets   │  memcpy +      │         │
│  → 1024 bytes    │ ──────────────────► │  Server      │ ─────────────► │         │
└──────────────────┘   binary frames     └──────────────┘  display()     └─────────┘
```

- The ESP32 joins your WiFi, announces itself as **`signboard.local`**, and serves the
  web app itself. You only need the iPad and the board.
- The canvas runs at the OLED's native 128×64 resolution and is scaled up with crisp
  pixels. Each frame is thresholded to 1 bit, so the iPad shows exactly what the OLED
  will.
- Frames are packed on the iPad in the SSD1306's native memory layout. The ESP32
  copies them straight into the display buffer without converting anything.

## Hardware

| Part | Notes |
|------|-------|
| ESP32 dev board | Any classic ESP32 (ESP32-WROOM-32 DevKit, NodeMCU-32S, …) |
| SSD1306 OLED 128×64, **I2C** (4-pin) | 0.96" or 1.3"*, address `0x3C` or `0x3D` |
| 4 jumper wires | See [docs/schematic.md](docs/schematic.md) |
| USB cable | Data-capable, for flashing |
| iPad (or any modern browser) | Same WiFi network as the ESP32 |

\* 1.3" modules often use the **SH1106** controller, which is not SSD1306-compatible.
Check the listing before you buy.

**Wiring:** `VCC→3V3`, `GND→GND`, `SCL→GPIO22`, `SDA→GPIO21`. Full details and common
issues are in [docs/schematic.md](docs/schematic.md).

## Project structure

```text
SignBoard/
├── firmware/SignBoard/       Arduino sketch (folder name must match the .ino)
│   ├── SignBoard.ino         WiFi, mDNS, HTTP + WebSocket servers, main loop
│   ├── config.h              WiFi, ports, OLED pins/address/flip
│   ├── display_driver.h/.cpp SSD1306 init, raw frame blit, status text
│   └── web_assets.h          GENERATED copy of web/ served by the ESP32
├── web/                      iPad web app (source of truth)
│   ├── index.html
│   ├── style.css
│   └── app.js                touch capture, 1-bit packing, WebSocket streaming
├── tools/
│   ├── embed_web.py          web/ → firmware/SignBoard/web_assets.h
│   └── test_bitmap.js        checks the bitmap packing
└── docs/schematic.md         wiring
```

## 1. Set up Arduino IDE

1. Install [Arduino IDE 2.x](https://www.arduino.cc/en/software).
2. **ESP32 board support:** open *Tools → Board → Boards Manager*, search **esp32**, and
   install **esp32 by Espressif Systems** (3.x). If it doesn't appear, add this URL under
   *File → Preferences → Additional boards manager URLs* first:
   ```
   https://espressif.github.io/arduino-esp32/package_esp32_index.json
   ```
3. **Libraries:** open *Tools → Manage Libraries…* and install:

   | Library | Author | Why |
   |---------|--------|-----|
   | **Adafruit SSD1306** | Adafruit | OLED driver. Choose *Install all* to add **Adafruit GFX** and **Adafruit BusIO** too |
   | **WebSockets** | Markus Sattler | WebSocket server (`WebSocketsServer.h`) |

   `WiFi`, `WebServer`, `ESPmDNS` and `Wire` come with the ESP32 core.

## 2. Configure

Create `firmware/SignBoard/config_secrets.h`. This file is gitignored, so your
credentials never get committed:

```cpp
#define WIFI_SSID "your-network"
#define WIFI_PASS "your-password"
```

The ESP32 only supports **2.4 GHz** WiFi. Other settings are in
[`config.h`](firmware/SignBoard/config.h):

| Setting | Default | Change it when |
|---------|---------|----------------|
| `OLED_SDA` / `OLED_SCL` | `21` / `22` | You wired different pins |
| `OLED_I2C_ADDR` | `0x3C` | Serial Monitor says *OLED not found* (try `0x3D`) |
| `OLED_FLIP` | `0` | The display is mounted upside down |
| `HOSTNAME` | `signboard` | You run more than one board on the network |
| `WS_PORT` | `81` | Also change `WS_PORT` in `web/app.js` to match |

## 3. Compile and upload

1. *File → Open…* → `firmware/SignBoard/SignBoard.ino`. The other files open as tabs.
2. *Tools → Board* → **ESP32 Dev Module** (or your specific board).
3. *Tools → Port* → the board's COM / `/dev/tty.*` port.
4. Click **Upload** (→). If upload stalls at `Connecting....`, hold the board's
   **BOOT** button until it starts writing.
5. Open *Tools → Serial Monitor* at **115200 baud**. You should see:
   ```
   Connecting to your-network.....
   Connected, IP 192.168.1.42
   Open http://signboard.local or http://192.168.1.42 on the iPad
   ```
   The OLED shows the same hostname and IP.

## 4. Use it on the iPad

1. Connect the iPad to the **same WiFi network**.
2. In Safari, open **`http://signboard.local`**, or the IP address shown on the OLED.
3. Draw with your finger or an Apple Pencil.

| Control | Behaviour |
|---------|-----------|
| **Live** (on) | Sends updates while you draw (throttled to about 25 fps), and always sends the final frame of each stroke |
| **Live** (off) | Nothing is sent until you press **Send**. Use this to compose a signature first |
| **Clear** | Blanks the pad. With Live on, the OLED is blanked too |
| **Send** | Pushes the current pad to the OLED immediately |
| Status dot | Green = connected. Red = reconnecting (retries every second) |

**Tip:** tap *Share → Add to Home Screen* to run it full screen without the Safari
toolbar.

## Developing the web app

`web/` is the source. The ESP32 serves an embedded copy of it from
`firmware/SignBoard/web_assets.h`, because Arduino IDE builds a copy of the sketch folder
and can't read files outside it.

**Fast iteration (no reflashing):** serve `web/` from your computer and point it at the
board:

```bash
cd web
python -m http.server 8000
# on the iPad: http://<your-computer-ip>:8000/?host=signboard.local
#          or: http://<your-computer-ip>:8000/?host=192.168.1.42
```

**Ship the changes to the ESP32:**

```bash
python tools/embed_web.py     # regenerates firmware/SignBoard/web_assets.h
```

Then upload the sketch again.

**Check the bitmap packing** (run it after touching `toBitmap` in `app.js`):

```bash
node tools/test_bitmap.js     # prints "ok"
```

## Frame format

Each WebSocket **binary** message is exactly **1024 bytes**: one full 128×64 frame in the
SSD1306's native page layout.

```text
byte index = (y / 8) * 128 + x        page 0 = rows 0-7, page 1 = rows 8-15, …
bit        = y % 8                    bit 0 (LSB) = top row of the page, 1 = pixel on
```

The firmware rejects messages of any other length and replies with a text error. You can
push frames from any client, for example Python:

```python
import websocket                    # pip install websocket-client
frame = bytearray(1024)
frame[0] = 0xFF                     # 8-pixel vertical line at top-left
ws = websocket.create_connection("ws://signboard.local:81/")
ws.send_binary(bytes(frame))
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| OLED stays black, Serial says *OLED not found* | Check wiring (VCC/GND order varies), try `OLED_I2C_ADDR 0x3D` |
| OLED shows noise / shifted image | Probably an SH1106 (1.3") module. It needs a different driver |
| Stuck on *Connecting to WiFi*, reboots every 20 s | Wrong SSID/password, or a 5 GHz-only network |
| `signboard.local` doesn't load | Use the IP shown on the OLED. On Windows, mDNS needs Bonjour, and some routers block it |
| Page loads but status stays red | Something is blocking port 81 (guest WiFi / client isolation), or `WS_PORT` differs between `config.h` and `app.js` |
| Image is upside down | `OLED_FLIP 1` |
| Web changes don't show up | Run `python tools/embed_web.py`, re-upload, and hard-refresh Safari |

## Security

This is meant for a trusted local network. The web page and WebSocket are plain HTTP
with no authentication, so anyone on the same WiFi can draw on the display. Frames are
length-checked before they're used. Keep the board off public or guest networks.

## License

[MIT](LICENSE)
