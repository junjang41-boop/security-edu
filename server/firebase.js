const admin = require('firebase-admin');
require('dotenv').config();

const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/\n/g, '\n')
  : undefined;

console.log('Private Key 앞부분:', privateKey ? privateKey.substring(0, 50) : 'undefined');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: privateKey,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});
const db = admin.firestore();
const storage = admin.storage();
module.exports = { db, storage };