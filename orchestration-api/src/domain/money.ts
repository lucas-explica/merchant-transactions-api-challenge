export type Cents = bigint;

export function parseMoney(value: string): Cents {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)) {
    throw new Error('Invalid monetary value');
  }
  const [whole = '0', fraction = ''] = value.split('.');
  const cents = BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2));
  return cents;
}

export function serializeMoney(cents: Cents): string {
  if (cents < 0n) throw new Error('Money cannot be negative');
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
}

export function percentage(cents: Cents, rate: bigint): Cents {
  const numerator = cents * rate;
  return (numerator + 50n) / 100n;
}
