const roundWeight = value => Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;

export const calculateRawTotal = (bagWeight, bags) =>
  roundWeight(Number(bagWeight) * Number(bags));

export const calculateProductionWeight = (quantity, weightPerPiece) =>
  roundWeight(Number(quantity) * Number(weightPerPiece));

export const calculateMaterialBalance = (oldWeight, newWeight, usedWeight) => {
  const old = roundWeight(Number(oldWeight));
  const added = roundWeight(Number(newWeight));
  const used = roundWeight(Number(usedWeight));
  const total = roundWeight(old + added);
  const rejection = roundWeight(used * 0.01);
  return {
    oldWeight: old,
    newWeight: added,
    totalWeight: total,
    usedWeight: used,
    rejectionWeight: rejection,
    balanceWeight: roundWeight(total - used - rejection),
  };
};

export const formatWeight = value => Number(value || 0).toFixed(3);

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
