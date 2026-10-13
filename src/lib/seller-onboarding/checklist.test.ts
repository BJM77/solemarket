import { describe, it, expect } from 'vitest';
import { buildOnboardingChecklist, onboardingProgress } from './checklist';

describe('seller onboarding checklist', () => {
  it('starts empty and points to the first step', () => {
    const p = onboardingProgress(buildOnboardingChecklist(null, 0));
    expect(p.done).toBe(0);
    expect(p.total).toBe(6);
    expect(p.next?.id).toBe('account');
  });
  it('counts completed steps and ignores coming-soon payouts', () => {
    const steps = buildOnboardingChecklist({
      accountType: 'seller', displayName: 'Ben', storeName: 'Benched', photoURL: 'x', phoneNumber: '04', location: 'Perth',
      agreementAccepted: true, sellerStatus: 'approved',
    }, 3);
    const p = onboardingProgress(steps);
    expect(p).toMatchObject({ done: 6, total: 6, percent: 100 });
    expect(p.next).toBeUndefined();
    expect(steps.find((s) => s.id === 'payouts')?.comingSoon).toBe(true);
  });
});
