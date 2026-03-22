import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
export const googleProvider = new GoogleAuthProvider();

export const signIn = async () => {
  try {
    console.log("Starting sign in with popup...");
    const result = await signInWithPopup(auth, googleProvider);
    console.log("Sign in successful:", result.user.email);
    return result;
  } catch (error: any) {
    console.error("Sign in failed:", error);
    if (error.code === 'auth/popup-blocked') {
      console.error("Popup was blocked by the browser. Please allow popups for this site.");
      alert("Окно входа заблокировано браузером. Пожалуйста, разрешите всплывающие окна для этого сайта.");
    } else if (error.code === 'auth/unauthorized-domain') {
      console.error("Unauthorized domain. Please add the current domain to Firebase Authorized Domains.");
      alert("Этот домен не авторизован в Firebase. Пожалуйста, добавьте его в консоли Firebase (Authentication -> Settings -> Authorized domains).");
    } else if (error.code === 'auth/network-request-failed') {
      console.error("Network request failed. Please check your internet connection and Firebase configuration.");
      alert("Ошибка сети. Проверьте интернет-соединение.");
    }
    throw error;
  }
};
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
