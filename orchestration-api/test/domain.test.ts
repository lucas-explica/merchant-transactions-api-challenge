import { describe, expect, it } from 'vitest';
import { buildReceivable } from '../src/domain/receivable.js';
import { parseMoney, percentage, serializeMoney } from '../src/domain/money.js';
import { maskCardNumber, toSafeTransactionInput } from '../src/domain/card.js';

describe('exact money and receivable policy', () => {
  it.each([
    ['0', '0.00'],
    ['0.00', '0.00'],
    ['100', '100.00'],
    ['100.00', '100.00'],
    ['340.50', '340.50'],
  ])('serializes %s', (input, expected) => {
    expect(serializeMoney(parseMoney(input))).toBe(expected);
  });
  it('calculates zero-value receivables without special casing', () => {
    expect(
      buildReceivable(
        parseMoney('0'),
        'credit_card',
        new Date('2026-01-01T10:00:00.000Z'),
      ),
    ).toMatchObject({
      subtotal: '0.00',
      discount: '0.00',
      total: '0.00',
    });
  });
  it('calculates exact fees and half-up fractional cents', () => {
    expect(serializeMoney(percentage(parseMoney('250'), 2n))).toBe('5.00');
    expect(serializeMoney(percentage(parseMoney('250'), 4n))).toBe('10.00');
    expect(serializeMoney(percentage(parseMoney('0.25'), 2n))).toBe('0.01');
    expect(serializeMoney(percentage(1n, 1n))).toBe('0.00');
    expect(serializeMoney(percentage(25n, 2n))).toBe('0.01');
    expect(serializeMoney(percentage(26n, 2n))).toBe('0.01');
  });

  it('preserves the subtotal = discount + total invariant', () => {
    for (const cents of [1n, 25n, 99n, 250n, 10000n, 34050n]) {
      const discount = percentage(cents, 4n);
      expect(cents).toBe(discount + (cents - discount));
    }
  });
  it('applies debit D+0 and paid policy', () => {
    const result = buildReceivable(
      parseMoney('250.00'),
      'debit_card',
      new Date('2026-01-01T10:00:00.000Z'),
    );
    expect(result).toMatchObject({
      status: 'paid',
      create_date: '2026-01-01T10:00:00.000Z',
      discount: '5.00',
      total: '245.00',
    });
  });
  it('applies credit D+30 and monetary discount', () => {
    const result = buildReceivable(
      parseMoney('250.00'),
      'credit_card',
      new Date('2026-01-01T10:00:00.000Z'),
    );
    expect(result).toMatchObject({
      status: 'waiting_funds',
      create_date: '2026-01-31T10:00:00.000Z',
      subtotal: '250.00',
      discount: '10.00',
      total: '240.00',
    });
  });
  it.each([
    ['2026-01-15T10:00:00.000Z', '2026-02-14T10:00:00.000Z'],
    ['2026-12-15T10:00:00.000Z', '2027-01-14T10:00:00.000Z'],
  ])('adds 30 calendar days from %s', (start, expected) => {
    expect(
      buildReceivable(parseMoney('1.00'), 'credit_card', new Date(start))
        .create_date,
    ).toBe(expected);
  });
  it.each(['-1', '-0.01', '1.001', '1e2', 'abc', '01.00'])(
    'rejects invalid money %s',
    (value) => expect(() => parseMoney(value)).toThrow(),
  );
  it.each([
    ['4111111111111234', '1234'],
    ['123456789012', '9012'],
    ['1234567890123456789', '6789'],
  ])('masks valid PAN %s', (pan, expected) => {
    expect(maskCardNumber(pan)).toBe(expected);
  });
  it.each(['', '12345678901', '12345678901234567890', '1234abcd9012'])(
    'rejects malformed PAN %s',
    (pan) => expect(() => maskCardNumber(pan)).toThrow(),
  );
  it('creates a safe transaction representation without PAN or CVV', () => {
    const safe = toSafeTransactionInput({
      value: '0',
      description: 'payment',
      method: 'debit_card',
      cardNumber: '4111111111111234',
      cardHolderName: 'Test Holder',
      cardExpirationDate: '01/26',
      cardCvv: '987',
    });
    const serialized = JSON.stringify(safe);
    expect(serialized).toContain('1234');
    expect(serialized).not.toContain('4111111111111234');
    expect(serialized).not.toContain('987');
    expect(safe).not.toHaveProperty('cardCvv');
  });
});
