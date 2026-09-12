'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { ensureActionAuth } from '@/lib/action-utils';
import { FieldValue } from 'firebase-admin/firestore';

export interface DiscountInfo {
  code: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  minPurchaseAmount?: number;
  appliesTo: 'all' | 'category' | 'product';
  targetIds?: string[];
}

/**
 * Validate a promotional discount code
 */
export async function validateDiscountCode(
  code: string,
  cartSubtotal: number,
  idToken?: string
): Promise<{ success: boolean; discountAmount?: number; discountInfo?: DiscountInfo; error?: string }> {
  if (!code) {
    return { success: false, error: 'Please enter a discount code.' };
  }

  try {
    const formattedCode = code.trim().toUpperCase();
    const discountRef = firestoreDb.collection('discounts').doc(formattedCode);
    const discountSnap = await discountRef.get();

    if (!discountSnap.exists) {
      return { success: false, error: 'Invalid discount code.' };
    }

    const discount = discountSnap.data();

    // 1. Check if active
    if (discount?.isActive === false) {
      return { success: false, error: 'This discount code is no longer active.' };
    }

    // 2. Check validity dates
    const now = new Date();
    const startDate = discount?.startDate?.toDate ? discount.startDate.toDate() : new Date(discount?.startDate);
    const endDate = discount?.endDate?.toDate ? discount.endDate.toDate() : new Date(discount?.endDate);

    if (now < startDate) {
      return { success: false, error: 'This discount code is not active yet.' };
    }
    if (now > endDate) {
      return { success: false, error: 'This discount code has expired.' };
    }

    // 3. Check usage limit
    if (discount?.usageLimit !== undefined && discount.usedCount >= discount.usageLimit) {
      return { success: false, error: 'This discount code has reached its maximum usage limit.' };
    }

    // 4. Verify minimum purchase amount
    const minAmount = discount?.minPurchaseAmount || 0;
    if (cartSubtotal < minAmount) {
      return { 
        success: false, 
        error: `Minimum purchase of $${minAmount.toFixed(2)} required to use this code.` 
      };
    }

    // 5. Calculate discount amount
    let discountAmount = 0;
    if (discount?.type === 'percentage') {
      discountAmount = (cartSubtotal * (discount.value / 100));
    } else if (discount?.type === 'fixed_amount') {
      discountAmount = Math.min(discount.value, cartSubtotal);
    } else if (discount?.type === 'free_shipping') {
      // Handled at shipping calculations level
      discountAmount = 0;
    }

    const discountInfo: DiscountInfo = {
      code: formattedCode,
      type: discount.type,
      value: discount.value,
      minPurchaseAmount: discount.minPurchaseAmount,
      appliesTo: discount.appliesTo,
      targetIds: discount.targetIds,
    };

    return {
      success: true,
      discountAmount: Number(discountAmount.toFixed(2)),
      discountInfo,
    };
  } catch (error: any) {
    console.error('Error validating discount code:', error);
    return { success: false, error: 'Failed to validate discount code.' };
  }
}

/**
 * Admin action to create a new promo discount code
 */
export async function createDiscountCodeAction(
  idToken: string,
  discount: Omit<DiscountCode, 'usedCount'>
) {
  try {
    const decodedToken = await ensureActionAuth(idToken);
    const isStaff = ['admin', 'superadmin'].includes(decodedToken.role);

    if (!isStaff) {
      throw new Error('Unauthorized. Admin privilege required.');
    }

    const codeUpper = discount.code.trim().toUpperCase();
    const discountRef = firestoreDb.collection('discounts').doc(codeUpper);

    const payload = {
      ...discount,
      code: codeUpper,
      usedCount: 0,
      startDate: new Date(discount.startDate),
      endDate: new Date(discount.endDate),
      createdAt: FieldValue.serverTimestamp(),
    };

    await discountRef.set(payload);
    return { success: true, message: `Discount code ${codeUpper} created successfully.` };
  } catch (error: any) {
    console.error('Error creating discount code:', error);
    return { success: false, error: error.message };
  }
}

interface DiscountCode {
  code: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  minPurchaseAmount?: number;
  appliesTo: 'all' | 'category' | 'product';
  targetIds?: string[];
  usageLimit?: number;
  startDate: string | Date;
  endDate: string | Date;
  isActive: boolean;
}
