
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

export async function createUserProfile(uid: string, data: Partial<UserProfile> & { referralCode?: string }) {
  const isFounder = data.referralCode === 'FOUNDER' || data.referralCode === 'Karate22';

  const profileData: any = {
    id: uid,
    ...data,
    isVerified: false,
    verificationStatus: 'none',
    createdAt: serverTimestamp(),
  };

  if (isFounder) {
    profileData.isFounder = true;
    profileData.feeDiscount = 100; // 100% discount
    profileData.feeDiscountExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days from now

    // Auto-approve selling for founders if they selected seller account
    if (data.accountType === 'seller') {
      profileData.canSell = true;
      profileData.sellerStatus = 'approved';
    }
  }

  // Clean up referral code from stored profile if desired, or keep it for tracking
  // We'll keep it as 'referredBy' potentially, but here just using it for logic

  await setDoc(doc(db, 'users', uid), profileData, { merge: true });
}

export async function updateUserProfile(user: SafeUser, data: {
  displayName: string;
  bio?: string;
  storeName?: string;
  storeDescription?: string;
  bannerUrl?: string;
  shopSlug?: string;
  paypalMeLink?: string;
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
    shopSlug: data.shopSlug || '',
    paypalMeLink: data.paypalMeLink || '',
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
