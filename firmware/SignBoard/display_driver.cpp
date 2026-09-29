#include "display_driver.h"
#include "config.h"

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <string.h>

static Adafruit_SSD1306 oled(DISPLAY_WIDTH, DISPLAY_HEIGHT, &Wire, -1);

bool displayBegin() {
  Wire.begin(OLED_SDA, OLED_SCL);

  Wire.beginTransmission(OLED_I2C_ADDR);
  if (Wire.endTransmission() != 0) return false;

  // periphBegin=false: keep our SDA/SCL pins instead of letting the lib re-init Wire.
  if (!oled.begin(SSD1306_SWITCHCAPVCC, OLED_I2C_ADDR, true, false)) return false;

  // Hardware 180-degree flip. Done in the controller, not in GFX, because
  // displayFrame() writes the raw buffer and bypasses GFX rotation.
  if (OLED_FLIP) {
    oled.ssd1306_command(SSD1306_SEGREMAP);   // 0xA0: column 0 -> SEG0
    oled.ssd1306_command(SSD1306_COMSCANINC); // 0xC0: scan COM0 -> COM63
  }

  oled.clearDisplay();
  oled.display();
  return true;
}

void displayFrame(const uint8_t *frame) {
  // Adafruit's buffer uses the SSD1306 page layout, so the frame drops straight in.
  memcpy(oled.getBuffer(), frame, FRAME_SIZE);
  oled.display();
}

void displayText(const char *line1, const char *line2) {
  oled.clearDisplay();
  oled.setTextColor(SSD1306_WHITE);
  oled.setTextSize(1);
  oled.setCursor(0, 0);
  oled.println(line1);
  if (line2) {
    oled.setCursor(0, 16);
    oled.println(line2);
  }
  oled.display();
}
