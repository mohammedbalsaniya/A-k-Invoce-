import { Decimal, decimal, decimalToNumber, formatDecimal } from '../utils/decimal.js';

export const calculateRawTotal = (bagWeight, bags) =>
  decimalToNumber(decimal(bagWeight).times(decimal(bags)));

export const normalizeRawMaterialEntry = entry => ({
  ...entry,
  total_weight: calculateRawTotal(entry.bag_weight, entry.number_of_bags),
});

export const isNegativeRawMaterialEntry = entry => {
  const normalized = normalizeRawMaterialEntry(entry);
  return decimal(normalized.number_of_bags).isNegative() || decimal(normalized.total_weight).isNegative();
};

export const calculateProductionWeight = (quantity, weightPerPiece) =>
  decimalToNumber(decimal(quantity).times(decimal(weightPerPiece)).div(1000));

export const calculateRawMaterialNetWeight = entries => {
  const total = (entries || []).reduce(
    (sum, entry) => sum.plus(decimal(normalizeRawMaterialEntry(entry).total_weight)),
    new Decimal(0)
  );
  return decimalToNumber(total);
};

export const calculateMaterialBalance = (oldWeight, newWeight, usedWeight) => {
  const old = decimal(oldWeight);
  const added = decimal(newWeight);
  const used = decimal(usedWeight);
  const total = old.plus(added);
  const rejection = used.times('0.01');
  return {
    oldWeight: decimalToNumber(old),
    newWeight: decimalToNumber(added),
    totalWeight: decimalToNumber(total),
    usedWeight: decimalToNumber(used),
    rejectionWeight: decimalToNumber(rejection),
    balanceWeight: decimalToNumber(total.minus(used).minus(rejection)),
  };
};

export const formatWeight = formatDecimal;

export const sanitizeFilename = value =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'Document';

export const formatIsoDate = value => {
  if (!value) return '';
  const date = String(value).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : date;
};

export const isValidIsoDate = value => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!match) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() + 1 === Number(match[2]) &&
    date.getUTCDate() === Number(match[3]);
};
