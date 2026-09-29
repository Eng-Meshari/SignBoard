#pragma once

// ---- WiFi -------------------------------------------------------------------
// Put real credentials in config_secrets.h next to this file (it is gitignored):
//   #define WIFI_SSID "my-network"
//   #define WIFI_PASS "my-password"
#if __has_include("config_secrets.h")
  #include "config_secrets.h"
#else
  #warning "config_secrets.h not found - using placeholder WiFi credentials"
  #define WIFI_SSID "YOUR_WIFI_SSID"
  #define WIFI_PASS "YOUR_WIFI_PASSWORD"
#endif

#define HOSTNAME        "signboard"  // reachable at http://signboard.local
#define WIFI_TIMEOUT_MS 20000        // reboot and retry if not connected by then

// ---- Servers ----------------------------------------------------------------
#define HTTP_PORT 80  // serves the web app (web_assets.h)
#define WS_PORT   81  // must match WS_PORT in web/app.js

// ---- OLED (SSD1306 128x64, I2C) --------------------------------------------
#define OLED_SDA      21
#define OLED_SCL      22
#define OLED_I2C_ADDR 0x3C  // some modules are 0x3D (check the silkscreen)
#define OLED_FLIP     0     // 1 = rotate 180 degrees if mounted upside down
