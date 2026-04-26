import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from "firebase/storage";
import { app } from "./firebase";

// Browser-side helpers that use the user's Firebase Auth session.
// Storage rules can authorise via request.auth.uid — no server round trip needed.

function storage() {
  if (!app) {
    throw new Error(
      "Firebase is not configured (missing NEXT_PUBLIC_FIREBASE_* env vars)",
    );
  }
  return getStorage(app);
}

export async function uploadFile(
  path: string,
  file: Blob | File,
): Promise<string> {
  const storageRef = ref(storage(), path);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

export async function getFileUrl(path: string): Promise<string> {
  return getDownloadURL(ref(storage(), path));
}

export async function deleteFile(path: string): Promise<void> {
  await deleteObject(ref(storage(), path));
}
