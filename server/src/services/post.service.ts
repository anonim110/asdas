import { prisma } from '../config/prisma';
import { MediaType } from '../types/enums';
import { ApiError } from '../utils/apiError';
import { extractHashtags, extractMentions } from '../utils/textParser';
import { postInclude, serializePost } from './serializers';
import { createNotification, removeNotification } from './notification.service';
import { emitToPost } from '../sockets/io';

export interface MediaInput {
  url: string;
  type: MediaType;
  width?: number;
  height?: number;
}

interface CreatePostArgs {
  authorId: string;
  content?: string;
  media?: MediaInput[];
  parentId?: string;
  quotedPostId?: string;
}

// Links hashtags and mentions found in `content` to the post, and notifies
// mentioned users. Runs after the post row exists.
async function syncHashtagsAndMentions(
  postId: string,
  content: string,
  authorId: string,
  notifyMentions = true,
) {
  const tags = extractHashtags(content);
  const mentions = extractMentions(content);

  for (const tag of tags) {
    const hashtag = await prisma.hashtag.upsert({
      where: { tag },
      create: { tag },
      update: {},
    });
    await prisma.postHashtag.upsert({
      where: { postId_hashtagId: { postId, hashtagId: hashtag.id } },
      create: { postId, hashtagId: hashtag.id },
      update: {},
    });
  }

  if (mentions.length) {
    const users = await prisma.user.findMany({
      where: { username: { in: mentions } },
      select: { id: true },
    });
    for (const u of users) {
      if (u.id === authorId) continue;
      await prisma.mention.upsert({
        where: { postId_userId: { postId, userId: u.id } },
        create: { postId, userId: u.id },
        update: {},
      });
      if (notifyMentions) {
        await createNotification({ type: 'MENTION', recipientId: u.id, actorId: authorId, postId });
      }
    }
  }
}

export async function createPost({
  authorId,
  content,
  media,
  parentId,
  quotedPostId,
}: CreatePostArgs) {
  const trimmed = content?.trim() || undefined;
  if (!trimmed && (!media || media.length === 0)) {
    throw ApiError.badRequest('A post must contain text or media');
  }

  // Validate referenced posts exist.
  if (parentId) {
    const parent = await prisma.post.findUnique({ where: { id: parentId } });
    if (!parent) throw ApiError.notFound('Parent post not found');
  }
  if (quotedPostId) {
    const quoted = await prisma.post.findUnique({ where: { id: quotedPostId } });
    if (!quoted) throw ApiError.notFound('Quoted post not found');
  }

  const post = await prisma.post.create({
    data: {
      authorId,
      content: trimmed,
      parentId,
      quotedPostId,
      media: media?.length
        ? { create: media.map((m) => ({ url: m.url, type: m.type, width: m.width, height: m.height })) }
        : undefined,
    },
    include: postInclude(authorId),
  });

  if (trimmed) await syncHashtagsAndMentions(post.id, trimmed, authorId);

  // Notify on reply / quote.
  if (parentId) {
    const parent = await prisma.post.findUnique({ where: { id: parentId }, select: { authorId: true } });
    if (parent) {
      await createNotification({ type: 'REPLY', recipientId: parent.authorId, actorId: authorId, postId: post.id });
    }
  }
  if (quotedPostId) {
    const quoted = await prisma.post.findUnique({ where: { id: quotedPostId }, select: { authorId: true } });
    if (quoted) {
      await createNotification({ type: 'QUOTE', recipientId: quoted.authorId, actorId: authorId, postId: post.id });
    }
  }

  // Re-fetch with viewer flags now that links exist.
  const full = await prisma.post.findUnique({ where: { id: post.id }, include: postInclude(authorId) });
  return serializePost(full!);
}

export async function getPostById(id: string, viewerId?: string) {
  const post = await prisma.post.findUnique({ where: { id }, include: postInclude(viewerId) });
  if (!post) throw ApiError.notFound('Post not found');
  return serializePost(post);
}

export async function getThread(id: string, viewerId?: string) {
  // Count a view (best-effort; ignored for the post's own author).
  const existing = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
  if (existing && existing.authorId !== viewerId) {
    await prisma.post.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
  }

  const post = await prisma.post.findUnique({ where: { id }, include: postInclude(viewerId) });
  if (!post) throw ApiError.notFound('Post not found');

  // Ancestor chain (the parents above this post), oldest first.
  const ancestors: any[] = [];
  let cursorId = post.parentId;
  while (cursorId) {
    const parent: any = await prisma.post.findUnique({
      where: { id: cursorId },
      include: postInclude(viewerId),
    });
    if (!parent) break;
    ancestors.unshift(serializePost(parent));
    cursorId = parent.parentId;
  }

  return { post: serializePost(post), ancestors };
}

