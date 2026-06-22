import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { PageHeader } from '../components/PageHeader';
import { PostCard } from '../components/PostCard';
import { PostComposer } from '../components/PostComposer';
import { Feed } from '../components/Feed';
import { Spinner } from '../components/Spinner';
import type { Post } from '../types';

export function PostDetail() {
  const { id = '' } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['thread', id],
    queryFn: async () =>
      (await api.get<{ post: Post; ancestors: Post[] }>(`/posts/${id}/thread`)).data,
  });

  return (
    <div>
      <PageHeader title="Post" back />

      {isLoading && <Spinner />}
      {isError && <p className="p-6 text-center text-red-500">This post could not be found.</p>}

      {data && (
        <>
          {/* Ancestor chain */}
          {data.ancestors.map((p) => (
            <PostCard key={p.id} post={p} showThreadLine />
          ))}

          {/* Focused post with live counts */}
          <PostCard post={data.post} subscribeRealtime />

          {/* Reply composer */}
          <div className="card px-4 py-3">
            <PostComposer parentId={data.post.id} placeholder="Post your reply" compact />
          </div>

          {/* Replies */}
          <Feed
            queryKey={['replies', id]}
            fetchPage={async (pageParam) => {
              const { data: r } = await api.get<{ items: Post[]; nextCursor: string | null }>(
                `/posts/${id}/replies`,
                { params: { cursor: pageParam } },
              );
              return { items: r.items, next: r.nextCursor };
            }}
            emptyText="No replies yet. Be the first to reply!"
          />
        </>
      )}
    </div>
  );
}
