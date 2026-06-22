import { Request, Response } from 'express';
import * as messageService from '../services/message.service';
import { publicUrl } from '../middleware/upload';

export async function listConversations(req: Request, res: Response) {
  const conversations = await messageService.listConversations(req.userId!);
  res.json({ conversations });
}

export async function startConversation(req: Request, res: Response) {
  const conversation = await messageService.getOrCreateConversation(req.userId!, req.body.username);
  res.status(201).json({ conversation });
}

export async function getConversation(req: Request, res: Response) {
  const conversation = await messageService.getConversation(req.params.id, req.userId!);
  res.json({ conversation });
}

export async function getMessages(req: Request, res: Response) {
  const { cursor, limit } = req.query as { cursor?: string; limit?: number };
  const result = await messageService.getMessages(req.params.id, req.userId!, cursor, limit);
  res.json(result);
}

export async function sendMessage(req: Request, res: Response) {
  const file = req.file as Express.Multer.File | undefined;
  const imageUrl = file ? publicUrl(file.filename) : undefined;
  const message = await messageService.sendMessage(
    req.params.id,
    req.userId!,
    req.body.content ?? '',
    imageUrl,
  );
  res.status(201).json({ message });
}

export async function markRead(req: Request, res: Response) {
  await messageService.markConversationRead(req.params.id, req.userId!);
  res.status(204).end();
}
