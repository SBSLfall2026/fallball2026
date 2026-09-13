const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db        = admin.firestore();
const TEAM_CODE = process.env.TEAM_CODE || 'SBSL-14USB';
const COLLS     = ['players','games','lineups','stats','notes','resources','pitching',
                   'compliance','fields','opponents','coaches','batteries','scouting'];

async function backup() {
  const snapshot = { _teamCode: TEAM_CODE, _exportedAt: new Date().toISOString() };
  for (const coll of COLLS) {
    const docs = await db.collection('teams').doc(TEAM_CODE).collection(coll).get();
    snapshot[coll] = docs.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`  ${coll}: ${snapshot[coll].length} records`);
  }

  const date    = new Date().toISOString().slice(0, 10);
  const outDir  = path.join(__dirname, '..', 'backups');
  const outFile = path.join(outDir, `backup-${date}.json`);
  fs.writeFileSync(outFile, JSON.stringify(snapshot, null, 2));
  console.log(`\nBackup written: backups/backup-${date}.json`);
}

backup().catch(e => { console.error(e); process.exit(1); });
