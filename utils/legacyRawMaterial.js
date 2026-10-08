export const normalizeLegacyRawMaterialEntry = entry => {
  const { is_return: isReturn, ...rawEntry } = entry;
  if (Number(isReturn) !== 1) return rawEntry;
  return {
    ...rawEntry,
    number_of_bags: -Math.abs(Number(entry.number_of_bags)),
    total_weight: -Math.abs(Number(entry.total_weight)),
  };
};
