/**
 * Generates a random integer (signed integer)
 * used for request ids
 * @returns The random integer generated
 */
export function generateRequestId(): number {
  return Math.floor(Math.random() * (2147483647 + 1));
}
