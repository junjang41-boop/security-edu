import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyC3sWjelLdiyul2OKjw4oUirl24K2u9TZQ",
  authDomain: "security-edu.firebaseapp.com",
  projectId: "security-edu",
  storageBucket: "security-edu.firebasestorage.app",
  messagingSenderId: "970973643404",
  appId: "1:970973643404:web:d64c6c18011a7444aaf1a9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);