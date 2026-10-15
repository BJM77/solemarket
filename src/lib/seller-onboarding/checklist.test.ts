import { describe, it, expect } from 'vitest';
import { buildOnboardingChecklist, onboardingProgress } from './checklist';

describe('seller onboarding checklist', () => {
  it('starts empty and points to the first step', () => {
    const p = onboardingProgress(buildOnboardingChecklist(null, 0));
    expect(p.done).toBe(0);
    expect(p.total).toBe(7);
    expect(p.next?.id).toBe('account');
  });
  it('counts completed steps including the PayID step', () => {
    const steps = buildOnboardingChecklist({
      accountType: 'seller', displayName: 'Ben', storeName: 'Benched', photoURL: 'x', phoneNumber: '04', location: 'Perth',
      agreementAccepted: true, sellerStatus: 'approved', payIdReady: true,
    }, 3);
    const p = onboardingProgress(steps);
    expect(p).toMatchObject({ done: 7, total: 7, percent: 100 });
    expect(p.next).toBeUndefined();
    expect(steps.find((s) => s.id === 'payouts')?.done).toBe(true);
  });
});
