import { percentage, serializeMoney, type Cents } from './money.js';

export type PaymentMethod = 'debit_card' | 'credit_card';
export type ReceivablePolicy = {
  status: 'paid' | 'waiting_funds';
  feeRate: bigint;
  settlementDays: number;
};

export function policyFor(method: PaymentMethod): ReceivablePolicy {
  return method === 'debit_card'
    ? { status: 'paid', feeRate: 2n, settlementDays: 0 }
    : { status: 'waiting_funds', feeRate: 4n, settlementDays: 30 };
}

export function buildReceivable(
  value: Cents,
  method: PaymentMethod,
  now: Date,
) {
  const policy = policyFor(method);
  const discount = percentage(value, policy.feeRate);
  const settlement = new Date(now);
  settlement.setUTCDate(settlement.getUTCDate() + policy.settlementDays);
  return {
    status: policy.status,
    create_date: settlement.toISOString(),
    subtotal: serializeMoney(value),
    discount: serializeMoney(discount),
    total: serializeMoney(value - discount),
  };
}
