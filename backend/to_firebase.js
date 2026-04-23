require('dotenv').config();
const { db, admin } = require('./src/config/firebase');

// Helper functions for data generation
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(1));

async function simulateAlertHistory() {
    if (!db) {
        console.error("Firebase not initialized. Check your .env file or Firebase credentials.");
        process.exit(1);
    }

    const athleteId = 'ATH_001';

    // Start date: March 2, 2026
    let currentDate = new Date('2026-02-28T12:00:00');
    let lastAlertData = null;

    console.log(`Starting to generate 30 records for ${athleteId} (Mixed Normal/Critical)...`);

    for (let i = 0; i < 30; i++) {
        // 20% chance for a record to be critical, 80% chance to be normal
        const isCritical = Math.random() < 0.2;

        // Define metrics based on whether the state is critical or normal
        const currentBpm = isCritical ? getRandomInt(201, 225) : getRandomInt(80, 160);
        const currentTempC = isCritical ? getRandomFloat(40.1, 42.0) : getRandomFloat(36.5, 38.5);
        const currentResp = isCritical ? getRandomInt(51, 60) : getRandomInt(15, 35);

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
                accel_z: getRandomInt(15000, 17000),
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
            timestamp: currentDate.toLocaleString('en-GB')
        };

        try {
            // 1. Push ALL 30 records into the 'readings' node for historical tracking
            const readingsRef = db.ref(`athlete_records/${athleteId}/readings`).push();
            await readingsRef.set(alertData);

            const statusLabel = isCritical ? "🔴 CRITICAL" : "🟢 NORMAL";
            console.log(`[${i + 1}/30] Pushed ${statusLabel} to 'readings' for: ${alertData.timestamp}`);

            // Store the current record to be used as the 'latest' later
            lastAlertData = alertData;
        } catch (error) {
            console.error(`❌ Error pushing alert for ${alertData.timestamp}:`, error);
        }

        // Advance the date by 1 day
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // 2. Set ONLY the very last generated record to the 'latest' node
    if (lastAlertData) {
        try {
            await db.ref(`athlete_records/${athleteId}/latest`).set(lastAlertData);
            console.log(`\n✅ Set 'latest' node to the final record (${lastAlertData.timestamp}).`);
        } catch (error) {
            console.error("❌ Error setting latest node:", error);
        }
    }

    console.log("✅ Simulation complete! Database seeded.");

    // Terminate Firebase app safely
    setTimeout(() => {
        if (admin && admin.apps.length > 0) {
            Promise.all(admin.apps.map(app => app.delete())).then(() => process.exit(0));
        } else {
            process.exit(0);
        }
    }, 1000);
}

simulateAlertHistory();