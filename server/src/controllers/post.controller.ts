import { Request, Response } from 'express';
import * as postService from '../services/post.service';
import { MediaType } from '../types/enums';
import { storeUploadedFile } from '../middleware/upload';
import type { MediaInput } from '../services/post.service';

function mediaTypeFromMime(mime: string): MediaType {
  if (mime === 'image/gif') return 'GIF';
  if (mime.startsWith('video/')) return 'VIDEO';
  return 'IMAGE';
}

async function filesToMedia(req: Request): Promise<MediaInput[]> {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  return Promise.all(
    files.map(async (file) => ({
      url: await storeUploadedFile(file),
      type: mediaTypeFromMime(file.mimetype),
    })),
  );
}

export async function create(req: Request, res: Response) {
  const media = await filesToMedia(req);
  const post = await postService.createPost({
    authorId: req.userId!,
    content: req.body.content,
    parentId: req.body.parentId || undefined,
    quotedPostId: req.body.quotedPostId || undefined,
    media,
  });
  res.status(201).json({ post });
}

export async function getOne(req: Request, res: Response) {
  const post = await postService.getPostById(req.params.id, req.userId);
  res.json({ post });
}

export async function getThread(req: Request, res: Response) {
  const result = await postService.getThread(req.params.id, req.userId);
  res.json(result);
}

export async function getReplies(req: Request, res: Response) {
  const { cursor, limit } = req.query as { cursor?: string; limit?: number };
  const result = await postService.getReplies(req.params.id, req.userId, cursor, limit);
  res.json(result);
}

export async function remove(req: Request, res: Response) {
  await postService.deletePost(req.params.id, req.userId!);
  res.status(204).end();
}

export async function update(req: Request, res: Response) {
  const post = await postService.updatePost(req.params.id, req.userId!, req.body.content ?? '');
  res.json({ post });
}

export async function like(req: Request, res: Response) {
  const result = await postService.likePost(req.params.id, req.userId!);
  res.json(result);
}

export async function unlike(req: Request, res: Response) {
  const result = await postService.unlikePost(req.params.id, req.userId!);
  res.json(result);
}

export async function repost(req: Request, res: Response) {
  const result = await postService.repost(req.params.id, req.userId!);
  res.json(result);
}

export async function unrepost(req: Request, res: Response) {
  const result = await postService.unrepost(req.params.id, req.userId!);
  res.json(result);
}

export async function bookmark(req: Request, res: Response) {
  await postService.bookmarkPost(req.params.id, req.userId!);
  res.status(204).end();
}

export async function unbookmark(req: Request, res: Response) {
  await postService.unbookmarkPost(req.params.id, req.userId!);
  res.status(204).end();
}

export async function listBookmarks(req: Request, res: Response) {
  const { cursor, limit } = req.query as { cursor?: string; limit?: number };
  const result = await postService.listBookmarks(req.userId!, cursor, limit);
  res.json(result);
}

export async function pin(req: Request, res: Response) {
  await postService.pinPost(req.params.id, req.userId!);
  res.status(204).end();
}

export async function unpin(req: Request, res: Response) {
  await postService.unpinPost(req.userId!);
  res.status(204).end();
}
