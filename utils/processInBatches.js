const DEFAULT_BATCH_SIZE = 50;

export const processInBatches = async (
  items,
  processItem,
  onProgress = () => {},
  batchSize = DEFAULT_BATCH_SIZE
) => {
  for (let index = 0; index < items.length; index += 1) {
    processItem(items[index], index);
    if ((index + 1) % batchSize === 0) {
      onProgress({ completed: index + 1, total: items.length });
      if (index + 1 < items.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }
};
