import { calculateRawTotal } from '../services/statementCalculator.js';

export const normalizeLegacyRawMaterialEntry = entry => {
  const { is_return: isReturn, ...rawEntry } = entry;
  const numberOfBags = Number(isReturn) === 1
    ? -Math.abs(Number(entry.number_of_bags))
    : Number(entry.number_of_bags);
  return {
    ...rawEntry,
    number_of_bags: numberOfBags,
    total_weight: calculateRawTotal(entry.bag_weight, numberOfBags),
  };
};
