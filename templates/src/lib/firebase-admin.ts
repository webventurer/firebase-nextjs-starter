import {
  type App,
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { type Firestore, getFirestore } from "firebase-admin/firestore";

// Initialise Firebase Admin SDK for server-side operations.
// Local dev: uses FB_SERVICE_ACCOUNT_KEY (a JSON string in .env.local).
// Production (App Hosting / Cloud Run / Cloud Functions): uses Application Default Credentials.
function initializeFirebaseAdmin(): App | null {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }

  // Note: FB_ prefix instead of FIREBASE_ — FIREBASE_ is reserved by Firebase tooling
  const serviceAccountJson = process.env.FB_SERVICE_ACCOUNT_KEY;

  try {
    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      return initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
    }
    return initializeApp({
      credential: applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } catch (error) {
    console.error("Firebase Admin: Failed to initialise:", error);
    return null;
  }
}

const adminApp = initializeFirebaseAdmin();

export const adminDb: Firestore | null = adminApp
  ? getFirestore(adminApp)
  : null;
export const isAdminConfigured = adminApp !== null;
