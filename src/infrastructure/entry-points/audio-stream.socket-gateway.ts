import type { Socket } from 'socket.io';
import type { IErrorReporter } from '@domain/ports/error-reporter.port.js';
import type { ILogger } from '@domain/ports/logger.port.js';
import type {
  ITranscriptionProvider,
  ITranscriptionSession,
} from '@domain/transcription/ports/transcription-provider.port.js';
import { BaseSocketGateway } from '@infra/entry-points/socket-gateway.js';

export class AudioStreamSocketGateway extends BaseSocketGateway {
  constructor(
    errorReporter: IErrorReporter,
    private readonly logger: ILogger,
    private readonly transcriptionProvider: ITranscriptionProvider,
  ) {
    super(errorReporter);
  }

  register(socket: Socket): void {
    let session: ITranscriptionSession | null = null;

    socket.on('audio-stream', (chunk: Buffer) => {
      void this.handleEvent(
        async () => {
          if (!session) {
            session = this.openSession(socket);
          }
          session.sendChunk(chunk);
          this.logger.info('Audio chunk forwarded', {
            socketId: socket.id,
            bytes: chunk.byteLength,
          });
        },
        () => {},
        (error) => socket.emit('audio-stream:error', error),
      );
    });

    socket.on('disconnect', () => {
      if (session) {
        session.close();
        session = null;
        this.logger.info('Transcription session closed', { socketId: socket.id });
      }
    });
  }

  private openSession(socket: Socket): ITranscriptionSession {
    const session = this.transcriptionProvider.createSession();

    session.onTranscript((result) => {
      socket.emit('transcription', result);
    });

    session.onError((error) => {
      this.errorReporter.report(error, { type: 'deepgram-session-error', socketId: socket.id });
      socket.emit('audio-stream:error', { code: 500, message: 'Transcription service error' });
    });

    this.logger.info('Transcription session opened', { socketId: socket.id });
    return session;
  }
}
