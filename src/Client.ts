import { EventEmitter } from 'node:events';
import { Socket } from 'node:net';
import { emitWarning } from 'node:process';
import TypedEmitter from 'typed-emitter';
import { RCONPacket } from './protocol/Packet';
import { RCONPacketBuilder } from './protocol/PacketBuilder';
import { RCONPacketHandler } from './protocol/PacketHandler';
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

      this.socket.write(buffer);
    });

    this.socket.on('data', (buffer) => this.handleMessage(buffer));

    this.socket.on('end', () => this.disconnect());
    this.socket.on('close', () => this.disconnect());
    this.socket.on('error', (error) => {
      this.disconnect();
      this.emit('error', error, false);
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
      throw new Error("Can't send command before authentication!");

    const { buffer, requestId } = new RCONPacketBuilder(
      RCONPacketType.COMMAND,
      command
    );

    this.socket.write(buffer);
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

  private handleMessage(buffer: Buffer): void {
    this.emit('raw_message', buffer);
    const { requestId, packet } = this.handler.handle(buffer);

    switch (packet.type) {
      case RCONPacketType.RESPONSE:
        this.emit('response', packet);
        break;
      case RCONPacketType.ERROR:
        if (requestId === this.authRequestId) {
          const emitted = this.emit('authentication_failed');
          if (!emitted)
            throw new Error(
              'Authentication failed, please handle the `authentication_failed` event'
            );
        }

        const emitted = this.emit('error', new Error(packet.payload), true);
        if (!emitted) throw new Error(packet.payload);

        break;

      case RCONPacketType.COMMAND:
        // For some reason, when authenticating
        // a Command packet is sent when successful
        if (requestId === this.authRequestId) {
          this.authenticated = true;
          this.emit('authenticated');
        }
        break;

      default:
        emitWarning(`Unknown RCONPacketType (type=${packet.type})`);
        break;
    }
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
