import { BufWrapper } from '@minecraft-js/bufwrapper';
import { writeInt32LE } from '../util/Int32LE';
import { RCONPacketType } from '../util/PacketType';

export class RCONPacket {
  /**
   * Type of the packet
   * @see https://wiki.vg/RCON#Packets
   */
  public type: RCONPacketType;
  /** Payload of the packet */
  public payload: string;
  /** BufWrapper instance that wraps the buffer for this packet */
  public buf: BufWrapper;

  /**
   * Read or write a packet
   * @param buf Buffer to create the packet from, can be `undefined` if you are building a packet
   */
  public constructor(buf?: BufWrapper) {
    this.buf = buf || new BufWrapper(null, { oneConcat: true });
  }

  /**
   * Write the data to the packet
   * @param type Type of the RCONPacket
   * @param payload Payload for this packet
   */
  public write(type?: RCONPacketType, payload?: string): void {
    this.type = type || this.type;
    this.payload = payload || this.payload;

    this.buf = new BufWrapper(null, { oneConcat: true });

    this.buf.writeToBuffer(writeInt32LE(this.type));

    this.buf.writeToBuffer(Buffer.from(this.payload, 'latin1'));

    // 1st null byte is for terminating the ascii text
    // 2nd null byte is the pad
    this.buf.writeBytes([0x00, 0x00]);

    this.buf.finish();
  }

  /**
   * Read the packet content
   */
  public read(type: RCONPacketType): RCONPacket {
    this.type = type;

    let payloadLength = 0;
    while (true) {
      const byte = this.buf.readBytes(1)[0];
      if (byte === 0x00) break;

      payloadLength++;
    }

    const payloadOffset = 4 * 3;
    this.payload = this.buf.buffer
      .subarray(payloadOffset, payloadOffset + payloadLength)
      .toString('latin1');

    return this;
  }
}
