const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const CHUNK_SIZE = 48 * 1024;

const encodeChunk = bytes => {
  const encoded = new Array(Math.ceil(bytes.length / 3) * 4);
  let inputIndex = 0;
  let outputIndex = 0;

  while (inputIndex + 2 < bytes.length) {
    const value = (bytes[inputIndex] << 16) | (bytes[inputIndex + 1] << 8) | bytes[inputIndex + 2];
    encoded[outputIndex++] = ALPHABET[(value >> 18) & 63];
    encoded[outputIndex++] = ALPHABET[(value >> 12) & 63];
    encoded[outputIndex++] = ALPHABET[(value >> 6) & 63];
    encoded[outputIndex++] = ALPHABET[value & 63];
    inputIndex += 3;
  }

  if (inputIndex < bytes.length) {
    const first = bytes[inputIndex];
    const hasSecond = inputIndex + 1 < bytes.length;
    const second = hasSecond ? bytes[inputIndex + 1] : 0;
    encoded[outputIndex++] = ALPHABET[first >> 2];
    encoded[outputIndex++] = ALPHABET[((first & 3) << 4) | (second >> 4)];
    encoded[outputIndex++] = hasSecond ? ALPHABET[(second & 15) << 2] : '=';
    encoded[outputIndex] = '=';
  }

  return encoded.join('');
};

export const encodeBytesToBase64 = async (bytes, onProgress = () => {}) => {
  const chunks = [];
  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    const end = Math.min(offset + CHUNK_SIZE, bytes.length);
    chunks.push(encodeChunk(bytes.subarray(offset, end)));
    onProgress({ completed: end, total: bytes.length });
    if (end < bytes.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  return chunks.join('');
};
