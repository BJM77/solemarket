
import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from './config'; // Client SDK
import type { Product, UserProfile, Donation, SafeUser } from '@/lib/types';
import { processDonation } from '@/ai/flows/process-donation';

export async function createUserProfile(uid: string, data: Partial<UserProfile>) {
  await setDoc(doc(db, 'users', uid), {
    id: uid,
    ...data,
    createdAt: serverTimestamp(),
  }, { merge: true });
}

export async function updateUserProfile(user: SafeUser, data: {
  displayName: string;
  bio?: string;
  storeName?: string;
  storeDescription?: string;
  bannerUrl?: string;
}) {
  if (!user || !auth.currentUser) {
    throw new Error("User not authenticated.");
  }

  // Update Firebase Auth profile
  await updateProfile(auth.currentUser, {
    displayName: data.displayName,
  });

  // Update Firestore profile
  const userDocRef = doc(db, 'users', user.uid);
  await updateDoc(userDocRef, {
    displayName: data.displayName,
    bio: data.bio || '',
    storeName: data.storeName || '',
    storeDescription: data.storeDescription || '',
    bannerUrl: data.bannerUrl || '',
  });
}

export async function deleteProduct(productId: string) {
  if (!productId) throw new Error("Product ID is required.");
  const productRef = doc(db, 'products', productId);
  await deleteDoc(productRef);
}


export async function createDonation(donationData: Omit<Donation, "id" | "createdAt" | "status">, idToken: string) {
  const donationPayload = {
    ...donationData,
    status: "Pending Label" as const,
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, "donations"), donationPayload);

  // Trigger AI Flow
  await processDonation({ donationId: docRef.id, ...donationData, quantity: donationData.quantity.toString(), idToken });

  return docRef.id;
}
