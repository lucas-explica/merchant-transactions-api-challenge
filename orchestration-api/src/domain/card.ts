import { PAN_PATTERN, type TransactionRequestType } from '../http/schemas.js';

const panPattern = new RegExp(PAN_PATTERN);

export type SafeTransactionInput = Omit<
  TransactionRequestType,
  'cardNumber' | 'cardCvv'
> & { cardNumber: string };

export function maskCardNumber(fullPan: string): string {
  if (!panPattern.test(fullPan)) {
    throw new Error('Invalid card number');
  }
  return fullPan.slice(-4);
}

export function toSafeTransactionInput(
  input: TransactionRequestType,
): SafeTransactionInput {
  return {
    value: input.value,
    description: input.description,
    method: input.method,
    cardNumber: maskCardNumber(input.cardNumber),
    cardHolderName: input.cardHolderName,
    cardExpirationDate: input.cardExpirationDate,
  };
}
