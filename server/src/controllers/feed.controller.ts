import { Request, Response } from 'express';
import * as feedService from '../services/feed.service';

export async function home(req: Request, res: Response) {
  const { cursor, limit } = req.query as { cursor?: string; limit?: number };
  const result = await feedService.getHomeFeed(req.userId!, cursor, limit);
  res.json(result);
}

export async function explore(req: Request, res: Response) {
  const { page, limit } = req.query as { page?: number; limit?: number };
  const result = await feedService.getExploreFeed(req.userId, page ?? 0, limit);
  res.json(result);
}

export async function userPosts(req: Request, res: Response) {
  const { tab, cursor, limit } = req.query as {
    tab?: feedService.ProfileTab;
    cursor?: string;
    limit?: number;
  };
  const result = await feedService.getUserPosts(
    req.params.username,
    tab ?? 'posts',
    req.userId,
    cursor,
    limit,
  );
  res.json(result);
}
