import { BufWrapper } from '@minecraft-js/bufwrapper';
import { Buffer } from 'node:buffer';
import { emitWarning } from 'node:process';
import { readInt32LE } from '../util/Int32LE';
import { RCONPacketType } from '../util/PacketType';
import { RCONPacket } from './Packet';

export interface HandledPacket {
  /** Request ID generated for that packet */
  requestId: number;
  /** The packet itself */
  packet: RCONPacket;
}

export class RCONPacketHandler {
  /**
   * Handle a packet
   * @param buffer Raw buffer
   * @returns All handled packets
   */
  public handle(buffer: Buffer): HandledPacket[] {
    const buf = new BufWrapper(buffer);

    const length = readInt32LE(buf);

    const requestId = readInt32LE(buf);
    const type: RCONPacketType = readInt32LE(buf);

    const packet = new RCONPacket(buf);

    packet.read(type);

    // length of (RequestId+Type) + length of payload + length of null bytes
    if (length !== 4 * 2 + Buffer.byteLength(packet.payload) + 2)
      emitWarning(
        "[RCON] Packet length doesn't match the length field of the packet"
      );

    const handledPackets: HandledPacket[] = [{ requestId, packet }];

    // If we have another packet in the same buffer
    if (buf.buffer.length > buf.offset) {
      const handlded = this.handle(buffer.subarray(buf.offset));
      handledPackets.push(...handlded);
    }

    return handledPackets;
  }
}
