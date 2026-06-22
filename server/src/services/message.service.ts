import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { authorSelect } from './serializers';
import { emitToUser } from '../sockets/io';

// A 1:1 conversation is keyed by an ordered pair so (A,B) and (B,A) map to one row.
function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

async function ensureNotBlocked(a: string, b: string) {
  const blocked = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
  });
  if (blocked) throw ApiError.forbidden('Messaging is unavailable with this user');
}

export async function getOrCreateConversation(userId: string, otherUsername: string) {
  const other = await prisma.user.findUnique({ where: { username: otherUsername }, select: { id: true } });
  if (!other) throw ApiError.notFound('User not found');
  if (other.id === userId) throw ApiError.badRequest('You cannot message yourself');
  await ensureNotBlocked(userId, other.id);

  const [userAId, userBId] = orderPair(userId, other.id);
  const conversation = await prisma.conversation.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    create: { userAId, userBId },
    update: {},
    include: {
      userA: { select: authorSelect },
      userB: { select: authorSelect },
    },
  });
  return shapeConversation(conversation, userId);
}

function shapeConversation(c: any, viewerId: string) {
  const other = c.userAId === viewerId ? c.userB : c.userA;
  return {
    id: c.id,
    other,
    lastMessage: c.messages?.[0]
      ? {
          id: c.messages[0].id,
          content: c.messages[0].content,
          imageUrl: c.messages[0].imageUrl ?? null,
          senderId: c.messages[0].senderId,
          createdAt: c.messages[0].createdAt,
          readAt: c.messages[0].readAt,
        }
      : null,
    unread: c._unread ?? 0,
    updatedAt: c.updatedAt,
  };
}

export async function listConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    orderBy: { updatedAt: 'desc' },
    include: {
      userA: { select: authorSelect },
      userB: { select: authorSelect },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  // Compute unread counts (messages sent by the other user, not yet read).
  const withUnread = await Promise.all(
    conversations.map(async (c) => {
      const unread = await prisma.message.count({
        where: { conversationId: c.id, senderId: { not: userId }, readAt: null },
      });
      return shapeConversation({ ...c, _unread: unread }, userId);
    }),
  );
  return withUnread;
}

// Fetches a single conversation's metadata for a participant. Lets the client
// open a chat by id even when its conversation list cache is empty or stale.
export async function getConversation(conversationId: string, userId: string) {
  const c = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      userA: { select: authorSelect },
      userB: { select: authorSelect },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  if (!c || (c.userAId !== userId && c.userBId !== userId)) {
    throw ApiError.notFound('Conversation not found');
  }
  const unread = await prisma.message.count({
    where: { conversationId: c.id, senderId: { not: userId }, readAt: null },
  });
  return shapeConversation({ ...c, _unread: unread }, userId);
}

async function assertParticipant(conversationId: string, userId: string) {
  const c = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!c) throw ApiError.notFound('Conversation not found');
  if (c.userAId !== userId && c.userBId !== userId) throw ApiError.forbidden('Not a participant');
  return c;
}

export async function getMessages(conversationId: string, userId: string, cursor?: string, limit = 30) {
  await assertParticipant(conversationId, userId);
  const items = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  // Returned newest-first; the client reverses for display.
  return { items: page, nextCursor: hasMore ? page[page.length - 1].id : null };
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  imageUrl?: string,
) {
  const conv = await assertParticipant(conversationId, senderId);
  const text = content.trim();
  if (!text && !imageUrl) throw ApiError.badRequest('Message cannot be empty');
  const otherId = conv.userAId === senderId ? conv.userBId : conv.userAId;
  await ensureNotBlocked(senderId, otherId);

  const [message] = await prisma.$transaction([
    prisma.message.create({ data: { conversationId, senderId, content: text || null, imageUrl } }),
    prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
  ]);

  // Realtime delivery to both participants.
  emitToUser(otherId, 'dm:new', { conversationId, message });
  emitToUser(senderId, 'dm:new', { conversationId, message });
  return message;
}

// Marks all messages from the *other* participant as read. Returns the other
// user's id so the caller (socket handler) can notify them.
export async function markConversationRead(conversationId: string, userId: string): Promise<string | null> {
  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conv || (conv.userAId !== userId && conv.userBId !== userId)) return null;
  await prisma.message.updateMany({
    where: { conversationId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });
  return conv.userAId === userId ? conv.userBId : conv.userAId;
}
