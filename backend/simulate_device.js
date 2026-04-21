require('dotenv').config();
const { db, admin } = require('./src/config/firebase');

// Helper functions for data generation
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(1));

// Delay function to simulate real-time hardware intervals
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function simulateLiveHardware() {
    if (!db) {
        console.error("Firebase not initialized. Check your .env file or Firebase credentials.");
        process.exit(1);
    }

    const athleteId = 'ATH_001';
    let currentDate = new Date(); // Start at current time

    console.log(`🚀 Starting LIVE Hardware Simulation for ${athleteId}...`);
    console.log(`Transmitting 1 reading every 5 seconds...\n`);

    for (let i = 0; i < 30; i++) {
        // 20% chance for a record to be critical, 80% normal
        const isCritical = Math.random() < 0.2;

        const currentBpm = isCritical ? getRandomInt(185, 225) : getRandomInt(80, 160);
        const currentTempC = isCritical ? getRandomFloat(38.6, 42.0) : getRandomFloat(36.5, 38.5);
        const currentResp = isCritical ? getRandomInt(51, 60) : getRandomInt(15, 35);
        const currentMotion = isCritical ? getRandomInt(0, 500) : getRandomInt(10000, 16000); // Critical: High HR, but zero motion

        const alertData = {
            athlete_id: athleteId,
            fw_version: '2.7.0',
            state: isCritical ? 'CRITICAL' : 'NORMAL',
            heart_rate: {
                bpm: currentBpm,
                bpm_avg: currentBpm - getRandomInt(2, 8),
                ecg_value: getRandomInt(2000, 2500),
                leads_connected: true
            },
            motion: {
                accel_x: getRandomInt(-1000, -800),
                accel_y: getRandomInt(-1300, -1100),
                accel_z: currentMotion,
                gyro_x: getRandomInt(-50, -30),
                gyro_y: getRandomInt(-20, 0),
                gyro_z: getRandomInt(5, 20),
                step_count: getRandomInt(100, 150)
            },
            respiration: {
                rate_avg: currentResp,
                rate_instant: currentResp + getRandomInt(-2, 2),
                strain_raw: 4095,
                strain_v: 3.3,
                valid_breaths: getRandomInt(5, 8)
            },
            system: {
                heap_free: getRandomInt(150000, 180000),
                wifi_rssi: getRandomInt(-70, -50)
            },
            temperature: {
                celsius: currentTempC,
                fahrenheit: parseFloat(((currentTempC * 9 / 5) + 32).toFixed(1)),
                valid: true
            },
            timestamp: currentDate.toISOString()
        };

        try {
            // 1. Push to historical readings
            await db.ref(`athlete_records/${athleteId}/readings`).push().set(alertData);

            // 2. Update the 'latest' node (This triggers WebSockets + React UI + ML Worker)
            await db.ref(`athlete_records/${athleteId}/latest`).set(alertData);

            const statusLabel = isCritical ? "🔴 CRITICAL" : "🟢 NORMAL  ";
            console.log(`[${i + 1}/30] Streamed ${statusLabel} | HR: ${currentBpm}bpm | Temp: ${currentTempC}°C`);

        } catch (error) {
            console.error(`❌ Error pushing alert:`, error);
        }

        // Wait 5 seconds before generating the next reading to simulate live hardware
        await delay(5000);
        currentDate.setMinutes(currentDate.getMinutes() + 1); // Advance clock for the DB timestamp
    }

    console.log("\n✅ Hardware Simulation complete!");
    process.exit(0);
}

simulateLiveHardware();