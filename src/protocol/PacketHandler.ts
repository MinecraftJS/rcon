import { BufWrapper } from '@minecraft-js/bufwrapper';
import { emitWarning } from 'node:process';
import { readInt32LE } from '../util/Int32LE';
import { RCONPacketType } from '../util/PacketType';
import { RCONPacket } from './Packet';

export class RCONPacketHandler {
  /**
   * Handle a packet
   * @param buffer Raw buffer
   * @returns The request ID and the packet
   */
  public handle(buffer: Buffer): { requestId: number; packet: RCONPacket } {
    const buf = new BufWrapper(buffer);

    const length = readInt32LE(buf);
    if (length + 4 !== buffer.length)
      emitWarning("Packet length doesn't match the length field of the packet");

    const requestId = readInt32LE(buf);
    const type: RCONPacketType = readInt32LE(buf);

    const packet = new RCONPacket(buf);

    packet.read(type);

    return { requestId, packet };
  }
}
