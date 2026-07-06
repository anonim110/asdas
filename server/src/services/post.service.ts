import { prisma } from '../config/prisma';
import { MediaType } from '../types/enums';
import { ApiError } from '../utils/apiError';
import { extractHashtags, extractMentions } from '../utils/textParser';
import { postInclude, serializePoll, serializePost } from './serializers';
import { createNotification, removeNotification } from './notification.service';
import { assertCanPostTo } from './community.service';
import { emitToPost } from '../sockets/io';

export interface MediaInput {
  url: string;
  type: MediaType;
  width?: number;
  height?: number;
}

export interface PollInput {
  options: string[];
  durationHours: number;
}

interface CreatePostArgs {
  authorId: string;
  content?: string;
  media?: MediaInput[];
  parentId?: string;
  quotedPostId?: string;
  communityId?: string;
  poll?: PollInput;
  unlockAt?: Date;
}

// Validates poll input from the client (2-4 non-empty options, 1h-7d).
function validatePoll(poll: PollInput): { options: string[]; durationHours: number } {
  const options = (poll.options ?? []).map((o) => String(o).trim()).filter(Boolean);
  if (options.length < 2 || options.length > 4) {
    throw ApiError.badRequest('A poll needs between 2 and 4 options');
  }
  if (options.some((o) => o.length > 50)) {
    throw ApiError.badRequest('Poll options are limited to 50 characters');
  }
  const durationHours = Number(poll.durationHours);
  if (!Number.isFinite(durationHours) || durationHours < 1 || durationHours > 168) {
    throw ApiError.badRequest('Poll duration must be between 1 hour and 7 days');
  }
  return { options, durationHours };
}

