"use client";

import { 
  createUserWithEmailAndPassword as fbCreateUserWithEmailAndPassword, 
  signInWithEmailAndPassword as fbSignInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  AuthError
} from 'firebase/auth';
import { auth } from './firebase';

export const createUserWithEmailAndPassword = async (email: string, pass: string) => {
  try {
    if (!auth) throw new Error("Auth not initialized");
    const userCredential = await fbCreateUserWithEmailAndPassword(auth, email, pass);
    return { user: userCredential.user, error: null };
  } catch (e) {
    return { user: null, error: e as AuthError };
  }
};

export const signInWithEmailAndPassword = async (email: string, pass: string) => {
  try {
    if (!auth) throw new Error("Auth not initialized");
    const userCredential = await fbSignInWithEmailAndPassword(auth, email, pass);
    return { user: userCredential.user, error: null };
  } catch (e) {
    return { user: null, error: e as AuthError };
  }
};

export const signInWithGoogle = async () => {
  if (!auth) throw new Error("Auth not initialized");
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return { user: result.user, error: null };
  } catch (e) {
    return { user: null, error: e as AuthError };
  }
}