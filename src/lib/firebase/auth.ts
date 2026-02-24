
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  signOut,
  updateProfile,
  getIdToken,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "./config";
import { createUserProfile } from "./client-ops";

interface SignUpOptions {
  email: string;
  password: string;
  displayName: string;
  accountType: 'buyer' | 'seller';
  storeName?: string;
  storeDescription?: string;
  referralCode?: string;
}

export async function signUpWithEmail(options: SignUpOptions) {
  const { email, password, displayName, accountType, storeName, storeDescription, referralCode } = options;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName });

    // Prepare profile data
    const profileData: any = {
      email: user.email,
      displayName: user.displayName,
      accountType: accountType,
      referralCode: referralCode, // Pass to profile
    };

    if (accountType === 'seller') {
      profileData.storeName = storeName;
      profileData.storeDescription = storeDescription;
    }

    await createUserProfile(user.uid, profileData);

    const safeUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    };

    return { user: safeUser, error: null };
  } catch (error: any) {
    return { user: null, error: { code: error.code, message: error.message } };
  }
}

export async function signInWithEmail(email: string, password: string) {
  try {
    await setPersistence(auth, browserLocalPersistence);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const safeUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };

    return { user: safeUser, error: null };
  } catch (error: any) {
    return { user: null, error: { code: error.code, message: error.message } };
  }
}

export async function signOutUser() {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getCurrentUserIdToken(): Promise<string | null> {
  if (!auth.currentUser) {
    return null;
  }
  // Force refresh to ensure the token is valid for server-side verification
  return await getIdToken(auth.currentUser, true);
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if it's a new user or update profile
    const profileData = {
      email: user.email || undefined,
      displayName: user.displayName || undefined,
      photoURL: user.photoURL || undefined,
      lastLogin: new Date(),
    };

    await createUserProfile(user.uid, profileData);

    const safeUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };

    return { user: safeUser, error: null };
  } catch (error: any) {
    console.error("Google sign-in error:", error);
    return { user: null, error: { code: error.code, message: error.message } };
  }
}