// Links hashtags and mentions found in `content` to the post, and notifies
// mentioned users. Runs after the post row exists.
export async function syncHashtagsAndMentions(
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
  communityId,
  poll,
  unlockAt,
}: CreatePostArgs) {
  const trimmed = content?.trim() || undefined;
  if (!trimmed && (!media || media.length === 0)) {
    throw ApiError.badRequest('A post must contain text or media');
  }
  // Polls need a question and can't be combined with media attachments.
  const validPoll = poll ? validatePoll(poll) : undefined;
  if (validPoll && !trimmed) throw ApiError.badRequest('A poll needs a question in the post text');
  if (validPoll && media && media.length > 0) {
    throw ApiError.badRequest('A post cannot have both a poll and media');
  }

  // Time capsules: top-level text/media posts that stay sealed until a
  // future date. Replies, quotes and polls can't be capsules, and the
  // window is bounded so a capsule always opens within a year.
  if (unlockAt) {
    if (parentId || quotedPostId) {
      throw ApiError.badRequest('Replies and quotes cannot be time capsules');
    }
    if (validPoll) throw ApiError.badRequest('A time capsule cannot contain a poll');
    const ms = unlockAt.getTime() - Date.now();
    if (Number.isNaN(ms) || ms < 60 * 1000) {
      throw ApiError.badRequest('A time capsule must open at least a minute in the future');
    }
    if (ms > 366 * 24 * 60 * 60 * 1000) {
      throw ApiError.badRequest('A time capsule can be sealed for at most one year');
    }
  }

  // Validate referenced posts exist.
  if (parentId) {
    const parent = await prisma.post.findUnique({ where: { id: parentId } });
    if (!parent) throw ApiError.notFound('Parent post not found');
    if (parent.unlockAt && parent.unlockAt.getTime() > Date.now()) {
      throw ApiError.badRequest('This time capsule is still sealed');
    }
  }
  if (quotedPostId) {
    const quoted = await prisma.post.findUnique({ where: { id: quotedPostId } });
    if (!quoted) throw ApiError.notFound('Quoted post not found');
  }
  // Posting into a community requires membership (top-level posts only).
  if (communityId) {
    if (parentId) throw ApiError.badRequest('Replies cannot target a community');
    await assertCanPostTo(communityId, authorId);
  }

  const post = await prisma.post.create({
    data: {
      authorId,
      content: trimmed,
      parentId,
      quotedPostId,
      communityId,
      unlockAt,
      media: media?.length
        ? { create: media.map((m) => ({ url: m.url, type: m.type, width: m.width, height: m.height })) }
        : undefined,
      poll: validPoll
        ? {
            create: {
              endsAt: new Date(Date.now() + validPoll.durationHours * 60 * 60 * 1000),
              options: { create: validPoll.options.map((text, order) => ({ text, order })) },
            },
          }
        : undefined,
    },
    include: postInclude(authorId),
  });

  // Sealed capsules skip hashtag/mention indexing: a mention notification or
  // a hashtag page hit would leak the hidden text before it opens.
  if (trimmed && !unlockAt) await syncHashtagsAndMentions(post.id, trimmed, authorId);

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

const pollWithCounts = (viewerId?: string) => ({
  options: {
    orderBy: { order: 'asc' as const },
    include: { _count: { select: { votes: true } } },
  },
  ...(viewerId ? { votes: { where: { userId: viewerId }, select: { optionId: true } } } : {}),
});

// Cast (or change) a vote in a post's poll. Votes can be switched until the
// poll closes. Everyone watching the post gets a live 'poll:update'.
export async function votePoll(postId: string, userId: string, optionId: string) {
  const poll = await prisma.poll.findUnique({
    where: { postId },
    include: { options: { select: { id: true } } },
  });
  if (!poll) throw ApiError.notFound('This post has no poll');
  if (poll.endsAt <= new Date()) throw ApiError.badRequest('This poll has ended');
  if (!poll.options.some((o) => o.id === optionId)) throw ApiError.badRequest('Unknown poll option');

  await prisma.pollVote.upsert({
    where: { pollId_userId: { pollId: poll.id, userId } },
    create: { pollId: poll.id, optionId, userId },
    update: { optionId },
  });

  const fresh = await prisma.poll.findUnique({
    where: { id: poll.id },
    include: pollWithCounts(userId),
  });
  const serialized = serializePoll(fresh);
  // Broadcast without the voter's personal choice; clients keep their own.
  emitToPost(postId, 'poll:update', { postId, poll: { ...serialized, viewerVote: null } });
  return serialized;
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
    select: { authorId: true, repostOfId: true, unlockAt: true, media: { select: { id: true } } },
  });
  if (!post) throw ApiError.notFound('Post not found');
  if (post.authorId !== userId) throw ApiError.forbidden('You can only edit your own posts');
  if (post.repostOfId) throw ApiError.badRequest('Reposts cannot be edited');
  if (post.unlockAt && post.unlockAt.getTime() > Date.now()) {
    throw ApiError.badRequest('A sealed time capsule cannot be edited');
  }

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

// Detailed engagement analytics for a post. Author-only: surfaces reach and
// interaction breakdowns plus a simple engagement rate.
export async function getPostAnalytics(postId: string, userId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      authorId: true,
      viewCount: true,
      createdAt: true,
      _count: {
        select: { likes: true, reposts: true, replies: true, quotes: true, bookmarks: true },
      },
    },
  });
  if (!post) throw ApiError.notFound('Post not found');
  if (post.authorId !== userId) throw ApiError.forbidden('You can only view analytics for your own posts');

  const c = post._count;
  const interactions = c.likes + c.reposts + c.replies + c.quotes + c.bookmarks;
  const views = post.viewCount || 0;
  // Engagement rate = interactions per view (capped, expressed as a percentage).
  const engagementRate = views > 0 ? Math.min(100, (interactions / views) * 100) : 0;

  return {
    postId,
    createdAt: post.createdAt,
    views,
    likes: c.likes,
    reposts: c.reposts,
    replies: c.replies,
    quotes: c.quotes,
    bookmarks: c.bookmarks,
    interactions,
    engagementRate: Math.round(engagementRate * 10) / 10,
  };
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
