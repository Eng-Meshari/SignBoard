#pragma once
#include <stddef.h>
#include <stdint.h>

constexpr int    DISPLAY_WIDTH  = 128;
constexpr int    DISPLAY_HEIGHT = 64;
constexpr size_t FRAME_SIZE     = DISPLAY_WIDTH * DISPLAY_HEIGHT / 8;  // 1024 bytes

// Initialise I2C + SSD1306. Returns false if nothing answers at OLED_I2C_ADDR.
bool displayBegin();

// Show a full frame in native SSD1306 page format: 8 pages x 128 columns,
// byte index = (y / 8) * 128 + x, bit = y % 8 (LSB = top pixel of the page).
void displayFrame(const uint8_t *frame);

// Show one or two lines of status text.
void displayText(const char *line1, const char *line2 = nullptr);
