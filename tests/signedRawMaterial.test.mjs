import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateArithmeticExpression } from '../services/arithmeticExpression.js';
import {
  calculateMaterialBalance,
  calculateProductionWeight,
  calculateRawMaterialNetWeight,
  calculateRawTotal,
  isNegativeRawMaterialEntry,
  normalizeRawMaterialEntry,
} from '../services/statementCalculator.js';
import { calculateItemAmount, calculateTotals } from '../services/invoiceCalculator.js';
import { formatDecimal } from '../utils/decimal.js';
import { normalizeLegacyRawMaterialEntry } from '../utils/legacyRawMaterial.js';
import { encodeBytesToBase64 } from '../utils/encodeBase64.js';
import { processInBatches } from '../utils/processInBatches.js';

test('calculates signed raw-material totals and statement NEW', () => {
  const entries = [
    { material_name: 'PP RANDOM', number_of_bags: 20, bag_weight: 25, total_weight: 500 },
    { material_name: 'Procces', number_of_bags: 10, bag_weight: 25, total_weight: 250 },
    { material_name: 'Cc', number_of_bags: 100, bag_weight: 25, total_weight: 2500 },
    { material_name: 'Cc return', number_of_bags: -10, bag_weight: 25, total_weight: 250 },
  ].map(normalizeRawMaterialEntry);

  assert.equal(calculateRawMaterialNetWeight(entries), 3000);
  const balance = calculateMaterialBalance(250, calculateRawMaterialNetWeight(entries), 0);
  assert.equal(balance.newWeight, 3000);
  assert.equal(balance.totalWeight, 3250);
  assert.deepEqual(entries.map(entry => entry.total_weight), [500, 250, 2500, -250]);

  const snapshot = JSON.parse(JSON.stringify({ rawMaterials: entries, balance }));
  assert.equal(snapshot.rawMaterials[3].number_of_bags, -10);
  assert.equal(snapshot.rawMaterials[3].total_weight, -250);
  assert.equal(calculateRawMaterialNetWeight(snapshot.rawMaterials), 3000);
});

test('preserves negative bag count through calculated total and PDF row classification', () => {
  assert.equal(calculateRawTotal(25, -20), -500);
  assert.equal(calculateRawTotal(25, -10), -250);
  assert.equal(calculateRawMaterialNetWeight([{ bag_weight: 25, number_of_bags: -20, total_weight: 500 }]), -500);
  assert.equal(isNegativeRawMaterialEntry({ bag_weight: 25, number_of_bags: -10, total_weight: 250 }), true);
  assert.equal(isNegativeRawMaterialEntry({ bag_weight: 25, number_of_bags: 10, total_weight: 250 }), false);
});

test('evaluates supported arithmetic expressions without eval', () => {
  for (const [expression, expected] of [
    ['20-10', 10],
    ['10+5', 15],
    ['25*2', 50],
    ['100/4', 25],
    ['-(20)', -20],
  ]) {
    assert.equal(evaluateArithmeticExpression(expression), expected);
  }
  assert.throws(() => evaluateArithmeticExpression('1/0'), /Division by zero/);
  assert.throws(() => evaluateArithmeticExpression('globalThis.process.exit()'));
});

test('preserves decimal precision through production and invoice totals', () => {
  assert.equal(calculateProductionWeight(5000, 1.2756), 6.378);
  assert.equal(calculateItemAmount('0.1', '0.2'), 0.02);
  assert.equal(evaluateArithmeticExpression('0.1+0.2'), 0.3);

  const totals = calculateTotals([
    { amount: 0.1 },
    { amount: 0.2 },
  ], 0, '2.5', 0, 0);
  assert.equal(formatDecimal(totals.subtotal), '0.3');
  assert.equal(formatDecimal(totals.sgstAmount), '0.0075');
  assert.equal(formatDecimal(totals.grandTotal), '0.3075');
});

test('migrates legacy RETURN rows to canonical signed quantities', () => {
  assert.deepEqual(normalizeLegacyRawMaterialEntry({
    number_of_bags: 10,
    bag_weight: 25,
    total_weight: 250,
    is_return: 1,
  }), {
    number_of_bags: -10,
    bag_weight: 25,
    total_weight: -250,
  });
  assert.deepEqual(normalizeRawMaterialEntry({
    number_of_bags: -10,
    bag_weight: 25,
    total_weight: 250,
  }).total_weight, -250);
});

test('encodes large PDF byte arrays in yielding base64 chunks', async () => {
  const bytes = Uint8Array.from({ length: 150_123 }, (_, index) => index % 251);
  const progress = [];
  const encoded = await encodeBytesToBase64(bytes, value => progress.push(value));

  assert.equal(encoded, Buffer.from(bytes).toString('base64'));
  assert.equal(progress.length, 4);
  assert.deepEqual(progress.at(-1), { completed: bytes.length, total: bytes.length });
});

test('processes large PDF tables in UI-yielding batches', async () => {
  const rows = Array.from({ length: 125 }, (_, index) => index);
  const processed = [];
  const progress = [];
  let timerRan = false;
  setTimeout(() => { timerRan = true; }, 0);

  await processInBatches(rows, row => processed.push(row), value => progress.push(value));

  assert.equal(processed.length, rows.length);
  assert.equal(timerRan, true);
  assert.deepEqual(progress, [
    { completed: 50, total: 125 },
    { completed: 100, total: 125 },
  ]);
});
