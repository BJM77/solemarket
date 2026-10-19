import { describe, it, expect } from 'vitest';
import { schemaItemCondition } from './item-condition';

const NEW = 'https://schema.org/NewCondition';
const USED = 'https://schema.org/UsedCondition';

describe('schemaItemCondition', () => {
  it.each([
    ['New', NEW], ['Brand New', NEW], ['New with tags', NEW], ['New (no box)', NEW], ['Deadstock', NEW], ['Sealed', NEW],
    ['Used', USED], ['Used - Like New', USED], ['Used - Good', USED], ['Near Mint', USED], ['Mint', USED], ['Raw', USED], ['Excellent', USED],
  ])('%s -> %s', (input, expected) => expect(schemaItemCondition(input)).toBe(expected));
  it('omits unknown/empty', () => expect(schemaItemCondition('')).toBeUndefined());
  it('refurbished', () => expect(schemaItemCondition('Refurbished')).toBe('https://schema.org/RefurbishedCondition'));
});
