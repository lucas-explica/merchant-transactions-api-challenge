import { Type, type Static } from '@sinclair/typebox';

export const PAN_PATTERN = '^\\d{12,19}$';
export const RESPONSE_MONEY_PATTERN = '^(?:0|[1-9]\\d*)\\.\\d{2}$';
export const ISO_UTC_TIMESTAMP_PATTERN =
  '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$';

export const TransactionRequest = Type.Object(
  {
    value: Type.String({
      pattern: '^(?:0|[1-9]\\d*)(?:\\.\\d{1,2})?$',
    }),
    description: Type.String({ minLength: 1 }),
    method: Type.Union([
      Type.Literal('debit_card'),
      Type.Literal('credit_card'),
    ]),
    cardNumber: Type.String({ pattern: PAN_PATTERN }),
    cardHolderName: Type.String({ minLength: 1 }),
    cardExpirationDate: Type.String({ pattern: '^(0[1-9]|1[0-2])/\\d{2}$' }),
    cardCvv: Type.String({ pattern: '^\\d{3}$' }),
  },
  { additionalProperties: false },
);
export type TransactionRequestType = Static<typeof TransactionRequest>;

export const TransactionResponse = Type.Object(
  {
    id: Type.String(),
    value: Type.String({ pattern: RESPONSE_MONEY_PATTERN }),
    description: Type.String(),
    method: Type.Union([
      Type.Literal('debit_card'),
      Type.Literal('credit_card'),
    ]),
    cardNumber: Type.String({ pattern: '^\\d{4}$' }),
    cardHolderName: Type.String(),
    cardExpirationDate: Type.String(),
  },
  { additionalProperties: false },
);
export const ReceivableResponse = Type.Object(
  {
    id: Type.String(),
    transaction_id: Type.String(),
    status: Type.Union([Type.Literal('paid'), Type.Literal('waiting_funds')]),
    create_date: Type.String({ pattern: ISO_UTC_TIMESTAMP_PATTERN }),
    subtotal: Type.String({ pattern: RESPONSE_MONEY_PATTERN }),
    discount: Type.String({ pattern: RESPONSE_MONEY_PATTERN }),
    total: Type.String({ pattern: RESPONSE_MONEY_PATTERN }),
  },
  { additionalProperties: false },
);
export const CreateTransactionResponse = Type.Object(
  {
    transaction: TransactionResponse,
    receivable: ReceivableResponse,
  },
  { additionalProperties: false },
);
