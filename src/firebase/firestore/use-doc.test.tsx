import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const state = vi.hoisted(() => ({
  isUserLoading: false,
  next: null as null | ((snap: any) => void),
  fail: null as null | ((err: any) => void),
}));

vi.mock('../provider', () => ({ useFirebase: () => ({ isUserLoading: state.isUserLoading }) }));
vi.mock('@/firebase/error-emitter', () => ({ errorEmitter: { emit: vi.fn() } }));
vi.mock('firebase/firestore', () => ({
  onSnapshot: (_ref: unknown, next: (s: any) => void, fail: (e: any) => void) => {
    state.next = next;
    state.fail = fail;
    return () => {};
  },
}));

import { useDoc } from './use-doc';

const ref = { path: 'products/p1', __memo: true } as any;
const initial = { id: 'p1', title: 'Server copy' };
const missing = (fromCache: boolean) => ({ exists: () => false, id: 'p1', data: () => undefined, metadata: { fromCache } });
const present = (title: string) => ({ exists: () => true, id: 'p1', data: () => ({ title }), metadata: { fromCache: false } });

beforeEach(() => {
  state.isUserLoading = false;
  state.next = null;
  state.fail = null;
});

describe('useDoc', () => {
  it('settles with no data when there is no ref (signed out)', async () => {
    const { result } = renderHook(() => useDoc(null));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
  });

  it('clears data when the ref goes away (sign-out clears a favourite)', async () => {
    const { result, rerender } = renderHook(({ r }) => useDoc(r), { initialProps: { r: ref } });
    await waitFor(() => expect(state.next).toBeTruthy());
    act(() => state.next!(present('fav')));
    expect(result.current.data).toMatchObject({ title: 'fav' });
    rerender({ r: null });
    await waitFor(() => expect(result.current.data).toBeNull());
    expect(result.current.isLoading).toBe(false);
  });

  it('keeps initialData on screen while auth starts (no photo flash)', () => {
    state.isUserLoading = true;
    const { result } = renderHook(() => useDoc(ref, { initialData: initial }));
    expect(result.current.data).toEqual(initial);
    expect(result.current.isLoading).toBe(false);
  });

  it('keeps initialData through an empty cache read, but clears once the server confirms it is gone', async () => {
    const { result } = renderHook(() => useDoc(ref, { initialData: initial }));
    await waitFor(() => expect(state.next).toBeTruthy());
    act(() => state.next!(missing(true)));
    expect(result.current.data).toEqual(initial);
    act(() => state.next!(missing(false)));
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('clears initialData on a permission error', async () => {
    const { result } = renderHook(() => useDoc(ref, { initialData: initial }));
    await waitFor(() => expect(state.fail).toBeTruthy());
    act(() => state.fail!({ code: 'permission-denied' }));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeTruthy();
  });
});
