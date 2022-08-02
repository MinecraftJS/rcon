/**
 * Enum of the different packet types
 */
export enum RCONPacketType {
  ERROR = -1,
  RESPONSE = 0,
  AUTH_RESPONSE = 2,
  COMMAND = 2,
  LOGIN = 3,
}
