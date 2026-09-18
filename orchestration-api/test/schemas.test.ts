import { Value } from '@sinclair/typebox/value';
import { describe, expect, it } from 'vitest';
import {
  CreateTransactionResponse,
  ReceivableResponse,
  TransactionRequest,
  TransactionResponse,
} from '../src/http/schemas.js';

const validRequest = {
  value: '0',
  description: 'payment',
  method: 'debit_card',
  cardNumber: '4111111111111234',
  cardHolderName: 'Test Holder',
  cardExpirationDate: '01/26',
  cardCvv: '987',
};

describe('transaction request schema', () => {
  it.each(['0', '0.00', '0.01', '100', '100.00', '340.50'])(
    'accepts money %s',
    (value) =>
      expect(Value.Check(TransactionRequest, { ...validRequest, value })).toBe(
        true,
      ),
  );
  it.each([
    '-1',
    '-0.01',
    '1.001',
    '1e2',
    '1.',
    '.50',
    ' 10.00 ',
    '+10.00',
    '001.20',
  ])('rejects money %s', (value) =>
    expect(Value.Check(TransactionRequest, { ...validRequest, value })).toBe(
      false,
    ),
  );
  it.each([
    'value',
    'description',
    'method',
    'cardNumber',
    'cardHolderName',
    'cardExpirationDate',
    'cardCvv',
  ])('requires %s', (field) => {
    const request = { ...validRequest } as Record<string, unknown>;
    delete request[field];
    expect(Value.Check(TransactionRequest, request)).toBe(false);
  });
  it('rejects additional properties', () =>
    expect(
      Value.Check(TransactionRequest, { ...validRequest, unexpected: 'value' }),
    ).toBe(false));
  it.each([
    ['debit_card', true],
    ['credit_card', true],
    ['pix', false],
  ])('validates method %s', (method, expected) =>
    expect(Value.Check(TransactionRequest, { ...validRequest, method })).toBe(
      expected,
    ),
  );
  it.each([
    ['123456789012', true],
    ['1234567890123456789', true],
    ['12345678901', false],
    ['12345678901234567890', false],
    ['12345678901a', false],
  ])('validates PAN %s', (cardNumber, expected) =>
    expect(
      Value.Check(TransactionRequest, { ...validRequest, cardNumber }),
    ).toBe(expected),
  );
  it.each([
    ['01/26', true],
    ['12/99', true],
    ['00/26', false],
    ['13/26', false],
    ['0126', false],
  ])('validates expiration %s', (cardExpirationDate, expected) =>
    expect(
      Value.Check(TransactionRequest, { ...validRequest, cardExpirationDate }),
    ).toBe(expected),
  );
  it.each([
    ['987', true],
    ['98', false],
    ['9876', false],
    ['98a', false],
  ])('validates CVV %s', (cardCvv, expected) =>
    expect(Value.Check(TransactionRequest, { ...validRequest, cardCvv })).toBe(
      expected,
    ),
  );
});

const validTransactionResponse = {
  id: '4',
  value: '100.00',
  description: 'payment',
  method: 'debit_card',
  cardNumber: '1234',
  cardHolderName: 'Test Holder',
  cardExpirationDate: '01/26',
};
const validReceivableResponse = {
  id: '5',
  transaction_id: '4',
  status: 'paid',
  create_date: '2026-01-01T10:00:00.000Z',
  subtotal: '100.00',
  discount: '2.00',
  total: '98.00',
};

describe('final response schemas', () => {
  it('rejects unexpected properties in each final response schema', () => {
    const response = {
      transaction: validTransactionResponse,
      receivable: validReceivableResponse,
    };
    expect(
      Value.Check(TransactionResponse, {
        ...validTransactionResponse,
        unexpected: 'value',
      }),
    ).toBe(false);
    expect(
      Value.Check(ReceivableResponse, {
        ...validReceivableResponse,
        unexpected: 'value',
      }),
    ).toBe(false);
    expect(
      Value.Check(CreateTransactionResponse, {
        ...response,
        unexpected: 'value',
      }),
    ).toBe(false);
  });

  it.each(['subtotal', 'discount', 'total'] as const)(
    'rejects non-canonical receivable %s',
    (field) =>
      expect(
        Value.Check(ReceivableResponse, {
          ...validReceivableResponse,
          [field]: '10.0',
        }),
      ).toBe(false),
  );

  it('validates a complete transaction response and closes its contract', () => {
    expect(Value.Check(TransactionResponse, validTransactionResponse)).toBe(
      true,
    );
    expect(
      Value.Check(TransactionResponse, {
        ...validTransactionResponse,
        id: undefined,
      }),
    ).toBe(false);
    expect(
      Value.Check(TransactionResponse, {
        ...validTransactionResponse,
        value: '100',
      }),
    ).toBe(false);
    expect(
      Value.Check(TransactionResponse, {
        ...validTransactionResponse,
        cardNumber: '123',
      }),
    ).toBe(false);
    expect(
      Value.Check(TransactionResponse, {
        ...validTransactionResponse,
        cardCvv: '987',
      }),
    ).toBe(false);
    expect(
      Value.Check(TransactionResponse, {
        ...validTransactionResponse,
        unexpected: 'value',
      }),
    ).toBe(false);
  });

  it('validates canonical receivable money and settlement timestamp', () => {
    expect(Value.Check(ReceivableResponse, validReceivableResponse)).toBe(true);
    expect(
      Value.Check(ReceivableResponse, {
        ...validReceivableResponse,
        id: undefined,
      }),
    ).toBe(false);
    expect(
      Value.Check(ReceivableResponse, {
        ...validReceivableResponse,
        transaction_id: undefined,
      }),
    ).toBe(false);
    for (const field of ['subtotal', 'discount', 'total'] as const) {
      expect(
        Value.Check(ReceivableResponse, {
          ...validReceivableResponse,
          [field]: '10.0',
        }),
      ).toBe(false);
    }
    expect(
      Value.Check(ReceivableResponse, {
        ...validReceivableResponse,
        unexpected: 'value',
      }),
    ).toBe(false);
    expect(
      Value.Check(ReceivableResponse, {
        ...validReceivableResponse,
        create_date: 'tomorrow',
      }),
    ).toBe(false);
    expect(
      Value.Check(ReceivableResponse, {
        ...validReceivableResponse,
        create_date: '15/03/2020',
      }),
    ).toBe(false);
  });

  it('validates the composed transaction and receivable response', () => {
    const response = {
      transaction: validTransactionResponse,
      receivable: validReceivableResponse,
    };
    expect(Value.Check(CreateTransactionResponse, response)).toBe(true);
    expect(
      Value.Check(CreateTransactionResponse, {
        ...response,
        transaction: { ...validTransactionResponse, value: '100' },
      }),
    ).toBe(false);
    expect(
      Value.Check(CreateTransactionResponse, {
        ...response,
        receivable: { ...validReceivableResponse, total: '98' },
      }),
    ).toBe(false);
    expect(
      Value.Check(CreateTransactionResponse, {
        ...response,
        unexpected: 'value',
      }),
    ).toBe(false);
  });
});
