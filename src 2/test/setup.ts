import '@testing-library/jest-dom';
import { vi } from 'vitest';

// 1. Mock Firebase Admin (Server-side)
vi.mock('@/lib/firebase/admin', () => ({
  firestoreDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      })),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn(),
    })),
  },
}));

// 2. Mock Firebase Client Auth
vi.mock('@/lib/firebase/auth', () => ({
  getCurrentUserIdToken: vi.fn(() => Promise.resolve('mock-token')),
}));

// 3. Mock Stripe
vi.mock('stripe', () => {
    return {
        default: class mockStripe {
            customers = { create: vi.fn() };
            setupIntents = { create: vi.fn() };
            checkout = { sessions: { create: vi.fn() } };
            webhooks = { constructEvent: vi.fn() };
        }
    };
});

// 4. Mock Global Config/Env
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
