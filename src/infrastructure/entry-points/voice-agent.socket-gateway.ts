import type { Socket } from 'socket.io';
import type { IErrorReporter } from '@domain/ports/error-reporter.port.js';
import type { ILogger } from '@domain/ports/logger.port.js';
import type {
  IVoiceAgentProvider,
  IVoiceAgentSession,
} from '@domain/voice-agent/ports/voice-agent-provider.port.js';
import { BaseSocketGateway } from '@infra/entry-points/socket-gateway.js';

export class VoiceAgentSocketGateway extends BaseSocketGateway {
  constructor(
    errorReporter: IErrorReporter,
    private readonly logger: ILogger,
    private readonly voiceAgentProvider: IVoiceAgentProvider,
  ) {
    super(errorReporter);
  }

  register(socket: Socket): void {
    let session: IVoiceAgentSession | null = null;

    socket.on('audio-stream', (chunk: Buffer) => {
      void this.handleEvent(
        async () => {
          if (!session) {
            session = this.openSession(socket);
          }
          session.sendChunk(chunk);
          this.logger.info('Audio chunk forwarded to voice agent', {
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
        this.logger.info('Voice agent session closed', { socketId: socket.id });
      }
    });
  }

  private openSession(socket: Socket): IVoiceAgentSession {
    const session = this.voiceAgentProvider.createSession();

    session.onTranscript((result) => {
      socket.emit('transcription', result);
    });

    session.onAgentText((text) => {
      socket.emit('assistant:response', { text });
    });

    session.onAgentAudio((audio) => {
      socket.emit('assistant:audio', audio);
    });

    session.onError((error) => {
      this.errorReporter.report(error, {
        type: 'voice-agent-session-error',
        socketId: socket.id,
      });
      socket.emit('audio-stream:error', { code: 500, message: 'Voice agent service error' });
    });

    this.logger.info('Voice agent session opened', { socketId: socket.id });
    return session;
  }
}
