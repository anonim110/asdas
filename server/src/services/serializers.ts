import { Prisma } from '@prisma/client';

// Public shape of a user embedded in other resources (post author, etc).
export const authorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  verified: true,
  lastSeenAt: true,
  gameStatus: true,
} satisfies Prisma.UserSelect;

// Builds the Prisma `include` used when fetching posts. When a viewer id is
// supplied we also fetch viewer-specific flags (liked / bookmarked / reposted).
function baseInclude(viewerId?: string): Prisma.PostInclude {
  const include: Prisma.PostInclude = {
    author: { select: authorSelect },
    media: true,
    hashtags: { include: { hashtag: true } },
    community: { select: { id: true, slug: true, name: true } },
    _count: { select: { likes: true, reposts: true, replies: true, quotes: true } },
  };
  if (viewerId) {
    include.likes = { where: { userId: viewerId }, select: { userId: true } };
    include.bookmarks = { where: { userId: viewerId }, select: { userId: true } };
    include.reposts = { where: { authorId: viewerId }, select: { id: true } };
  }
  return include;
}

// One level of nesting so reposts/quotes carry the embedded original post.
export function postInclude(viewerId?: string): Prisma.PostInclude {
  const base = baseInclude(viewerId);
  return {
    ...base,
    repostOf: { include: base },
    quotedPost: { include: base },
  };
}

type AnyPost = Record<string, any>;

function serializeOne(p: AnyPost) {
  return {
    id: p.id,
    content: p.content ?? null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    editedAt: p.editedAt ?? null,
    parentId: p.parentId ?? null,
    author: p.author,
    media: (p.media ?? []).map((m: AnyPost) => ({
      id: m.id,
      url: m.url,
      type: m.type,
      width: m.width,
      height: m.height,
    })),
    hashtags: (p.hashtags ?? []).map((h: AnyPost) => h.hashtag.tag),
    community: p.community
      ? { id: p.community.id, slug: p.community.slug, name: p.community.name }
      : null,
    counts: {
      likes: p._count?.likes ?? 0,
      reposts: p._count?.reposts ?? 0,
      replies: p._count?.replies ?? 0,
      quotes: p._count?.quotes ?? 0,
      views: p.viewCount ?? 0,
    },
    viewer: {
      liked: Array.isArray(p.likes) ? p.likes.length > 0 : false,
      bookmarked: Array.isArray(p.bookmarks) ? p.bookmarks.length > 0 : false,
      reposted: Array.isArray(p.reposts) ? p.reposts.length > 0 : false,
    },
  };
}

export function serializePost(p: AnyPost): any {
  const out: AnyPost = serializeOne(p);
  out.repostOf = p.repostOf ? serializeOne(p.repostOf) : null;
  out.quotedPost = p.quotedPost ? serializeOne(p.quotedPost) : null;
  return out;
}

export function serializePosts(posts: AnyPost[]): any[] {
  return posts.map(serializePost);
}
