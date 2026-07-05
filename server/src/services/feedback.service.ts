import { prisma } from '../config/prisma';

// Site feedback: the emoji-slider rating widget in Settings.
// One rating per user; submitting again overwrites the previous score.

export async function upsertSiteRating(userId: string, score: number, comment?: string) {
  const rating = await prisma.siteRating.upsert({
    where: { userId },
    create: { userId, score, comment: comment || null },
    update: { score, comment: comment || null },
  });
  return rating;
}

export async function getSiteRatingSummary(userId: string) {
  const [mine, aggregate] = await Promise.all([
    prisma.siteRating.findUnique({ where: { userId } }),
    prisma.siteRating.aggregate({ _avg: { score: true }, _count: true }),
  ]);
  return {
    mine: mine ? { score: mine.score, comment: mine.comment, updatedAt: mine.updatedAt } : null,
    average: aggregate._avg.score ? Math.round(aggregate._avg.score * 10) / 10 : null,
    count: aggregate._count,
  };
}
