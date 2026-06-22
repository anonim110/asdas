import { useInfiniteQuery } from '@tanstack/react-query';
import { useIntersection } from '../hooks/useIntersection';
import { PostCard } from './PostCard';
import { PostSkeletonList } from './PostSkeleton';
import { Spinner } from './Spinner';
import type { Post } from '../types';

interface PageResult {
  items: Post[];
  next: string | number | null;
}

interface Props {
  queryKey: unknown[];
  fetchPage: (pageParam: string | number | undefined) => Promise<PageResult>;
  initialPageParam?: string | number;
  emptyText?: string;
  subscribeRealtime?: boolean;
}

// Generic cursor/page-based infinite feed shared by Home, Explore, Profile,
// Bookmarks, Hashtag and Search.
export function Feed({ queryKey, fetchPage, initialPageParam, emptyText = 'Nothing here yet.', subscribeRealtime }: Props) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam as string | number | undefined),
    initialPageParam,
    getNextPageParam: (last) => last.next ?? undefined,
  });

  const sentinelRef = useIntersection(
    () => {
      if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
    },
    query.hasNextPage && !query.isFetchingNextPage,
  );

  if (query.isLoading) return <PostSkeletonList />;
  if (query.isError)
    return <p className="p-6 text-center text-red-500">Could not load posts. Please try again.</p>;

  const posts = query.data?.pages.flatMap((p) => p.items) ?? [];
  // De-duplicate (reposts of the same original can appear across pages).
  const seen = new Set<string>();
  const unique = posts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  if (unique.length === 0) return <p className="p-8 text-center text-gray-500">{emptyText}</p>;

  return (
    <div>
      {unique.map((post) => (
        <PostCard key={post.id} post={post} subscribeRealtime={subscribeRealtime} />
      ))}
      <div ref={sentinelRef} />
      {query.isFetchingNextPage && <Spinner />}
      {!query.hasNextPage && <p className="py-8 text-center text-sm text-gray-500">You're all caught up.</p>}
    </div>
  );
}
