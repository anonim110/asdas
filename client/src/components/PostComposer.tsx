import { useRef, useState } from 'react';
import { ImagePlus, X, Smile } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../store/auth';
import { toast } from '../store/toast';
import { Avatar } from './Avatar';
import { ProgressRing } from './ProgressRing';
import { EmojiPicker } from './EmojiPicker';
import type { Post } from '../types';

const MAX = 280;
const MAX_FILES = 4;

interface Props {
  placeholder?: string;
  parentId?: string;
  quotedPostId?: string;
  autoFocus?: boolean;
  compact?: boolean;
  onPosted?: (post: Post) => void;
}

interface Attachment {
  file: File;
  preview: string;
}

// Shared composer for top-level posts, replies and quotes.
export function PostComposer({
  placeholder = "What's happening?",
  parentId,
  quotedPostId,
  autoFocus,
  compact,
  onPosted,
}: Props) {
  const user = useAuth((s) => s.user);
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [files, setFiles] = useState<Attachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const remaining = MAX - text.length;
  const overLimit = remaining < 0;
  const canSubmit = (text.trim().length > 0 || files.length > 0) && !overLimit && !submitting;

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const file of Array.from(list)) {
      if (next.length >= MAX_FILES) break;
      next.push({ file, preview: URL.createObjectURL(file) });
    }
    setFiles(next);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const form = new FormData();
      if (text.trim()) form.append('content', text.trim());
      if (parentId) form.append('parentId', parentId);
      if (quotedPostId) form.append('quotedPostId', quotedPostId);
      files.forEach((f) => form.append('media', f.file));

      const { data } = await api.post<{ post: Post }>('/posts', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setText('');
      setFiles([]);
      // Refresh feeds / threads that may now include this post.
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      if (parentId) {
        queryClient.invalidateQueries({ queryKey: ['thread', parentId] });
        queryClient.invalidateQueries({ queryKey: ['post', parentId] });
      }
      toast(parentId ? 'Reply posted' : quotedPostId ? 'Quote posted' : 'Your post is live', 'success');
      onPosted?.(data.post);
    } catch (err) {
      setError(errorMessage(err, 'Could not publish your post'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <div className="flex gap-3">
      <Avatar user={user} linkable={false} />
      <div className="flex-1">
        <textarea
          autoFocus={autoFocus}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={compact ? 2 : 3}
          className="w-full resize-none bg-transparent text-lg outline-none placeholder:text-gray-500"
        />

        {files.length > 0 && (
          <div className={`grid gap-2 ${files.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} mb-2`}>
            {files.map((f, i) => (
              <div key={i} className="relative">
                {f.file.type.startsWith('video/') ? (
                  <video src={f.preview} className="max-h-64 w-full rounded-2xl object-cover" controls />
                ) : (
                  <img src={f.preview} className="max-h-64 w-full rounded-2xl object-cover" />
                )}
                <button
                  onClick={() => removeFile(i)}
                  className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="mb-2 text-sm text-red-500">{error}</p>}

        <div className="flex items-center justify-between border-t border-gray-100 pt-2 dark:border-gray-900">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={files.length >= MAX_FILES}
              className="rounded-full p-2 text-brand hover:bg-brand/10 disabled:opacity-40"
              title="Add media"
            >
              <ImagePlus size={20} />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setEmojiOpen((o) => !o)}
                className="rounded-full p-2 text-brand hover:bg-brand/10"
                title="Add emoji"
              >
                <Smile size={20} />
              </button>
              {emojiOpen && (
                <EmojiPicker onPick={(e) => setText((t) => t + e)} onClose={() => setEmojiOpen(false)} />
              )}
            </div>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={(e) => addFiles(e.target.files)}
          />

          <div className="flex items-center gap-3">
            {text.length > 0 && <ProgressRing value={text.length} max={MAX} />}
            <button onClick={submit} disabled={!canSubmit} className="btn-primary">
              {parentId ? 'Reply' : quotedPostId ? 'Quote' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
