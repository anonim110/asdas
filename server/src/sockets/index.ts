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

    // Join / leave a community chat room for live group messages.
    socket.on('community:join', ({ communityId }: { communityId: string }) => {
      if (typeof communityId === 'string') socket.join(`community:${communityId}`);
    });
    socket.on('community:leave', ({ communityId }: { communityId: string }) => {
      if (typeof communityId === 'string') socket.leave(`community:${communityId}`);
    });
    // Typing indicator inside a community chat.
    socket.on('community:typing', ({ communityId }: { communityId: string }) => {
      if (typeof communityId === 'string') {
        socket.to(`community:${communityId}`).emit('community:typing', { communityId, userId });
      }
    });

    // Typing indicator within a DM conversation.
    socket.on('dm:typing', ({ toUserId }: { toUserId: string }) => {
      if (typeof toUserId === 'string') {
        io.to(userRoom(toUserId)).emit('dm:typing', { fromUserId: userId });
      }
    });

    // ───────── 1:1 WebRTC calls: relay signalling between the two peers ─────────
    // The server never sees media; it only forwards SDP offers/answers and ICE
    // candidates between the caller and callee, tagging each with the sender id.
    const relayCall =
      (event: string) =>
      (payload: { toUserId?: string } & Record<string, unknown>) => {
        const { toUserId, ...rest } = payload || {};
        if (typeof toUserId === 'string') {
          io.to(userRoom(toUserId)).emit(event, { fromUserId: userId, ...rest });
        }
      };

    socket.on('call:invite', async ({ toUserId, callType }: { toUserId: string; callType: string }) => {
      if (typeof toUserId !== 'string') return;
      // Block check (either direction) — never connect blocked users.
      const blocked = await prisma.block
        .findFirst({
          where: {
            OR: [
              { blockerId: userId, blockedId: toUserId },
              { blockerId: toUserId, blockedId: userId },
            ],
          },
        })
        .catch(() => null);
      if (blocked) {
        socket.emit('call:rejected', { fromUserId: toUserId, reason: 'unavailable' });
        return;
      }
      const caller = await prisma.user
        .findUnique({
          where: { id: userId },
          select: { id: true, username: true, displayName: true, avatarUrl: true, verified: true },
        })
        .catch(() => null);
      io.to(userRoom(toUserId)).emit('call:incoming', {
        fromUserId: userId,
        caller,
        callType: callType === 'video' ? 'video' : 'audio',
      });
    });

    socket.on('call:accept', relayCall('call:accepted'));
    socket.on('call:reject', relayCall('call:rejected'));
    socket.on('call:cancel', relayCall('call:canceled'));
    socket.on('call:end', relayCall('call:ended'));
    socket.on('call:busy', relayCall('call:busy'));
    // Carries { toUserId, data } where data is an SDP description or ICE candidate.
    socket.on('call:signal', relayCall('call:signal'));

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
