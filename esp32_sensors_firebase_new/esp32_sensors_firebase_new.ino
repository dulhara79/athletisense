/*
 * ============================================================
 * PROJECT: Performance Monitoring Chest Strap
 * ============================================================
 *
 * WHAT THIS PROJECT DOES:
 * This is firmware for a wearable chest strap that monitors an
 * athlete's health and performance in real time. It collects data
 * from 4 sensors, displays live readings on a tiny screen, and
 * uploads everything to the cloud o(Firebase) nce per minute.
 *
 * SENSORS USED:
 * ┌─────────────┬──────────────────────────────────────────────┐
 * │ AD8232      │ ECG / Heart Rate sensor. Reads the tiny       │
 * │             │ electrical signals from your heart through    │
 * │             │ sticky electrode pads on your skin. It        │
 * │             │ produces a wave (ECG waveform) and we detect  │
 * │             │ each heartbeat peak to calculate BPM.         │
 * ├─────────────┼──────────────────────────────────────────────┤
 * │ BMI160      │ Motion sensor (IMU). Measures acceleration    │
 * │             │ (how fast you're moving in 3D space) and      │
 * │             │ rotation speed. Also counts your steps using  │
 * │             │ its built-in step detection algorithm.        │
 * ├─────────────┼──────────────────────────────────────────────┤
 * │ DS18B20     │ Skin temperature sensor. A tiny waterproof    │
 * │             │ digital thermometer that reads your body      │
 * │             │ surface temperature to 0.1°C accuracy.        │
 * ├─────────────┼──────────────────────────────────────────────┤
 * │ BF350       │ Strain gauge / Respiration sensor. A thin     │
 * │(Strain Gauge)│ resistive strip that changes resistance when │
 * │             │ stretched. Strapped to the chest, it flexes   │
 * │             │ with every breath, letting us measure your    │
 * │             │ breathing rate.                               │
 * └─────────────┴──────────────────────────────────────────────┘
 *
 * DISPLAY:
 * SSD1306  — A tiny 0.96 inch OLED screen (128×64 pixels) that
 *            cycles through 4 pages: heart rate, breathing rate,
 *            motion/steps, and temperature/system info.
 *
 * MICROCONTROLLER:
 * ESP32-C3 Mini-1 — A small, low-power WiFi-capable chip that
 *                   runs all this code and connects to the cloud.
 *
 * WIRING (GPIO pin numbers):
 *   AD8232 analog out  → GPIO 4
 *   AD8232 leads-off+  → GPIO 5
 *   AD8232 leads-off-  → GPIO 6
 *   Strain gauge       → GPIO 3
 *   DS18B20 data       → GPIO 2
 *   BMI160 + OLED SDA  → GPIO 8
 *   BMI160 + OLED SCL  → GPIO 9
 *
 * Version: 2.7.0
 * ============================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <Wire.h>
#include <time.h>
#include <BMI160Gen.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <FirebaseESP32.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <esp_task_wdt.h>


// ============================================================
//  CONFIGURATION
//  All settings are grouped here so you only need to edit
//  this one place to change WiFi, Firebase, pins, or timings.
// ============================================================
namespace Config {

  // ---------- WiFi credentials ----------
  constexpr char SSID[]         = "SLT FIBER";
  constexpr char PASSWORD[]     = "20hOmewIFi25";

  // ---------- Firebase (cloud database) ----------
  // These values come from your Firebase project settings.
  constexpr char FB_API_KEY[]   = "AIzaSyDJGddPuRmkgzEoia00gJVYqvil3D_c9ek";
  constexpr char FB_DB_URL[]    = "https://performance-monitering-glove-default-rtdb.firebaseio.com";
  constexpr char FB_EMAIL[]     = "esp32@glove.com";
  constexpr char FB_PASSWORD[]  = "SuperSecret123!";

  // Unique ID for the athlete wearing this strap.
  // Change this if you have multiple athletes / devices.
  constexpr char ATHLETE_ID[]   = "ATH_001";

  // ---------- How often things happen (milliseconds) ----------
  constexpr uint32_t UPLOAD_INTERVAL    = 60000UL;  // Upload to Firebase every 60 seconds
  constexpr uint32_t OLED_INTERVAL      = 200UL;    // Refresh the screen every 200ms (5 fps)
  constexpr uint32_t SERIAL_INTERVAL    = 500UL;    // Print debug info to USB every 500ms
  constexpr uint32_t SENSOR_INTERVAL    = 100UL;    // Read IMU, temp, strain every 100ms
  constexpr uint32_t OLED_PAGE_DURATION = 4000UL;   // Stay on each OLED page for 4 seconds

  // ---------- Time zone (NTP clock sync) ----------
  // Sri Lanka is UTC+5:30. Change GMT_OFFSET_SEC for your timezone.
  // Example: UTC+0 = 0, UTC+1 = 3600, UTC-5 = -18000
  constexpr long GMT_OFFSET_SEC  = 19800L;
  constexpr int  DST_OFFSET_SEC  = 0;              // Sri Lanka has no daylight saving
  constexpr char NTP_SERVER[]    = "pool.ntp.org"; // Public internet time server

  // ---------- Watchdog timer ----------
  // If the code hangs or freezes for longer than this, the chip
  // automatically reboots itself. This keeps the device running
  // even if there is an unexpected software crash.
  constexpr uint32_t WDT_TIMEOUT_SEC = 30;

  // ---------- GPIO pin assignments ----------
  constexpr uint8_t SDA_PIN     = 8;  // I2C data line (shared by BMI160 and OLED)
  constexpr uint8_t SCL_PIN     = 9;  // I2C clock line (shared by BMI160 and OLED)
  constexpr uint8_t DS18B20_PIN = 2;  // Temperature sensor data pin (OneWire protocol)
  constexpr uint8_t STRAIN_PIN  = 3;  // Strain gauge analog output (breathing)
  constexpr uint8_t ECG_PIN     = 4;  // AD8232 ECG analog output (heart signal)
  constexpr uint8_t LO_PLUS     = 5;  // AD8232 "leads off" detection, positive electrode
  constexpr uint8_t LO_MINUS    = 6;  // AD8232 "leads off" detection, negative electrode

  // ---------- I2C device addresses ----------
  // Every I2C device has a unique address on the same bus.
  constexpr uint8_t BMI160_ADDR = 0x69; // BMI160 motion sensor address
  constexpr uint8_t OLED_ADDR   = 0x3C; // SSD1306 display address

  // ---------- ADC (Analog to Digital Converter) settings ----------
  // The ESP32-C3 ADC converts 0–3.3V into a number from 0 to 4095.
  // ADC_REF_V = the reference voltage (3.3V on this board).
  // ADC_MAX   = the maximum raw reading (12-bit = 2^12 - 1 = 4095).
  constexpr float ADC_REF_V = 3.3f;
  constexpr float ADC_MAX   = 4095.0f;

  // ---------- Heart rate / ECG settings ----------

  // How often to take an ECG reading. 10ms = 100 samples per second.
  // A faster rate captures the heartbeat waveform more clearly.
  constexpr uint32_t ECG_SAMPLE_INTERVAL = 10;

  // How many recent heartbeat intervals to average when calculating BPM.
  // More samples = smoother BPM readout but slower to react to changes.
  constexpr uint8_t BPM_RATE_SIZE = 10;

  // Ignore any calculated BPM outside this range — they are errors.
  constexpr float BPM_MIN = 30.0f;   // Below 30 BPM is not a real heartbeat
  constexpr float BPM_MAX = 220.0f;  // Above 220 BPM is not a real heartbeat

  // How many ECG samples to average together to smooth out noise.
  // Higher = smoother signal but slight lag. 8 is a good balance.
  constexpr uint8_t ECG_FILTER_SIZE = 8;

  // The heartbeat (R-peak) detection threshold.
  // Set as a fraction of the signal range: 0.60 = 60% of the way
  // from the signal minimum to maximum must be exceeded to count as a beat.
  // Lower value = more sensitive (catches weak beats but may false-trigger).
  constexpr float ECG_THRESH_RATIO = 0.60f;

  // Hysteresis prevents a single beat from being counted twice.
  // After a peak is detected, the signal must drop below
  // (threshold - hysteresis) before the next peak can be detected.
  // This stops the T-wave (a smaller bump after the R-peak) from
  // being mistaken for a second heartbeat.
  constexpr float ECG_HYST_RATIO = 0.15f;

  // How quickly the adaptive threshold follows changes in signal amplitude.
  // Each sample, the tracked min/max creep toward the signal by this amount.
  // 1 ADC count per sample is slow and stable for a relatively steady ECG.
  constexpr int ECG_ADAPT_DECAY = 1;

  // After the electrode pads are first attached, wait this long before
  // reporting BPM. This gives the adaptive threshold time to learn the
  // real signal range. During this window "Calibrating..." is shown.
  constexpr uint32_t ECG_SETTLE_MS = 3000; // 3 seconds

  // ---------- Respiration / breathing settings ----------
  constexpr uint8_t  RESP_FILTER_SIZE  = 5;    // Low-pass filter window for strain signal
  constexpr uint8_t  RESP_DC_SIZE      = 30;   // DC removal window (removes body posture offset)
  constexpr uint8_t  RESP_RATE_SIZE    = 6;    // Number of recent breath intervals to average
  constexpr float    RESP_MIN          = 4.0f; // Ignore breathing rates below 4 br/min
  constexpr float    RESP_MAX          = 40.0f;// Ignore breathing rates above 40 br/min
  constexpr uint32_t RESP_MIN_INTERVAL = 1500UL; // Minimum time between detected breaths (ms).
                                                  // Prevents motion noise from counting as breaths.

  // ---------- OLED display dimensions ----------
  constexpr uint8_t SCREEN_W   = 128; // Pixels wide
  constexpr uint8_t SCREEN_H   = 64;  // Pixels tall
  constexpr uint8_t OLED_PAGES = 4;   // Number of display pages (heart rate, resp, motion, system)
}


// ============================================================
//  DATA STRUCTURES
//  These are like named boxes that hold all the current
//  readings and state for each sensor.
// ============================================================

// Holds all heart rate and ECG data
struct HeartRateData {
  float bpm            = 0.0f;  // Most recent single-beat BPM estimate
  int   bpmAvg         = 0;     // Smoothed average BPM across last 10 beats
  int   ecgValue       = 0;     // Raw ADC reading from the ECG pin (0–4095)
  int   ecgSmoothed    = 0;     // ECG value after moving-average noise filter
  bool  leadsConnected = false; // true = electrode pads are on skin

  float rates[Config::BPM_RATE_SIZE] = {0.0f}; // Ring buffer storing last N beat intervals
  byte  rateSpot       = 0;     // Current write position in the ring buffer
  long  lastBeat       = 0;     // millis() timestamp of the previous R-peak
  byte  validBeats     = 0;     // How many valid beats are stored (counts up to BPM_RATE_SIZE)

  int   adaptThresh    = 2048;  // Current adaptive detection threshold (ADC counts).
                                 // Starts at mid-rail (2048 out of 4095) and adjusts
                                 // automatically to the actual signal range.

  unsigned long leadsConnectedAt = 0; // millis() when leads were last attached.
                                       // Used to enforce the settle/calibration period.
};

// Holds accelerometer, gyroscope, and step count from the BMI160
struct ImuData {
  int ax = 0, ay = 0, az = 0; // Accelerometer raw values (X, Y, Z axes)
  int gx = 0, gy = 0, gz = 0; // Gyroscope raw values (X, Y, Z axes)
  uint32_t stepCount    = 0;   // Total steps counted since power-on
  bool     stepDetected = false; // true for one sensor cycle when a new step occurs
};

// Holds the skin temperature reading
struct TemperatureData {
  float celsius    = 0.0f; // Temperature in °C
  float fahrenheit = 0.0f; // Temperature in °F
  bool  valid      = false; // false if the sensor is not responding or reading is out of range
};

// Holds breathing rate data derived from the strain gauge signal
struct RespirationData {
  float filteredRaw  = 0.0f; // Strain ADC reading after low-pass filter (smoothed)
  float acComponent  = 0.0f; // The breathing "AC" signal — DC body posture offset removed
  float rateInstant  = 0.0f; // Most recent single-breath rate in breaths/min
  int   rateAvg      = 0;    // Smoothed average breathing rate

  float rates[Config::RESP_RATE_SIZE] = {0.0f}; // Ring buffer of recent breath intervals
  byte  rateSpot      = 0;   // Current write position in ring buffer
  byte  validBreaths  = 0;   // How many valid breaths are stored
  long  lastBreath    = 0;   // millis() timestamp of previous breath detection

  bool breathDetected = false; // true for one cycle when a new breath is detected
};

// Holds the raw strain gauge ADC reading and its voltage equivalent
struct StrainData {
  int   raw     = 0;    // Raw ADC value (0–4095)
  float voltage = 0.0f; // Converted to volts (0.0–3.3V) for display
};

// Tracks which hardware was successfully initialized at startup.
// If a sensor fails to start, its flag stays false and its
// update functions are safely skipped in the main loop.
struct SensorHealth {
  bool ad8232   = false; // ECG sensor initialized OK
  bool bmi160   = false; // Motion sensor initialized OK
  bool ds18b20  = false; // Temperature sensor initialized OK
  bool firebase = false; // Firebase connection established
  bool wifi     = false; // WiFi connected
};


// ============================================================
//  GLOBAL VARIABLES
//  One instance of each data structure, plus hardware objects.
// ============================================================
HeartRateData    hrData;     // Current heart rate readings
ImuData          imuData;    // Current motion readings
TemperatureData  tempData;   // Current temperature reading
RespirationData  respData;   // Current breathing rate readings
StrainData       strainData; // Current strain gauge reading
SensorHealth     health;     // Which sensors are working

// Hardware driver objects
OneWire           oneWire(Config::DS18B20_PIN);   // OneWire bus for the temperature sensor
DallasTemperature tempSensor(&oneWire);            // DS18B20 temperature sensor driver
Adafruit_SSD1306  display(Config::SCREEN_W, Config::SCREEN_H, &Wire, -1); // OLED display driver
FirebaseData      fbdo;    // Firebase handle for writing /latest data
FirebaseData      fbdo2;   // Second Firebase handle for archiving previous /latest data
FirebaseAuth      auth;    // Firebase authentication credentials
FirebaseConfig    fbConfig;// Firebase configuration (API key, DB URL)

// Timestamps (millis) used to control how often each task runs.
// Each is compared to millis() in the main loop to decide "is it time yet?"
unsigned long lastUpload     = 0;
unsigned long lastOLED       = 0;
unsigned long lastSerial     = 0;
unsigned long lastSensor     = 0;
unsigned long lastEcgRead    = 0;
unsigned long lastPageSwitch = 0;

// Which of the 4 OLED display pages is currently shown (0–3)
uint8_t currentOledPage = 0;


// ============================================================
//  UTILITY FUNCTIONS
//  Small helper functions used throughout the code.
// ============================================================

// Fills 'buf' with the current date and time as "DD/MM/YYYY HH:MM:SS".
// Returns true on success, false if the NTP clock has not synced yet.
bool getFormattedTime(char* buf, size_t len) {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo, 500)) return false;
  strftime(buf, len, "%d/%m/%Y %H:%M:%S", &timeinfo);
  return true;
}

// Fills 'buf' with a timestamp safe to use in Firebase paths: "YYYYMMDD_HHMMSS".
// Firebase paths cannot contain spaces or slashes, so this format avoids them.
bool getSafeTimestamp(char* buf, size_t len) {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo, 500)) return false;
  strftime(buf, len, "%Y%m%d_%H%M%S", &timeinfo);
  return true;
}

// Returns the current time as a short "HH:MM:SS" string for the OLED header.
// Returns "--:--" if the clock has not synced yet.
String getShortTime() {
  struct tm timeinfo;
  char buf[10];
  if (!getLocalTime(&timeinfo, 200)) return "--:--";
  strftime(buf, sizeof(buf), "%H:%M:%S", &timeinfo);
  return String(buf);
}


// ============================================================
//  WiFi
// ============================================================

// Attempts to connect to WiFi. Retries up to 30 times (15 seconds).
// Updates health.wifi so the rest of the code knows if it worked.
void connectWiFi() {
  Serial.printf("[WiFi] Connecting to: %s\n", Config::SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(Config::SSID, Config::PASSWORD);

  uint8_t retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 30) {
    delay(500);
    Serial.print(".");
    retries++;
    esp_task_wdt_reset(); // Pet the watchdog so it doesn't reboot us while we wait
  }

  health.wifi = (WiFi.status() == WL_CONNECTED);
  if (health.wifi) {
    Serial.printf("\n[WiFi] Connected. IP: %s  RSSI: %d dBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println("\n[WiFi] FAILED — offline mode.");
  }
}

// Called before any network operation.
// Reconnects if the connection dropped (e.g. router rebooted).
void ensureWiFi() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
}


// ============================================================
//  FIREBASE (Cloud Database)
// ============================================================

// Sets up the Firebase client with credentials and starts the
// background token-generation process (email/password auth).
void initFirebase() {
  if (!health.wifi) {
    Serial.println("[Firebase] Skipped — no WiFi.");
    return;
  }

  fbConfig.api_key               = Config::FB_API_KEY;
  fbConfig.database_url          = Config::FB_DB_URL;
  auth.user.email                = Config::FB_EMAIL;
  auth.user.password             = Config::FB_PASSWORD;
  fbConfig.token_status_callback = tokenStatusCallback; // Prints token status to Serial

  Firebase.begin(&fbConfig, &auth);
  Firebase.reconnectWiFi(true); // Auto-reconnect if WiFi drops

  fbdo.setResponseSize(4096);  // Reserve buffer for database responses
  fbdo2.setResponseSize(4096);

  health.firebase = true;
  Serial.println("[Firebase] Init started (token generating)...");
}

// Builds the JSON object that will be sent to Firebase.
// All current sensor readings are packed into one JSON tree.
void buildSensorJson(FirebaseJson& json, const char* timestamp) {
  json.set("athlete_id",  Config::ATHLETE_ID);
  json.set("timestamp",   timestamp);
  json.set("fw_version",  "2.7.0");

  // Heart rate
  json.set("heart_rate/bpm",             hrData.bpm);
  json.set("heart_rate/bpm_avg",         hrData.bpmAvg);
  json.set("heart_rate/ecg_value",       hrData.ecgSmoothed);
  json.set("heart_rate/leads_connected", hrData.leadsConnected);

  // Breathing / respiration
  json.set("respiration/rate_instant",  respData.rateInstant);
  json.set("respiration/rate_avg",      respData.rateAvg);
  json.set("respiration/valid_breaths", (int)respData.validBreaths);
  json.set("respiration/strain_raw",    strainData.raw);
  json.set("respiration/strain_v",      strainData.voltage);

  // Motion (accelerometer + gyroscope + steps)
  json.set("motion/accel_x",   imuData.ax);
  json.set("motion/accel_y",   imuData.ay);
  json.set("motion/accel_z",   imuData.az);
  json.set("motion/gyro_x",    imuData.gx);
  json.set("motion/gyro_y",    imuData.gy);
  json.set("motion/gyro_z",    imuData.gz);
  json.set("motion/step_count",(int)imuData.stepCount);

  // Temperature
  json.set("temperature/celsius",    tempData.celsius);
  json.set("temperature/fahrenheit", tempData.fahrenheit);
  json.set("temperature/valid",      tempData.valid);

  // System diagnostics
  json.set("system/wifi_rssi",  (int)WiFi.RSSI());         // Signal strength in dBm
  json.set("system/heap_free",  (int)ESP.getFreeHeap());   // Free RAM in bytes
}

// Called once per minute (UPLOAD_INTERVAL).
// Strategy:
//   1. Download whatever is currently in /latest
//   2. Archive it under /readings/<timestamp>  (so history is preserved)
//   3. Write the brand-new readings to /latest
void uploadToFirebase() {
  ensureWiFi();
  if (!Firebase.ready()) {
    Serial.println("[Firebase] Upload skipped — token not ready.");
    return;
  }

  // Get current time for the timestamp fields
  char ts[32];
  if (!getFormattedTime(ts, sizeof(ts))) strcpy(ts, "unknown");

  char safets[20];
  if (!getSafeTimestamp(safets, sizeof(safets))) strcpy(safets, "unknown");

  // Build the Firebase paths
  String basePath     = "/athlete_records/" + String(Config::ATHLETE_ID);
  String latestPath   = basePath + "/latest";
  String readingsPath = basePath + "/readings";

  // Step 1 & 2: Move the old /latest entry to the /readings archive
  if (Firebase.getJSON(fbdo2, latestPath.c_str())) {
    FirebaseJson& existingJson = fbdo2.jsonObject();

    // Extract the timestamp from the old record to use as its archive key
    FirebaseJsonData tsData;
    existingJson.get(tsData, "timestamp");
    String existingTs = tsData.success ? tsData.stringValue : String(safets) + "_prev";

    // Clean up the timestamp so it can be used as a Firebase path key
    // (Firebase paths cannot contain spaces, slashes, or colons)
    existingTs.replace(" ", "_");
    existingTs.replace("/", "");
    existingTs.replace(":", "");

    // Write the old data under /readings/<old timestamp>
    String archivePath = readingsPath + "/" + existingTs;
    if (Firebase.setJSON(fbdo2, archivePath.c_str(), existingJson)) {
      Serial.printf("[Firebase] Promoted previous /latest → %s\n", archivePath.c_str());
    } else {
      Serial.printf("[Firebase] Promote FAILED: %s\n", fbdo2.errorReason().c_str());
    }
  }
  esp_task_wdt_reset(); // Pet the watchdog after the potentially slow archive step

  // Step 3: Write the fresh sensor readings to /latest
  FirebaseJson freshJson;
  buildSensorJson(freshJson, ts);

  if (Firebase.setJSON(fbdo, latestPath.c_str(), freshJson)) {
    Serial.printf("[Firebase] /latest updated OK  [%s]\n", ts);
  } else {
    Serial.printf("[Firebase] /latest FAILED: %s\n", fbdo.errorReason().c_str());
  }

  esp_task_wdt_reset();
  health.firebase = Firebase.ready();
}


// ============================================================
//  SENSOR: AD8232 ECG (Heart Rate)
// ============================================================

// One-time setup for the AD8232 ECG sensor.
// Configures the GPIO pins and the ADC for correct operation.
void initAD8232() {
  Serial.print("[AD8232] Initializing... ");

  // The AD8232 has two "leads-off" pins: LO+ and LO-.
  // They go HIGH when an electrode is not touching the skin.
  // We use INPUT_PULLDOWN so they are LOW (not floating) when
  // the leads ARE connected — a known stable low level.
  // Without this, the pins randomly float and look "disconnected"
  // even when the electrodes are properly on the skin.
  pinMode(Config::LO_PLUS,  INPUT_PULLDOWN);
  pinMode(Config::LO_MINUS, INPUT_PULLDOWN);

  // ECG_PIN is analog input — no pull resistor needed
  pinMode(Config::ECG_PIN, INPUT);

  // The AD8232 outputs a voltage across the full 0–3.3V range.
  // We must tell the ADC to expect that full range (ADC_11db attenuation).
  // Without this, the ADC only covers 0–1V and the ECG waveform
  // gets clipped, making heart rate detection impossible.
  // We set this per-pin (not globally) using the correct ESP32-C3 API.
  analogSetPinAttenuation(Config::ECG_PIN,    ADC_11db); // Full 0–3.3V range for ECG
  analogSetPinAttenuation(Config::STRAIN_PIN, ADC_11db); // Full 0–3.3V range for strain gauge too

  // The very first ADC reading after boot or after changing attenuation
  // settings can be wrong on the ESP32-C3. We do two throwaway reads
  // to let the ADC hardware settle, then the real readings will be accurate.
  (void)analogRead(Config::ECG_PIN); // Discard — might be stale
  delay(10);
  (void)analogRead(Config::ECG_PIN); // Discard — letting ADC warm up

  health.ad8232 = true;
  Serial.println("OK (LO pins=PULLDOWN, ECG attenuation=11dB)");
}

// Called every 10ms (100 Hz) from the main loop.
// Reads the ECG signal, filters it, detects R-peaks (heartbeats),
// and calculates BPM. All logic is explained step-by-step below.
void updateHeartRate() {
  if (!health.ad8232) return; // Skip if sensor failed to initialize

  // Ring buffer stores the last 8 raw ECG samples for averaging (noise filter)
  static int    history[Config::ECG_FILTER_SIZE] = {0};
  static uint8_t histIdx = 0;  // Current write position in the ring buffer

  // Adaptive signal range tracking: sigMax and sigMin follow the
  // ECG waveform's peak and floor. They start at realistic values
  // for the AD8232 output on a 3.3V ESP32-C3 ADC mid-rail (~2048).
  static int sigMax = 2400;
  static int sigMin = 1800;

  // State variable: are we currently above the detection threshold?
  // Used to detect the rising edge (start of an R-peak) only once.
  static bool aboveThreshold = false;

  // Remembers whether leads were connected last sample.
  // Used to detect the moment leads are freshly attached.
  static bool wasConnected = false;

  unsigned long now = millis();

  // Only sample at the configured rate (every ECG_SAMPLE_INTERVAL ms)
  if (now - lastEcgRead < Config::ECG_SAMPLE_INTERVAL) return;
  lastEcgRead = now;

  // ── Step 1: Check if electrode pads are touching the skin ──────
  // LO+ and LO- are HIGH when an electrode is OFF the body.
  // If either is HIGH, the leads are not properly connected.
  bool loPlus    = (digitalRead(Config::LO_PLUS)  == HIGH);
  bool loMinus   = (digitalRead(Config::LO_MINUS) == HIGH);
  bool connected = !(loPlus || loMinus); // Both must be LOW for good contact

  // If leads were just newly attached, record the time.
  // BPM detection will be suppressed for ECG_SETTLE_MS after this.
  if (connected && !wasConnected) {
    hrData.leadsConnectedAt = now;
    Serial.println("[AD8232] Leads connected — settling...");
  }
  wasConnected          = connected;
  hrData.leadsConnected = connected;

  // If leads are off, clear all readings and wait for reconnection
  if (!connected) {
    hrData.ecgValue    = 0;
    hrData.ecgSmoothed = 0;
    hrData.bpm         = 0.0f;
    hrData.bpmAvg      = 0;
    hrData.validBeats  = 0;
    hrData.rateSpot    = 0;
    hrData.lastBeat    = 0;
    for (byte i = 0; i < Config::BPM_RATE_SIZE; i++) hrData.rates[i] = 0.0f;

    aboveThreshold = false;

    // Reset adaptive range to mid-rail values, ready for next connection
    sigMax = 2348;
    sigMin = 1748;
    for (uint8_t i = 0; i < Config::ECG_FILTER_SIZE; i++) history[i] = 0;
    histIdx = 0;
    return;
  }

  // ── Step 2: Read the raw ECG signal from the AD8232 ───────────
  // Returns a number 0–4095 representing the voltage on the pin.
  hrData.ecgValue = analogRead(Config::ECG_PIN);

  // ── Step 3: Moving-average filter (noise reduction) ────────────
  // We store the last 8 samples and use their average instead of
  // the raw value. This smooths out high-frequency electrical noise
  // and motion artefacts without significantly blurring the heartbeat.
  history[histIdx] = hrData.ecgValue;
  histIdx          = (histIdx + 1) % Config::ECG_FILTER_SIZE;

  int sum = 0;
  for (uint8_t i = 0; i < Config::ECG_FILTER_SIZE; i++) sum += history[i];
  hrData.ecgSmoothed = sum / Config::ECG_FILTER_SIZE;

  // ── Step 4: Adaptive threshold tracking ────────────────────────
  // The ECG signal amplitude varies between people and over time.
  // Instead of a fixed threshold, we track the signal's peak (sigMax)
  // and floor (sigMin) and set the detection threshold as a fraction
  // of that range. This makes beat detection work for any signal strength.
  //
  // Each sample, we nudge sigMax down and sigMin up by ECG_ADAPT_DECAY.
  // This causes them to slowly converge on the actual signal range.
  // When a new peak or valley is seen, sigMax/sigMin jump to match it.
  sigMax -= Config::ECG_ADAPT_DECAY; // Slowly lower the tracked peak
  sigMin += Config::ECG_ADAPT_DECAY; // Slowly raise the tracked floor

  // Ensure there is always at least 100 ADC counts of range.
  // Without this guard, if the signal is flat, sigMax and sigMin could
  // converge to the same value, causing divide-by-zero issues.
  if (sigMax < sigMin + 100) sigMax = sigMin + 100;

  // Expand the tracked range if we see a new extreme
  if (hrData.ecgSmoothed > sigMax) sigMax = hrData.ecgSmoothed;
  if (hrData.ecgSmoothed < sigMin) sigMin = hrData.ecgSmoothed;

  int range       = sigMax - sigMin;
  int adaptThresh = sigMin + (int)(range * Config::ECG_THRESH_RATIO);
  int hysteresis  = (int)(range * Config::ECG_HYST_RATIO);
  hrData.adaptThresh = adaptThresh; // Store for display/debug

  // ── Step 5: R-Peak (heartbeat) detection ───────────────────────
  // The R-peak is the sharp tall spike in an ECG waveform — the
  // main electrical event of each heartbeat.
  //
  // We look for the signal crossing ABOVE the threshold on a rising edge.
  // "aboveThreshold" prevents the same peak from being counted multiple times.
  if (hrData.ecgSmoothed > adaptThresh && !aboveThreshold) {
    aboveThreshold = true; // We are now above threshold — start of a potential R-peak

    // Check whether the settle period has elapsed since leads connected.
    // During settle the adaptive tracker is still learning the signal range,
    // so BPM calculations would be unreliable.
    bool settled = (now - hrData.leadsConnectedAt) >= Config::ECG_SETTLE_MS;

    // 250ms refractory period: ignore any re-trigger within 250ms.
    // The human heart cannot beat faster than ~4 times per second (240 BPM),
    // so any threshold crossing within 250ms of the last beat is noise.
    if (settled && (now - hrData.lastBeat > 250)) {
      if (hrData.lastBeat != 0) {
        // Calculate BPM from the time between this beat and the previous one.
        // BPM = 60 seconds / (beat interval in seconds)
        float deltaSec = (now - hrData.lastBeat) / 1000.0f;
        float instBPM  = 60.0f / deltaSec;

        // Only accept physiologically plausible values
        if (instBPM >= Config::BPM_MIN && instBPM <= Config::BPM_MAX) {
          hrData.bpm = instBPM;

          // Store in ring buffer and update rolling average
          hrData.rates[hrData.rateSpot++] = instBPM;
          hrData.rateSpot %= Config::BPM_RATE_SIZE;
          if (hrData.validBeats < Config::BPM_RATE_SIZE) hrData.validBeats++;

          float bpmSum = 0;
          for (byte i = 0; i < hrData.validBeats; i++) bpmSum += hrData.rates[i];
          hrData.bpmAvg = (int)(bpmSum / (float)hrData.validBeats);
        }
      }
      hrData.lastBeat = now; // Record this beat's timestamp
    } else if (!settled && hrData.lastBeat == 0) {
      // Even during settling, record the first beat time so that
      // the very first post-settle interval is measured correctly.
      hrData.lastBeat = now;
    }

  } else if (hrData.ecgSmoothed < adaptThresh - hysteresis) {
    // Signal dropped below (threshold minus hysteresis) — reset the
    // above-threshold flag so the next R-peak can be detected.
    aboveThreshold = false;
  }
}


// ============================================================
//  SENSOR: BMI160 (Accelerometer, Gyroscope, Step Counter)
// ============================================================

// One-time setup for the BMI160 IMU over I2C.
// Enables the built-in step counting hardware on the chip.
void initBMI160() {
  Serial.print("[BMI160] Initializing... ");
  if (!BMI160.begin(BMI160GenClass::I2C_MODE, Config::BMI160_ADDR)) {
    Serial.println("FAILED — check wiring!");
    health.bmi160 = false;
    return;
  }

  // Use "normal" step detection mode — a good general-purpose setting
  // that works for walking and running. Other modes exist for low power.
  BMI160.setStepDetectionMode(BMI160_STEP_MODE_NORMAL);
  BMI160.setStepCountEnabled(true);

  health.bmi160 = true;
  Serial.println("OK");
}

// Called every 100ms. Reads acceleration, rotation, and step count.
void updateIMU() {
  if (!health.bmi160) return;

  // Read all 6 axes in one call (ax, ay, az = accelerometer; gx, gy, gz = gyroscope)
  BMI160.readAccelerometer(imuData.ax, imuData.ay, imuData.az);
  BMI160.readGyro(imuData.gx, imuData.gy, imuData.gz);

  // Get the cumulative step count from the BMI160 hardware counter.
  // stepDetected is true only for the cycle where count increases.
  uint32_t steps        = (uint32_t)BMI160.getStepCount();
  imuData.stepDetected  = (steps > imuData.stepCount);
  imuData.stepCount     = steps;
}


// ============================================================
//  SENSOR: DS18B20 (Skin Temperature)
// ============================================================

// One-time setup for the DS18B20 temperature sensor on the OneWire bus.
// Sets resolution to 12-bit (0.0625°C per step) and enables non-blocking mode.
void initDS18B20() {
  Serial.print("[DS18B20] Initializing... ");
  tempSensor.begin();

  uint8_t n    = tempSensor.getDeviceCount(); // Scan the OneWire bus for sensors
  health.ds18b20 = (n > 0);
  Serial.printf("%s (found %d device[s])\n", health.ds18b20 ? "OK" : "FAILED", n);

  if (health.ds18b20) {
    tempSensor.setResolution(12);               // Highest resolution: 12-bit
    tempSensor.setWaitForConversion(false);      // Non-blocking: don't halt the CPU while sensor converts.
                                                 // We trigger a read and come back 750ms+ later for the result.
  }
}

// Called every 100ms but internally throttled to one request every 2 seconds.
// Uses a two-step non-blocking approach:
//   Step A (every 2s): Send the "please measure temperature" command
//   Step B (800ms later): Come back and read the result
// This avoids blocking the CPU for 750ms waiting for the DS18B20 to convert.
void updateTemperature() {
  if (!health.ds18b20) return;

  static unsigned long lastTempRequest = 0;
  static bool          tempRequested   = false;
  unsigned long        now             = millis();

  // Step A: Kick off a new temperature conversion every 2 seconds
  if (!tempRequested && (now - lastTempRequest >= 2000)) {
    tempSensor.requestTemperatures();
    tempRequested   = true;
    lastTempRequest = now;
  }

  // Step B: Read the result 800ms after requesting
  // (DS18B20 at 12-bit resolution needs at least 750ms to convert)
  if (tempRequested && (now - lastTempRequest >= 800)) {
    float c = tempSensor.getTempCByIndex(0); // Read the first sensor on the bus

    // Validate the reading. DEVICE_DISCONNECTED_C (-127) means no sensor found.
    // We also reject anything outside the sensor's rated -55°C to +125°C range.
    if (c == DEVICE_DISCONNECTED_C || c < -55.0f || c > 125.0f) {
      tempData.valid   = false;
      tempData.celsius = 0.0f;
    } else {
      tempData.celsius    = c;
      tempData.fahrenheit = tempSensor.toFahrenheit(c);
      tempData.valid      = true;
    }
    tempRequested = false; // Ready to request again after 2 seconds
  }
}


// ============================================================
//  SENSOR: BF350 Strain Gauge → Respiration (Breathing Rate)
// ============================================================

// Called every 100ms. Reads the strain gauge and calculates breathing rate.
//
// HOW IT WORKS:
//   The strain gauge is wrapped around the chest strap. When you inhale, your
//   chest expands and stretches the gauge, changing its resistance and therefore
//   the ADC voltage. When you exhale, it relaxes. This creates a slow wave.
//
//   We apply 3 stages of signal processing to extract the breathing rate:
//   Stage 1: Low-pass filter   — removes fast electrical noise
//   Stage 2: DC removal        — removes the constant "resting tension" offset
//   Stage 3: Zero-crossing     — detects each time the breathing wave rises
//                                through zero, counting one breath per crossing
void updateStrain() {

  // Average 8 rapid ADC reads to reduce ADC quantization noise
  const uint8_t SAMPLES = 8;
  uint32_t adcSum = 0;
  for (uint8_t i = 0; i < SAMPLES; i++) {
    adcSum += analogRead(Config::STRAIN_PIN);
    delayMicroseconds(100); // Small gap between reads
  }
  strainData.raw     = adcSum / SAMPLES;
  strainData.voltage = (strainData.raw / Config::ADC_MAX) * Config::ADC_REF_V;

  // ── Stage 1: Moving-average low-pass filter ─────────────────────
  // Averages the last RESP_FILTER_SIZE samples (5 samples = 500ms window).
  // Breathing is slow (0.1–0.7 Hz) so we can aggressively filter faster noise.
  static float   maBuffer[Config::RESP_FILTER_SIZE] = {0};
  static uint8_t maIdx = 0;
  maBuffer[maIdx] = (float)strainData.raw;
  maIdx = (maIdx + 1) % Config::RESP_FILTER_SIZE;

  float maSum = 0;
  for (uint8_t i = 0; i < Config::RESP_FILTER_SIZE; i++) maSum += maBuffer[i];
  respData.filteredRaw = maSum / Config::RESP_FILTER_SIZE;

  // ── Stage 2: DC removal (baseline subtraction) ─────────────────
  // The strain gauge has a DC bias from the strap tension and body posture.
  // We compute a very slow moving average (30 samples = 3 seconds window)
  // which tracks this slow-changing bias, then subtract it.
  // What remains (acComponent) is just the breathing oscillation around zero.
  static float   dcBuffer[Config::RESP_DC_SIZE] = {0};
  static uint8_t dcIdx = 0;
  dcBuffer[dcIdx] = respData.filteredRaw;
  dcIdx = (dcIdx + 1) % Config::RESP_DC_SIZE;

  float dcSum = 0;
  for (uint8_t i = 0; i < Config::RESP_DC_SIZE; i++) dcSum += dcBuffer[i];
  float dcMean           = dcSum / Config::RESP_DC_SIZE;
  respData.acComponent   = respData.filteredRaw - dcMean; // Pure breathing signal, zero-centered

  // ── Stage 3: Zero-crossing breath detection ─────────────────────
  // A breath is detected when the AC signal crosses from negative to positive
  // (i.e., going from exhale into inhale — the rising part of the wave).
  // RESP_MIN_INTERVAL (1500ms) prevents fast motion from being counted as breaths.
  static float prevAC          = 0.0f;
  static long  lastBreathLocal = 0;
  respData.breathDetected = false;

  unsigned long now     = millis();
  bool zeroCrossUp      = (prevAC < 0.0f && respData.acComponent >= 0.0f); // Rising zero-cross

  if (zeroCrossUp && (now - lastBreathLocal > Config::RESP_MIN_INTERVAL)) {
    if (lastBreathLocal != 0) {
      // Time since the previous breath crossing = one breath cycle
      float intervalSec = (now - lastBreathLocal) / 1000.0f;
      float instRate    = 60.0f / intervalSec;

      // Accept only physiologically valid breathing rates
      if (instRate >= Config::RESP_MIN && instRate <= Config::RESP_MAX) {
        respData.rateInstant = instRate;

        // Store in ring buffer and update rolling average
        respData.rates[respData.rateSpot++] = instRate;
        respData.rateSpot %= Config::RESP_RATE_SIZE;
        if (respData.validBreaths < Config::RESP_RATE_SIZE) respData.validBreaths++;

        float rSum = 0;
        for (byte i = 0; i < respData.validBreaths; i++) rSum += respData.rates[i];
        respData.rateAvg        = (int)(rSum / (float)respData.validBreaths);
        respData.breathDetected = true;
      }
    }
    lastBreathLocal     = now;
    respData.lastBreath = now;
  }
  prevAC = respData.acComponent; // Remember this sample for next cycle
}


// ============================================================
//  OLED DISPLAY
// ============================================================

// One-time setup: initialize the SSD1306 over I2C and show a startup screen.
void initOLED() {
  Serial.print("[OLED] Initializing... ");
  if (!display.begin(SSD1306_SWITCHCAPVCC, Config::OLED_ADDR)) {
    Serial.println("FAILED at 0x3C");
    return; // Continue without display — not critical
  }

  // Show a splash screen during startup
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.cp437(true); // Use full IBM CP437 character set
  display.setTextSize(1);
  display.setCursor(10, 10); display.println("  STRAP MONITOR v2.7");
  display.setCursor(20, 24); display.println("Athlete: " + String(Config::ATHLETE_ID));
  display.setCursor(18, 40); display.println("Initializing...");
  display.drawRect(0, 0, 128, 64, SSD1306_WHITE); // Border frame
  display.display();
  Serial.println("OK");
}

// ── OLED Page 0: Heart Rate ───────────────────────────────────
// Shows BPM, the ECG signal strength percentage, and lead status.
// If settling after electrode attachment, shows a countdown instead.
void drawOledPage0() {
  display.clearDisplay();

  // Header bar (inverted colours = white background with black text)
  display.fillRect(0, 0, 128, 12, SSD1306_WHITE);
  display.setTextColor(SSD1306_BLACK);
  display.setTextSize(1);
  display.setCursor(2, 2);  display.print("HEART RATE");
  display.setCursor(72, 2); display.print(getShortTime());
  display.setTextColor(SSD1306_WHITE);

  if (hrData.leadsConnected) {
    bool settled = (millis() - hrData.leadsConnectedAt) >= Config::ECG_SETTLE_MS;

    if (!settled) {
      // Show calibration progress while adaptive threshold is settling
      display.setTextSize(1);
      display.setCursor(8, 22); display.print("Leads connected.");
      display.setCursor(8, 35); display.print("Calibrating ECG...");
      display.setCursor(8, 48); display.printf("Ready in %lus",
        (Config::ECG_SETTLE_MS - (millis() - hrData.leadsConnectedAt)) / 1000UL + 1);
    } else {
      // Normal display: big BPM number + instant BPM + signal quality
      display.setTextSize(3);
      display.setCursor(0, 16);
      display.print(hrData.bpmAvg);

      display.setTextSize(1);
      display.setCursor(56, 24); display.print("BPM avg");
      display.setCursor(0, 44);
      display.printf("Inst: %d BPM", (int)hrData.bpm);

      // Signal quality as a percentage: how far the smoothed ECG value
      // is above the adaptive floor, relative to the threshold.
      int denom     = hrData.adaptThresh - 1748;
      int signalPct = (denom > 0)
        ? constrain((int)(((float)(hrData.ecgSmoothed - 1748) / (float)denom) * 100.0f), 0, 100)
        : 0;
      display.setCursor(0, 55);
      display.printf("ECG sig: %d%%", signalPct);
    }
  } else {
    // Electrode pads are not on skin — prompt the user
    display.setTextSize(1);
    display.setCursor(8, 22); display.print("Leads disconnected");
    display.setCursor(8, 35); display.print("Attach electrodes");
    display.setCursor(8, 48); display.print("and check contact");
  }
  display.display();
}

// ── OLED Page 1: Respiration ──────────────────────────────────
// Shows average and instant breathing rate + a live waveform bar.
void drawOledPage1() {
  display.clearDisplay();

  display.fillRect(0, 0, 128, 12, SSD1306_WHITE);
  display.setTextColor(SSD1306_BLACK);
  display.setTextSize(1);
  display.setCursor(2, 2);  display.print("RESPIRATION");
  display.setCursor(72, 2); display.print(getShortTime());
  display.setTextColor(SSD1306_WHITE);

  display.setTextSize(3);
  display.setCursor(0, 16);
  if (respData.validBreaths > 0) display.print(respData.rateAvg);
  else                           display.print("--"); // Not enough data yet

  display.setTextSize(1);
  display.setCursor(56, 24); display.print("br/min");

  display.setCursor(0, 44);
  if (respData.rateInstant > 0)
    display.printf("Inst: %.1f br/min", respData.rateInstant);
  else
    display.print("Calibrating...");

  // Draw a tiny waveform bar at the bottom that moves with the breathing signal.
  // A horizontal line shows zero; the bar extends up (inhale) or down (exhale).
  display.drawLine(0, 57, 127, 57, SSD1306_WHITE);
  int barH = (int)constrain(respData.acComponent / 20.0f, -6.0f, 6.0f);
  if (barH >= 0) display.fillRect(0, 57 - barH, 30, barH + 1, SSD1306_WHITE);
  else           display.fillRect(0, 57, 30, -barH, SSD1306_WHITE);

  // Small filled circle in the corner flashes when a breath is detected
  if (respData.breathDetected) display.fillCircle(120, 57, 4, SSD1306_WHITE);
  display.display();
}

// ── OLED Page 2: Motion / Steps ──────────────────────────────
// Shows total step count and raw accelerometer values.
void drawOledPage2() {
  display.clearDisplay();

  display.fillRect(0, 0, 128, 12, SSD1306_WHITE);
  display.setTextColor(SSD1306_BLACK);
  display.setTextSize(1);
  display.setCursor(2, 2);  display.print("MOTION");
  display.setCursor(72, 2); display.print(getShortTime());
  display.setTextColor(SSD1306_WHITE);

  display.setCursor(0, 15); display.setTextSize(1); display.print("STEPS");
  display.setTextSize(2);   display.setCursor(0, 24); display.print(imuData.stepCount);

  // Asterisk (*) flashes briefly when a new step is detected
  if (imuData.stepDetected) {
    display.setTextSize(1); display.setCursor(100, 24); display.print("*");
  }

  display.setTextSize(1);
  display.setCursor(0, 44); display.printf("AX:%-5d AY:%-5d", imuData.ax, imuData.ay);
  display.setCursor(0, 54); display.printf("AZ:%-5d", imuData.az);
  display.display();
}

// ── OLED Page 3: Temperature & System Health ─────────────────
// Shows skin temperature, strap tension bar, and WiFi/Firebase status.
void drawOledPage3() {
  display.clearDisplay();

  display.fillRect(0, 0, 128, 12, SSD1306_WHITE);
  display.setTextColor(SSD1306_BLACK);
  display.setTextSize(1);
  display.setCursor(2, 2);  display.print("TEMP & SYSTEM");
  display.setCursor(90, 2); display.print(getShortTime().substring(0, 5)); // Show HH:MM only (fits)
  display.setTextColor(SSD1306_WHITE);

  // Temperature (or error message if sensor not responding)
  display.setCursor(0, 15);
  if (tempData.valid)
    display.printf("Temp: %.1fC / %.1fF", tempData.celsius, tempData.fahrenheit);
  else
    display.print("Temp: -- Sensor ERR --");

  // Strap tension bar: shows how tight the strap is based on strain gauge voltage.
  // Full bar width = maximum ADC value (very tight). Empty = very loose.
  display.setCursor(0, 26); display.print("Strap tension:");
  int barW = (int)((strainData.raw / Config::ADC_MAX) * 126.0f);
  display.drawRect(0, 35, 128, 8, SSD1306_WHITE);      // Outline rectangle
  display.fillRect(1, 36, barW, 6, SSD1306_WHITE);     // Filled bar
  display.setCursor(0, 46); display.printf("Raw:%d  %.3fV", strainData.raw, strainData.voltage);

  // System status line: Y = OK, N = problem
  display.setCursor(0, 56);
  display.printf("WiFi:%s FB:%s Heap:%dkB",
    health.wifi      ? "Y" : "N",
    Firebase.ready() ? "Y" : "N",
    ESP.getFreeHeap() / 1024); // Free RAM in kilobytes
  display.display();
}

// Automatically cycles through pages every OLED_PAGE_DURATION milliseconds,
// then calls the appropriate draw function for the current page.
void updateOLED() {
  if (millis() - lastPageSwitch >= Config::OLED_PAGE_DURATION) {
    lastPageSwitch  = millis();
    currentOledPage = (currentOledPage + 1) % Config::OLED_PAGES; // Wrap 3 → 0
  }
  switch (currentOledPage) {
    case 0: drawOledPage0(); break; // Heart rate
    case 1: drawOledPage1(); break; // Respiration
    case 2: drawOledPage2(); break; // Motion / steps
    case 3: drawOledPage3(); break; // Temperature & system
  }
}


// ============================================================
//  SERIAL TELEMETRY
//  Prints a single compact line to the USB serial port every
//  500ms. Useful for debugging with the Arduino Serial Monitor.
// ============================================================
void printSerial() {
  char ts[32];
  getFormattedTime(ts, sizeof(ts));

  bool settled = (millis() - hrData.leadsConnectedAt) >= Config::ECG_SETTLE_MS;

  Serial.printf(
    "[%s] %s | BPM=%d(avg) %.1f(inst) | ECG=%d raw=%d thr=%d leads=%s settled=%s | "
    "RESP=%d(avg) %.1f(inst) AC=%.1f | "
    "Temp=%.2fC | Strain=%d (%.3fV) | Steps=%lu | "
    "Accel=[%d,%d,%d] | Gyro=[%d,%d,%d] | WiFi:%s FB:%s\n",
    ts, Config::ATHLETE_ID,
    hrData.bpmAvg, hrData.bpm,
    hrData.ecgSmoothed, hrData.ecgValue, hrData.adaptThresh,
    hrData.leadsConnected ? "YES" : "NO",
    settled               ? "YES" : "NO",
    respData.rateAvg, respData.rateInstant, respData.acComponent,
    tempData.celsius, strainData.raw, strainData.voltage,
    imuData.stepCount,
    imuData.ax, imuData.ay, imuData.az,
    imuData.gx, imuData.gy, imuData.gz,
    health.wifi      ? "Y" : "N",
    Firebase.ready() ? "Y" : "N"
  );
}


// ============================================================
//  SETUP — Runs once at power-on
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(500); // Short delay so the serial monitor has time to connect
  Serial.println("\n\n=== Strap Monitor v2.7.0 ===");

  // Configure the hardware watchdog timer.
  // If the CPU gets stuck (e.g. in an infinite loop or waiting forever
  // for a sensor), it will automatically reboot after WDT_TIMEOUT_SEC seconds.
  const esp_task_wdt_config_t wdt_config = {
    .timeout_ms     = Config::WDT_TIMEOUT_SEC * 1000,
    .idle_core_mask = 0,
    .trigger_panic  = true // Print a crash log before rebooting
  };
  esp_task_wdt_init(&wdt_config);
  esp_task_wdt_add(NULL); // Register the current (main) task with the watchdog

  // Start the I2C bus for the BMI160 and OLED (both share SDA/SCL)
  Wire.begin(Config::SDA_PIN, Config::SCL_PIN);
  Wire.setClock(100000); // 100 kHz — a reliable speed for both devices

  // Set the ADC to 12-bit resolution (0–4095 range for all analog reads)
  analogReadResolution(12);
  // Note: per-pin ADC attenuation is set inside initAD8232()

  // Initialize each hardware component in order.
  // If any sensor fails, health.xxx stays false and that sensor is skipped.
  initOLED();      // Display (not critical — code runs without it)
  initAD8232();    // ECG sensor + ADC attenuation + LO pin config
  initBMI160();    // Accelerometer / gyroscope / step counter
  initDS18B20();   // Skin temperature sensor

  // Connect to WiFi and sync the clock
  connectWiFi();
  if (health.wifi) {
    // configTime sets up the NTP client to keep the real-time clock accurate.
    // The chip will periodically re-sync with pool.ntp.org automatically.
    configTime(Config::GMT_OFFSET_SEC, Config::DST_OFFSET_SEC, Config::NTP_SERVER);
    Serial.println("[NTP] Time sync started...");
  }

  // Connect to Firebase (requires WiFi to already be connected)
  initFirebase();

  // Start the OLED page-rotation timer from now
  lastPageSwitch = millis();

  Serial.println("[System] Ready. Entering main loop.\n");
  esp_task_wdt_reset(); // Pet the watchdog after the long setup phase
}


// ============================================================
//  LOOP — Runs repeatedly forever after setup()
//
//  Each task is guarded by a time check so multiple tasks can
//  run on different schedules without using threads or delays.
//  This is called "cooperative scheduling" or a "super-loop".
// ============================================================
void loop() {
  esp_task_wdt_reset(); // Pet the watchdog every loop to prevent reboot

  // ECG runs at 100 Hz — checked every single loop iteration.
  // The function internally checks if it's time to sample (every 10ms).
  updateHeartRate();

  unsigned long now = millis();

  // Every 100ms: read motion, temperature, and strain/respiration
  if (now - lastSensor >= Config::SENSOR_INTERVAL) {
    lastSensor = now;
    updateIMU();
    updateTemperature();
    updateStrain();
  }

  // Every 200ms: refresh the OLED display (5 fps is smooth enough for slow data)
  if (now - lastOLED >= Config::OLED_INTERVAL) {
    lastOLED = now;
    updateOLED();
  }

  // Every 500ms: print a telemetry line to USB serial for debugging
  if (now - lastSerial >= Config::SERIAL_INTERVAL) {
    lastSerial = now;
    printSerial();
  }

  // Every 60 seconds: archive old data and upload new readings to Firebase
  if (now - lastUpload >= Config::UPLOAD_INTERVAL) {
    lastUpload = now;
    uploadToFirebase();
  }
}
