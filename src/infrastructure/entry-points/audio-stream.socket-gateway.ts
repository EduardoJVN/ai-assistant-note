import type { Socket } from 'socket.io';
import type { IErrorReporter } from '@domain/ports/error-reporter.port.js';
import type { ILogger } from '@domain/ports/logger.port.js';
import { BaseSocketGateway } from '@infra/entry-points/socket-gateway.js';

export class AudioStreamSocketGateway extends BaseSocketGateway {
  constructor(
    errorReporter: IErrorReporter,
    private readonly logger: ILogger,
  ) {
    super(errorReporter);
  }

  register(socket: Socket): void {
    socket.on('audio-stream', (chunk: Buffer) => {
      void this.handleEvent(
        () => this.processChunk(socket.id, chunk),
        () => {},
        (error) => socket.emit('audio-stream:error', error),
      );
    });
  }

  private async processChunk(socketId: string, chunk: Buffer): Promise<void> {
    this.logger.info('Audio chunk received', {
      socketId,
      bytes: chunk.byteLength,
    });
  }
}
