require('dotenv').config();
const { db } = require('./src/config/firebase');

const ATHLETE_ID = 'ATH_001';
const LIMIT = 200;

async function cleanup() {
    if (!db) {
        console.error("❌ Firebase not initialized. Check your .env file.");
        process.exit(1);
    }

    console.log(`🔍 Checking records for ${ATHLETE_ID}...`);
    const ref = db.ref(`athlete_records/${ATHLETE_ID}/readings`);
    
    // Get total count first (this might be expensive if there are millions, but good to know)
    // Actually, for a quick count we can just fetch keys. 
    // But since they have a limit issue, let's just get the last 200 as requested.

    console.log(`📡 Fetching the last ${LIMIT} records...`);
    const snapshot = await ref.orderByKey().limitToLast(LIMIT).once('value');
    
    if (!snapshot.exists()) {
        console.log("ℹ️ No records found in the readings node.");
        process.exit(0);
    }

    const records = snapshot.val();
    const keys = Object.keys(records);
    const count = keys.length;
    
    console.log(`✅ Found ${count} records to delete.`);

    // To be safe, we perform a multi-path update to delete them
    const updates = {};
    keys.forEach(key => {
        updates[key] = null;
    });

    console.log(`🗑️ Deleting records from athlete_records/${ATHLETE_ID}/readings...`);
    
    try {
        await ref.update(updates);
        console.log(`✨ Successfully deleted ${count} records.`);
        
        // Also check if they want to delete from other potential large nodes
        // Like ml_history or ml_insights if they exist for this athlete
        
        console.log("\n💡 Tip: If you are still over limits, consider deleting older records or clearing the entire node if it's for testing.");
        console.log("You can also run this script multiple times to delete more batches of 200.");

    } catch (error) {
        console.error("❌ Error during deletion:", error.message);
        if (error.message.includes("quota") || error.message.includes("limit")) {
            console.error("⚠️ It seems your database is strictly locked due to limits. You might need to delete data via the Firebase Console directly.");
        }
    }

    process.exit(0);
}

cleanup().catch(err => {
    console.error("❌ Fatal Error:", err);
    process.exit(1);
});
