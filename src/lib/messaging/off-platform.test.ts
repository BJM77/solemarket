import { describe, it, expect } from 'vitest';
import { detectOffPlatform } from './off-platform';

const flagged = (t: string) => detectOffPlatform(t).reasons;

describe('detectOffPlatform', () => {
  it('passes normal marketplace chat', () => {
    expect(detectOffPlatform('Hi, is this still available in US 10? Can you do $250?').flagged).toBe(false);
    expect(detectOffPlatform('Ships tomorrow, tracking via the order page').flagged).toBe(false);
    expect(detectOffPlatform('See benched.au/product/abc for the box photos').flagged).toBe(false);
  });
  it('detects AU phone numbers incl. spaced/obfuscated', () => {
    expect(flagged('call 0412 345 678')).toContain('phone');
    expect(flagged('+61 412-345-678')).toContain('phone');
    expect(flagged('zero four one two three four five six seven eight')).toContain('phone');
  });
  it('detects emails incl. "at"/"dot" obfuscation', () => {
    expect(flagged('email me john@example.com')).toContain('email');
    expect(flagged('john at gmail dot com')).toContain('email');
  });
  it('detects payment and chat apps', () => {
    expect(flagged('just send it via PayPal F&F')).toContain('external_payment');
    expect(flagged('my payid is fine')).toContain('payid');
    expect(flagged('BSB 062-000 account 1234')).toContain('bank_details');
    expect(flagged('hit me up on WhatsApp')).toContain('external_chat');
    expect(flagged('check my insta @kickz_au')).toContain('social_handle');
  });
  it('masks contact details', () => {
    expect(detectOffPlatform('0412345678 or a@b.co').masked).toBe('[number hidden] or [email hidden]');
  });
});
