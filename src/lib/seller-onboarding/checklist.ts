/**
 * Seller onboarding checklist (UX only - no payment/KYC logic here).
 * Payouts = the seller's PayID (buyers pay sellers directly). It doesn't block listing,
 * but without it buyers can only pay in cash at a Perth pickup.
 */
export interface OnboardingProfile {
  displayName?: string;
  photoURL?: string;
  storeName?: string;
  bio?: string;
  phoneNumber?: string;
  location?: string;
  accountType?: string;
  role?: string;
  sellerStatus?: string;
  agreementAccepted?: boolean;
  emailVerified?: boolean;
  /** Set server-side when the seller saves a PayID (value itself is private). */
  payIdReady?: boolean;
}

export interface OnboardingStep {
  id: 'account' | 'profile' | 'contact' | 'agreement' | 'approval' | 'first_listing' | 'payouts';
  title: string;
  description: string;
  href: string;
  done: boolean;
  /** Not yet available (payments phase); shown but not counted. */
  comingSoon?: boolean;
}

export function buildOnboardingChecklist(p: OnboardingProfile | null | undefined, activeListings: number): OnboardingStep[] {
  const u = p || {};
  const isSeller = u.accountType === 'seller' || u.role === 'seller' || u.role === 'admin' || u.role === 'superadmin';
  return [
    { id: 'account', title: 'Create a seller account', description: 'Switch your account type to seller.', href: '/complete-profile', done: isSeller },
    { id: 'profile', title: 'Set up your store profile', description: 'Store name, photo and a short bio build buyer trust.', href: '/profile', done: !!(u.displayName && (u.storeName || u.bio) && u.photoURL) },
    { id: 'contact', title: 'Add phone & location', description: 'Used for order updates and shipping estimates. Never shown publicly.', href: '/complete-profile', done: !!(u.phoneNumber && u.location) },
    { id: 'agreement', title: 'Accept the seller agreement', description: 'Our rules on authenticity, shipping times and prohibited items.', href: '/seller/agreement', done: !!u.agreementAccepted },
    { id: 'approval', title: 'Get approved', description: u.sellerStatus === 'rejected' ? 'Your application needs changes - contact support.' : 'We review new sellers within 1 business day.', href: '/help', done: u.sellerStatus === 'approved' || u.role === 'admin' || u.role === 'superadmin' },
    { id: 'first_listing', title: 'List your first item', description: 'Use the guided listing flow - about 2 minutes from your phone.', href: '/sell/wizard', done: activeListings > 0 },
    { id: 'payouts', title: 'Add your PayID', description: 'Buyers pay you directly by PayID. Without one, buyers can only pay cash at a Perth pickup.', href: '/sell/payouts', done: !!u.payIdReady },
  ];
}

export function onboardingProgress(steps: OnboardingStep[]) {
  const counted = steps.filter((s) => !s.comingSoon);
  const done = counted.filter((s) => s.done).length;
  return { done, total: counted.length, percent: Math.round((done / Math.max(counted.length, 1)) * 100), next: counted.find((s) => !s.done) };
}
