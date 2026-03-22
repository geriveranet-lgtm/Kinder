import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
export const googleProvider = new GoogleAuthProvider();

export const signIn = () => signInWithPopup(auth, googleProvider);
export const logOut = () => signOut(auth);

// Test connection
async function testConnection() {
  try {
    console.log("Testing Firebase connection...");
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection successful!");
  } catch (error) {
    console.error("Firebase connection test failed:", error);
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("CRITICAL: Firestore is offline. This usually means the configuration (Project ID, API Key, or Database ID) is incorrect or the database is not yet ready.");
    }
  }
}
testConnection();
