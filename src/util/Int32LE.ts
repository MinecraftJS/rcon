import { BufWrapper } from '@minecraft-js/bufwrapper';

/**
 * Encode a 32-bit integer (little-endian)
 * @param value Integer to write
 * @returns The buffer with the Int32LE
 */
export function writeInt32LE(value: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeInt32LE(value);
  return buf;
}

/**
 * Decode a 32-bit integer (little-endian)
 * @param buf Source buffer
 * @returns The read integer
 */
export function readInt32LE(buf: BufWrapper): number {
  const bytes = buf.readBytes(4);
  return bytes.readInt32LE();
}
