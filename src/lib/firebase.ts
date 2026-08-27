import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import rawFirebaseConfig from '../../firebase-applet-config.json';

const hasViteEnv = Boolean(import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_PROJECT_ID);

export const configSource = hasViteEnv ? 'VITE_ENVIRONMENT_VARIABLES' : 'FIREBASE_APPLET_CONFIG_JSON';

const resolvedApiKey = import.meta.env.VITE_FIREBASE_API_KEY || rawFirebaseConfig.apiKey || 'AIzaSyPlaceholderKeyForBuildSafetyOnly';

export const isApiKeyConfigured = Boolean(
  (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== 'AIzaSyPlaceholderKeyForBuildSafetyOnly') ||
  (rawFirebaseConfig.apiKey && rawFirebaseConfig.apiKey.length > 5)
);

export const firebaseConfig = {
  apiKey: resolvedApiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || rawFirebaseConfig.authDomain || 'ai-journal-c2e5f.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || rawFirebaseConfig.projectId || 'ai-journal-c2e5f',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || rawFirebaseConfig.storageBucket || 'ai-journal-c2e5f.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || rawFirebaseConfig.messagingSenderId || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || rawFirebaseConfig.appId || '1:ai-journal-c2e5f:web:app',
};

if (typeof window !== 'undefined') {
  console.info(`[Firebase Initialized] Source: ${configSource} | Project ID: ${firebaseConfig.projectId} | Auth Domain: ${firebaseConfig.authDomain}`);
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || rawFirebaseConfig.firestoreDatabaseId;
export const db = databaseId && databaseId !== '(default)'
  ? getFirestore(app, databaseId) 
  : getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export async function getCurrentUserToken(): Promise<string | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  try {
    return await currentUser.getIdToken();
  } catch (err) {
    console.error('Failed to get user token:', err);
    return null;
  }
}

export { signInWithPopup, signOut, onAuthStateChanged };
export type { User };
