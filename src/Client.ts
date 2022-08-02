import { EventEmitter } from 'node:events';
import { Socket } from 'node:net';
import { emitWarning } from 'node:process';
import TypedEmitter from 'typed-emitter';
import { RCONPacket } from './protocol/Packet';
import { RCONPacketBuilder } from './protocol/PacketBuilder';
import { HandledPacket, RCONPacketHandler } from './protocol/PacketHandler';
import { RCONPacketType } from './util/PacketType';

/**
 * RCONClient Class
 * @see https://wiki.vg/RCON for more information
 */
export class RCONClient extends (EventEmitter as new () => TypedEmitter<RCONClientEvents>) {
  /** Host this client is linked to */
  public host: string;
  /** Port this client is linked to */
  public port: number;
  /** Whether or not this client has been authenticated */
  public authenticated: boolean;
  /** Whether or not this client is connected */
  public connected: boolean;

  /** Password used to login */
  private password: string;
  /** Request ID of the login packet */
  private authRequestId: number;
  /** Packet handler */
  private handler: RCONPacketHandler;
  /** TCP socket */
  private socket: Socket;

  /**
   * Instantiate a new RCONClient instance
   * @param host Host for this RCONClient
   * @param password Password used to login
   * @param port Port to use, defaults to 25575
   */
  public constructor(host: string, password: string, port = 25575) {
    super();
    this.host = host;
    this.port = port;
    this.authenticated = false;

    this.password = password;
    this.handler = new RCONPacketHandler();
  }

  /**
   * Connect to the Minecraft server
   * @returns The RCONClient
   */
  public connect(): RCONClient {
    this.socket = new Socket();

    this.socket.on('connect', () => {
      this.connected = true;
      this.emit('connect');

      const { buffer, requestId } = new RCONPacketBuilder(
        RCONPacketType.LOGIN,
        this.password
      );
      this.authRequestId = requestId;

      this.write(buffer);
    });

    this.socket.on('data', (buffer) => this.handleMessage(buffer));

    this.socket.on('end', () => this.disconnect());
    this.socket.on('close', () => this.disconnect());
    this.socket.on('error', (error) => {
      this.disconnect();
      this.throw(error, false);
    });

    this.socket.connect({
      host: this.host,
      port: this.port,
    });

    return this;
  }

  /**
   * Execute a command on the server
   * @param command Command to execute on the server
   * @returns The request ID (use it to catch the response)
   */
  public executeCommand(command: string): number {
    if (!this.authenticated)
      throw new Error("[RCON] Can't send command before authentication!");

    const { buffer, requestId } = new RCONPacketBuilder(
      RCONPacketType.COMMAND,
      command
    );

    this.write(buffer);
    return requestId;
  }

  /**
   * Disconnect the client and end the connection
   */
  public disconnect(): void {
    this.connected = false;
    this.socket.end();
    this.emit('disconnect');
  }

  /** Handle incoming messages */
  private handleMessage(buffer: Buffer): void {
    this.emit('raw_message', buffer);
    let packets: HandledPacket[] = [];
    try {
      packets = this.handler.handle(buffer);
    } catch (error) {
      return this.throw(error, error.message?.startsWith('[RCON]'));
    }

    for (const { requestId, packet } of packets) {
      switch (packet.type) {
        case RCONPacketType.RESPONSE:
          this.emit('response', packet);
          break;

        case RCONPacketType.ERROR:
          if (requestId === this.authRequestId) {
            const emitted = this.emit('authentication_failed');
            if (!emitted)
              throw new Error(
                '[RCON] Authentication failed, please handle the `authentication_failed` event'
              );
          }

          this.throw(new Error(packet.payload), true);
          break;

        // Server doesn't send COMMAND packets
        // case RCONPacketType.COMMAND:
        case RCONPacketType.AUTH_RESPONSE:
          if (requestId === this.authRequestId) {
            this.authenticated = true;
            this.emit('authenticated');
          } else {
            emitWarning(
              `[RCON] Received auth response packet without different request id (expected=${this.authRequestId}, actual=${requestId}, authenticated=${this.authenticated})`
            );
          }
          break;

        default:
          emitWarning(`[RCON] Unknown RCONPacketType (type=${packet.type})`);
          break;
      }
    }
  }

  /**
   * Write a message to the server
   * @param buffer Message to send
   */
  private write(buffer: Buffer): void {
    const max = RCONPacket.MAX_CLIENT_PAYLOAD_LENGTH + 4 * 3 + 2;
    if (buffer.length > max)
      return this.throw(
        new Error(`[RCON] Can't write packet larger than ${max} bytes`),
        true
      );

    this.socket.write(buffer);
  }

  /**
   * Throw an error
   * @param error Error to throw
   * @param isRCON Whether or not this error comes from RCON
   */
  private throw(error: Error, isRCON?: boolean): void {
    const emitted = this.emit('error', error, isRCON);
    if (!emitted) throw error;
  }
}

type RCONClientEvents = {
  connect: () => void;
  disconnect: () => void;
  error: (error: Error, isRCON?: boolean) => void;
  raw_message: (message: Buffer) => void;
  authenticated: () => void;
  authentication_failed: () => void;
  response: (packet: RCONPacket) => void;
};
