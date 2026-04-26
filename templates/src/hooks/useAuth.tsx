"use client";

import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  type User,
  updatePassword,
} from "firebase/auth";
import {
  type DocumentData,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { DEMO_CONFIG } from "@/lib/demo-config";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";

// User profile stored in Firestore at /users/{uid}. Extend this type with your
// own fields — plan, displayName, avatarUrl, etc. — as your product grows.
export interface UserProfile extends DocumentData {
  uid: string;
  email: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  verifyEmail: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const isDemoMode = DEMO_CONFIG.enabled;

const DEMO_USER = {
  uid: DEMO_CONFIG.userId,
  email: DEMO_CONFIG.email,
  emailVerified: true,
  displayName: DEMO_CONFIG.displayName,
  getIdToken: async () => DEMO_CONFIG.token,
} as unknown as User;

const DEMO_PROFILE: UserProfile = {
  uid: DEMO_CONFIG.userId,
  email: DEMO_CONFIG.email,
};

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchUserProfile(
  firebaseUser: User,
): Promise<UserProfile | null> {
  if (isDemoMode) return DEMO_PROFILE;
  if (!db) return null;
  const snap = await getDoc(doc(db, "users", firebaseUser.uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(isDemoMode ? DEMO_USER : null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(
    isDemoMode ? DEMO_PROFILE : null,
  );
  const [loading, setLoading] = useState(!isDemoMode && isFirebaseConfigured);

  useEffect(() => {
    if (isDemoMode || !isFirebaseConfigured || !auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setUserProfile(
        firebaseUser ? await fetchUserProfile(firebaseUser) : null,
      );
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signUp(email: string, password: string) {
    if (isDemoMode) {
      setUser(DEMO_USER);
      setUserProfile(DEMO_PROFILE);
      return;
    }
    if (!auth || !db) throw new Error("Firebase is not configured");

    const { user: firebaseUser } = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const profile: UserProfile = {
      uid: firebaseUser.uid,
      email: firebaseUser.email!,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, "users", firebaseUser.uid), profile);
    await sendEmailVerification(firebaseUser);
  }

  async function signIn(email: string, password: string) {
    if (isDemoMode) {
      setUser(DEMO_USER);
      setUserProfile(DEMO_PROFILE);
      return;
    }
    if (!auth) throw new Error("Firebase is not configured");
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signOut() {
    if (isDemoMode) {
      setUser(null);
      setUserProfile(null);
      return;
    }
    if (!auth) throw new Error("Firebase is not configured");
    await firebaseSignOut(auth);
  }

  async function resetPassword(email: string) {
    if (isDemoMode) return;
    if (!auth) throw new Error("Firebase is not configured");
    await sendPasswordResetEmail(auth, email);
  }

  async function verifyEmail() {
    if (isDemoMode) return;
    if (user) await sendEmailVerification(user);
  }

  async function updateProfile(data: Partial<UserProfile>) {
    if (isDemoMode) {
      setUserProfile((prev) => (prev ? { ...prev, ...data } : DEMO_PROFILE));
      return;
    }
    if (!user || !db) throw new Error("User is not authenticated");
    await updateDoc(doc(db, "users", user.uid), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    setUserProfile(await fetchUserProfile(user));
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    if (isDemoMode) return;
    if (!user?.email) throw new Error("User is not authenticated");
    const credential = EmailAuthProvider.credential(
      user.email,
      currentPassword,
    );
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  }

  async function deleteAccount() {
    if (isDemoMode) {
      setUser(null);
      setUserProfile(null);
      return;
    }
    if (!user || !db) throw new Error("User is not authenticated");
    try {
      await deleteDoc(doc(db, "users", user.uid));
    } catch (error) {
      console.error("Error deleting Firestore user doc:", error);
    }
    await deleteUser(user);
  }

  async function refreshProfile() {
    if (isDemoMode) return;
    if (user && db) setUserProfile(await fetchUserProfile(user));
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        verifyEmail,
        updateProfile,
        changePassword,
        deleteAccount,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
