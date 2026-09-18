import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const orchestrationUrl =
  process.env.ORCHESTRATION_URL ?? 'http://localhost:3001';
const numeratorUrl = process.env.NUMERATOR_URL ?? 'http://localhost:3000';
const jsonServerUrl = process.env.JSON_SERVER_URL ?? 'http://localhost:8080';
const fixture = resolve(process.cwd(), '../config/db.json');
const original = await readFile(fixture);

async function request(url, init) {
  const response = await fetch(url, init);
  if (!response.ok)
    throw new Error(`${init?.method ?? 'GET'} ${url}: ${response.status}`);
  return response.json();
}

try {
  await request(`${numeratorUrl}/numerator`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ value: 3 }),
  });
  const beforeTransactions = await request(`${jsonServerUrl}/transactions`);
  const beforeReceivables = await request(`${jsonServerUrl}/receivables`);
  const settledResponses = await Promise.allSettled(
    Array.from({ length: 20 }, () =>
      fetch(`${orchestrationUrl}/transactions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          value: '250.00',
          description: 'integration',
          method: 'credit_card',
          cardNumber: '4111111111111111',
          cardHolderName: 'Integration',
          cardExpirationDate: '12/30',
          cardCvv: '123',
        }),
      }),
    ),
  );
  const rejected = settledResponses.find(
    (result) => result.status === 'rejected',
  );
  if (rejected) throw rejected.reason;
  const responses = settledResponses.map((result) => result.value);
  if (responses.some((response) => response.status !== 201))
    throw new Error(
      `Expected 20 HTTP 201 responses, got ${responses.map((response) => response.status).join(',')}`,
    );
  const bodies = await Promise.all(
    responses.map((response) => response.json()),
  );
  const transactions = await request(`${jsonServerUrl}/transactions`);
  const receivables = await request(`${jsonServerUrl}/receivables`);
  const oldTransactionIds = new Set(beforeTransactions.map((item) => item.id));
  const oldReceivableIds = new Set(beforeReceivables.map((item) => item.id));
  const newTransactions = transactions.filter(
    (item) => !oldTransactionIds.has(item.id),
  );
  const newReceivables = receivables.filter(
    (item) => !oldReceivableIds.has(item.id),
  );
  const transactionIds = bodies.map(({ transaction }) => transaction.id);
  const receivableIds = bodies.map(({ receivable }) => receivable.id);
  const unique = (values) => new Set(values).size;
  if (
    newTransactions.length !== 20 ||
    newReceivables.length !== 20 ||
    unique(transactionIds) !== 20 ||
    unique(receivableIds) !== 20 ||
    unique([...transactionIds, ...receivableIds]) !== 40
  )
    throw new Error('N=20 uniqueness/count assertion failed');
  if (
    newReceivables.some(
      (item) => !transactionIds.includes(item.transaction_id),
    ) ||
    newTransactions.some(
      (item) =>
        !receivableIds.some(
          (id) =>
            newReceivables.find((r) => r.id === id)?.transaction_id === item.id,
        ),
    )
  )
    throw new Error('link/orphan assertion failed');
  for (const body of bodies) {
    if (
      body.transaction.cardNumber !== '1111' ||
      'cardCvv' in body.transaction ||
      JSON.stringify(body).includes('4111111111111111')
    )
      throw new Error('public card safety assertion failed');
    if (
      body.receivable.status !== 'waiting_funds' ||
      body.receivable.subtotal !== '250.00' ||
      body.receivable.discount !== '10.00' ||
      body.receivable.total !== '240.00'
    )
      throw new Error('business assertion failed');
  }
  for (const transaction of newTransactions) {
    if (
      transaction.cardNumber !== '1111' ||
      JSON.stringify(transaction).includes('4111111111111111')
    )
      throw new Error('persisted transaction card safety assertion failed');
  }
  for (const receivable of newReceivables) {
    if (
      receivable.status !== 'waiting_funds' ||
      receivable.subtotal !== '250.00' ||
      receivable.discount !== '10.00' ||
      receivable.total !== '240.00' ||
      !transactionIds.includes(receivable.transaction_id)
    )
      throw new Error('persisted receivable business assertion failed');
  }
  const numerator = await request(`${numeratorUrl}/numerator`);
  if (numerator.numerator !== 43)
    throw new Error(`Expected Numerator 43, got ${numerator.numerator}`);
  console.log(
    JSON.stringify({
      status: 'PASS',
      responses: 20,
      transactionUnique: unique(transactionIds),
      receivableUnique: unique(receivableIds),
      combinedUnique: unique([...transactionIds, ...receivableIds]),
      numerator: numerator.numerator,
      orphanTransactions: 0,
      orphanReceivables: 0,
    }),
  );
} finally {
  await writeFile(fixture, original);
}
