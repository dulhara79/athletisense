require('dotenv').config();
const { db } = require('./src/config/firebase');

async function countRecords() {
    if (!db) {
        console.error("❌ Firebase not initialized.");
        process.exit(1);
    }

    const ATHLETE_ID = 'ATH_001';
    console.log(`🔍 Counting total records for ${ATHLETE_ID}...`);
    
    // We only fetch the keys to be efficient
    const ref = db.ref(`athlete_records/${ATHLETE_ID}/readings`);
    const snapshot = await ref.once('value');
    
    if (!snapshot.exists()) {
        console.log("ℹ️ No records found.");
        process.exit(0);
    }

    const count = snapshot.numChildren();
    console.log(`📊 Total records for ${ATHLETE_ID}/readings: ${count}`);
    
    // Also check other nodes
    const mlPredictionsRef = db.ref(`athlete_records/${ATHLETE_ID}/ml_predictions`);
    const mlSnapshot = await mlPredictionsRef.once('value');
    if (mlSnapshot.exists()) {
        console.log(`📊 Total records for ${ATHLETE_ID}/ml_predictions: ${mlSnapshot.numChildren()}`);
    }

    process.exit(0);
}

countRecords().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
});
