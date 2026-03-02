import { Server } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import type { ILogger } from '@domain/ports/logger.port.js';
import type { BaseSocketGateway } from '@infra/entry-points/socket-gateway.js';

export function createSocketServer(
  httpServer: HttpServer,
  gateways: BaseSocketGateway[],
  logger: ILogger,
): Server {
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    logger.info('Socket connected', { socketId: socket.id });

    gateways.forEach((gateway) => gateway.register(socket));

    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', { socketId: socket.id, reason });
    });
  });

  return io;
}
