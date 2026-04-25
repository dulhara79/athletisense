require('dotenv').config();
const { db } = require('./src/config/firebase');

async function listAthletes() {
    if (!db) {
        console.error("❌ Firebase not initialized.");
        process.exit(1);
    }

    console.log(`🔍 Listing all athletes and record counts...`);
    const ref = db.ref(`athlete_records`);
    const snapshot = await ref.once('value');
    
    if (!snapshot.exists()) {
        console.log("ℹ️ No athletes found.");
        process.exit(0);
    }

    const athletes = snapshot.val();
    for (const id in athletes) {
        const readings = athletes[id].readings ? Object.keys(athletes[id].readings).length : 0;
        const predictions = athletes[id].ml_predictions ? Object.keys(athletes[id].ml_predictions).length : 0;
        console.log(`👤 Athlete: ${id} | Readings: ${readings} | ML Predictions: ${predictions}`);
    }

    process.exit(0);
}

listAthletes().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
});
