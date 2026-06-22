import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { verifyAccessToken } from '../utils/jwt';
import { setIO, userRoom } from './io';
import { markConversationRead } from '../services/message.service';
import { addConnection, removeConnection, isOnline } from './presence';

// Initialises Socket.io on top of the existing HTTP server.
// Authentication: the client passes its access token via `auth.token` in the
// handshake; we verify it and attach the user id to the socket.
export function initSockets(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: env.clientUrls, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.data.userId = verifyAccessToken(token).sub;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    socket.join(userRoom(userId));

    // Presence: announce online status on the first connection for this user.
    if (addConnection(userId)) {
      io.emit('presence:update', { userId, online: true });
    }

    // Reply with the current online state for a set of user ids.
    socket.on('presence:get', ({ userIds }: { userIds: string[] }) => {
      const online = (Array.isArray(userIds) ? userIds : []).filter(isOnline);
      socket.emit('presence:state', { online });
    });

    // Subscribe/unsubscribe to live engagement counts for a specific post.
    socket.on('post:subscribe', ({ postId }: { postId: string }) => {
      if (typeof postId === 'string') socket.join(`post:${postId}`);
    });
    socket.on('post:unsubscribe', ({ postId }: { postId: string }) => {
      if (typeof postId === 'string') socket.leave(`post:${postId}`);
    });

    // Typing indicator within a DM conversation.
    socket.on('dm:typing', ({ toUserId }: { toUserId: string }) => {
      if (typeof toUserId === 'string') {
        io.to(userRoom(toUserId)).emit('dm:typing', { fromUserId: userId });
      }
    });

    // Mark a conversation as read; notifies the other participant.
    socket.on('dm:read', async ({ conversationId }: { conversationId: string }) => {
      if (typeof conversationId !== 'string') return;
      try {
        const otherId = await markConversationRead(conversationId, userId);
        if (otherId) {
          io.to(userRoom(otherId)).emit('dm:read', { conversationId, readerId: userId });
        }
      } catch {
        // ignore invalid conversation
      }
    });

    socket.on('disconnect', async () => {
      // Presence: on the user's last disconnect, persist "last seen" and
      // broadcast that they went offline.
      if (removeConnection(userId)) {
        const lastSeenAt = new Date();
        await prisma.user.update({ where: { id: userId }, data: { lastSeenAt } }).catch(() => {});
        io.emit('presence:update', { userId, online: false, lastSeenAt });
      }
    });
  });

  setIO(io);
  return io;
}
