require('dotenv').config();
const { db, admin } = require('./src/config/firebase');

async function simulateAlert() {
  if (!db) {
    console.error("Firebase not initialized. Check your .env file or Firebase credentials.");
    process.exit(1);
  }

  const athleteId = 'ATH_002';
  
  // These values are designed to trigger Critical Alerts based on athleteService.js
  // HR > 200 (215) -> HR_CRITICAL
  // Temp > 40 (41.5) -> TEMP_CRITICAL
  // Resp > 50 (55) -> RESP_CRITICAL
  const alertData = {
    athlete_id: athleteId,
    fw_version: '2.7.0',
    heart_rate: {
      bpm: 215,
      bpm_avg: 210,
      ecg_value: 2211,
      leads_connected: true
    },
    motion: {
      accel_x: -892,
      accel_y: -1203,
      accel_z: 16875,
      gyro_x: -41,
      gyro_y: -11,
      gyro_z: 12,
      step_count: 120
    },
    respiration: {
      rate_avg: 55, 
      rate_instant: 56,
      strain_raw: 4095,
      strain_v: 3.3,
      valid_breaths: 6
    },
    system: {
      heap_free: 172368,
      wifi_rssi: -62
    },
    temperature: {
      celsius: 41.5,
      fahrenheit: 106.7,
      valid: true
    },
    timestamp: new Date().toLocaleString('en-GB') // Matches DD/MM/YYYY HH:MM:SS loosely
  };

  try {
    console.log(`Pushing simulated critical alert data to athlete_records/${athleteId}/latest...`);
    await db.ref(`athlete_records/${athleteId}/latest`).update(alertData);
    console.log("✅ Alert simulation successful! Check your frontend or backend logs.");
  } catch (error) {
    console.error("❌ Error pushing simulated alert:", error);
  } finally {
    // Terminate Firebase app to allow script to exit properly
    setTimeout(() => {
        if(admin && admin.apps.length > 0) {
            Promise.all(admin.apps.map(app => app.delete())).then(() => process.exit(0));
        } else {
            process.exit(0);
        }
    }, 1000);
  }
}

simulateAlert();