export async function getReplies(postId: string, viewerId?: string, cursor?: string, limit = 20) {
  const items = await prisma.post.findMany({
    where: { parentId: postId },
    include: postInclude(viewerId),
    orderBy: { createdAt: 'asc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  return { items: page.map(serializePost), nextCursor: hasMore ? page[page.length - 1].id : null };
}

export async function deletePost(id: string, userId: string) {
  const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
  if (!post) throw ApiError.notFound('Post not found');
  if (post.authorId !== userId) throw ApiError.forbidden('You can only delete your own posts');
  await prisma.post.delete({ where: { id } });
}

// Edits the text of an existing post (text only; media stays unchanged).
export async function updatePost(id: string, userId: string, content: string) {
  const post = await prisma.post.findUnique({
    where: { id },
    select: { authorId: true, repostOfId: true, media: { select: { id: true } } },
  });
  if (!post) throw ApiError.notFound('Post not found');
  if (post.authorId !== userId) throw ApiError.forbidden('You can only edit your own posts');
  if (post.repostOfId) throw ApiError.badRequest('Reposts cannot be edited');

  const trimmed = content?.trim();
  if (!trimmed && post.media.length === 0) throw ApiError.badRequest('Post cannot be empty');

  // Rebuild hashtag / mention links from the new text (without re-notifying).
  await prisma.postHashtag.deleteMany({ where: { postId: id } });
  await prisma.mention.deleteMany({ where: { postId: id } });
  await prisma.post.update({
    where: { id },
    data: { content: trimmed || null, editedAt: new Date() },
  });
  if (trimmed) await syncHashtagsAndMentions(id, trimmed, userId, false);

  const full = await prisma.post.findUnique({ where: { id }, include: postInclude(userId) });
  return serializePost(full!);
}

// ───────────────────────── Likes ─────────────────────────

export async function likePost(postId: string, userId: string) {
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
  if (!post) throw ApiError.notFound('Post not found');

  await prisma.like.upsert({
    where: { userId_postId: { userId, postId } },
    create: { userId, postId },
    update: {},
  });
  await createNotification({ type: 'LIKE', recipientId: post.authorId, actorId: userId, postId });
  return getCounts(postId);
}

export async function unlikePost(postId: string, userId: string) {
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
  if (!post) throw ApiError.notFound('Post not found');
  await prisma.like.deleteMany({ where: { userId, postId } });
  await removeNotification({ type: 'LIKE', recipientId: post.authorId, actorId: userId, postId });
  return getCounts(postId);
}

// ──────────────────────── Reposts ────────────────────────

export async function repost(postId: string, userId: string) {
  const original = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
  if (!original) throw ApiError.notFound('Post not found');

  const existing = await prisma.post.findFirst({ where: { repostOfId: postId, authorId: userId } });
  if (!existing) {
    await prisma.post.create({ data: { authorId: userId, repostOfId: postId } });
    await createNotification({ type: 'REPOST', recipientId: original.authorId, actorId: userId, postId });
  }
  return getCounts(postId);
}

export async function unrepost(postId: string, userId: string) {
  const original = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
  if (!original) throw ApiError.notFound('Post not found');
  await prisma.post.deleteMany({ where: { repostOfId: postId, authorId: userId } });
  await removeNotification({ type: 'REPOST', recipientId: original.authorId, actorId: userId, postId });
  return getCounts(postId);
}

// ─────────────────────── Bookmarks ───────────────────────

export async function bookmarkPost(postId: string, userId: string) {
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) throw ApiError.notFound('Post not found');
  await prisma.bookmark.upsert({
    where: { userId_postId: { userId, postId } },
    create: { userId, postId },
    update: {},
  });
}

export async function unbookmarkPost(postId: string, userId: string) {
  await prisma.bookmark.deleteMany({ where: { userId, postId } });
}

export async function listBookmarks(userId: string, cursor?: string, limit = 20) {
  const items = await prisma.bookmark.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { userId_postId: { userId, postId: cursor } }, skip: 1 } : {}),
    include: { post: { include: postInclude(userId) } },
  });
  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  return {
    items: page.map((b) => serializePost(b.post)),
    nextCursor: hasMore ? page[page.length - 1].postId : null,
  };
}

// Returns the up-to-date engagement counts for a post (used by toggle endpoints).
export async function getCounts(postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { viewCount: true, _count: { select: { likes: true, reposts: true, replies: true, quotes: true } } },
  });
  const result = {
    postId,
    counts: {
      likes: post?._count.likes ?? 0,
      reposts: post?._count.reposts ?? 0,
      replies: post?._count.replies ?? 0,
      quotes: post?._count.quotes ?? 0,
      views: post?.viewCount ?? 0,
    },
  };
  // Broadcast to everyone currently viewing this post.
  emitToPost(postId, 'post:counts', result);
  return result;
}

export async function pinPost(postId: string, userId: string) {
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
  if (!post) throw ApiError.notFound('Post not found');
  if (post.authorId !== userId) throw ApiError.forbidden('You can only pin your own posts');
  await prisma.user.update({ where: { id: userId }, data: { pinnedPostId: postId } });
}

export async function unpinPost(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { pinnedPostId: null } });
}
