# Wiring: ESP32 → SSD1306 OLED (128×64, I2C)

Four wires. No extra components are needed for the common 4-pin OLED modules,
which already carry I2C pull-up resistors.

## Pin map

| SSD1306 pin | ESP32 pin      | Notes                                   |
|-------------|----------------|-----------------------------------------|
| `GND`       | `GND`          |                                         |
| `VCC`       | `3V3`          | Use 3.3 V so the I2C lines stay 3.3 V   |
| `SCL` / `SCK` | `GPIO 22`    | I2C clock — `OLED_SCL` in `config.h`    |
| `SDA`       | `GPIO 21`      | I2C data — `OLED_SDA` in `config.h`     |

```text
        ESP32 DevKit                      SSD1306 OLED 128x64
      ┌──────────────┐                  ┌────────────────────┐
      │          3V3 ├──────────────────┤ VCC                │
      │          GND ├──────────────────┤ GND                │
      │      GPIO 22 ├──────────────────┤ SCL                │
      │      GPIO 21 ├──────────────────┤ SDA                │
      └──────────────┘                  └────────────────────┘
```

## Check before powering up

- **Pin order differs between modules.** Some are `GND VCC SCL SDA`, others
  `VCC GND SCL SDA`. Wire by the silkscreen labels, not by position — swapping
  VCC and GND can kill the display.
- **I2C address.** Most modules are `0x3C`; some are `0x3D` (often selectable with
  a resistor on the back, labelled as `0x78` / `0x7A` in 8-bit form). If the
  Serial Monitor prints `OLED not found at 0x3C`, set `OLED_I2C_ADDR` to `0x3D`
  in `config.h`.
- **Upside-down mounting.** Set `OLED_FLIP 1` in `config.h` to rotate 180° in
  the display controller.
- **SPI modules** (7 pins: `D0 D1 RES DC CS`) are not supported by this wiring;
  buy the 4-pin I2C variant.

## Bus details

| Parameter        | Value                                           |
|------------------|-------------------------------------------------|
| Bus              | I2C, ESP32 hardware controller `Wire`           |
| Clock            | 400 kHz during transfers (set by Adafruit_SSD1306) |
| Frame size       | 1024 bytes → ≈ 25 ms per full-screen update     |
| Pull-ups         | On the OLED module (typically 4.7 kΩ–10 kΩ)     |

If you use a bare panel or long wires (> 30 cm) and see garbage or I2C errors,
add 4.7 kΩ pull-ups from SDA and SCL to 3V3.
