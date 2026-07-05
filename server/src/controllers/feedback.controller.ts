import { Request, Response } from 'express';
import * as feedbackService from '../services/feedback.service';

export async function rateSite(req: Request, res: Response) {
  await feedbackService.upsertSiteRating(req.userId!, req.body.score, req.body.comment);
  const summary = await feedbackService.getSiteRatingSummary(req.userId!);
  res.json(summary);
}

export async function siteRatingSummary(req: Request, res: Response) {
  const summary = await feedbackService.getSiteRatingSummary(req.userId!);
  res.json(summary);
}
