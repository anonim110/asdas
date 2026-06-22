import { Server } from 'socket.io';

// Holds the Socket.io server instance so services can emit realtime events
// without importing the HTTP bootstrap. Set once during startup.
let io: Server | null = null;

export function setIO(server: Server) {
  io = server;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialised');
  return io;
}

// Every authenticated socket joins a personal room named `user:<id>`.
export function userRoom(userId: string): string {
  return `user:${userId}`;
}

// Clients viewing a post join `post:<id>` to receive live count updates.
export function postRoom(postId: string): string {
  return `post:${postId}`;
}

// Safe emit: a no-op if the socket layer is not ready yet (e.g. in tests).
export function emitToUser(userId: string, event: string, payload: unknown) {
  if (!io) return;
  io.to(userRoom(userId)).emit(event, payload);
}

export function emitToPost(postId: string, event: string, payload: unknown) {
  if (!io) return;
  io.to(postRoom(postId)).emit(event, payload);
}
