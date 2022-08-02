import { BufWrapper } from '@minecraft-js/bufwrapper';
import { writeInt32LE } from '../util/Int32LE';
import { RCONPacketType } from '../util/PacketType';
import { generateRequestId } from '../util/requestIdGenerator';
import { RCONPacket } from './Packet';

/**
 * RCON Packet Builder, used
 * to create fully built packets
 */
export class RCONPacketBuilder {
  /** Packet buffer, contains the packet data */
  public buffer: Buffer;
  /** Request ID of that packet */
  public requestId: number;

  /**
   * Create a new packet ready to be sent
   * @param type Type of the RCONPacket
   * @param payload Payload for this packet
   */
  public constructor(type: RCONPacketType, payload: string) {
    const packet = new RCONPacket();
    packet.write(type, payload);

    this.requestId = generateRequestId();
    const requestId = writeInt32LE(this.requestId);

    const buf = new BufWrapper(null, { oneConcat: true });
    const packetLength = packet.buf.buffer.length + requestId.length;

    buf.writeToBuffer(writeInt32LE(packetLength), requestId, packet.buf.buffer);

    buf.finish();

    this.buffer = buf.buffer;
  }
}
