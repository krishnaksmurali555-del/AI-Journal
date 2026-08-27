import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import rawFirebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase Admin SDK lazily & defensively
let adminApp: admin.app.App | null = null;
let firestoreDb: admin.firestore.Firestore | null = null;
let authAdmin: admin.auth.Auth | null = null;

export function getFirebaseAdmin() {
  if (!adminApp) {
    if (admin.apps.length > 0) {
      adminApp = admin.apps[0]!;
    } else {
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || rawFirebaseConfig.projectId || 'ai-journal-c2e5f';
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (clientEmail && privateKey) {
        adminApp = admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
          projectId,
        });
      } else {
        // Fallback to Application Default Credentials or Project ID in Google Cloud Run environment
        adminApp = admin.initializeApp({
          projectId,
        });
      }
    }

    const databaseId = rawFirebaseConfig.firestoreDatabaseId;
    if (databaseId && databaseId !== '(default)') {
      firestoreDb = getFirestore(adminApp, databaseId);
    } else {
      firestoreDb = adminApp.firestore();
    }
    
    authAdmin = adminApp.auth();
  }

  return {
    app: adminApp,
    db: firestoreDb!,
    auth: authAdmin!,
  };
}

/**
 * Strips all `undefined` values from an object before saving to Firestore to prevent driver rejections.
 */
export function sanitizePayload<T extends Record<string, any>>(obj: T): T {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }
  return sanitized as T;
}
