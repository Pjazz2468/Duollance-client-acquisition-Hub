import { Router, type IRouter } from "express";
import { eq, count, avg, sql, desc, gte } from "drizzle-orm";
import { db, leadsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const [totals] = await db
    .select({
      totalLeads: count(),
      avgFitScore: avg(leadsTable.fitScore),
    })
    .from(leadsTable);

  const [approved] = await db
    .select({ count: count() })
    .from(leadsTable)
    .where(eq(leadsTable.approved, true));

  const [contacted] = await db
    .select({ count: count() })
    .from(leadsTable)
    .where(eq(leadsTable.stage, "contacted"));

  const [inDiscussion] = await db
    .select({ count: count() })
    .from(leadsTable)
    .where(eq(leadsTable.stage, "in_discussion"));

  const [onboarded] = await db
    .select({ count: count() })
    .from(leadsTable)
    .where(eq(leadsTable.stage, "onboarded"));

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const [newToday] = await db
    .select({ count: count() })
    .from(leadsTable)
    .where(gte(leadsTable.createdAt, yesterday));

  res.json({
    totalLeads: totals?.totalLeads ?? 0,
    approvedLeads: approved?.count ?? 0,
    contacted: contacted?.count ?? 0,
    inDiscussion: inDiscussion?.count ?? 0,
    onboarded: onboarded?.count ?? 0,
    avgFitScore: Number(totals?.avgFitScore ?? 0),
    newToday: newToday?.count ?? 0,
  });
});

router.get("/dashboard/pipeline", async (_req, res): Promise<void> => {
  const stages = await db
    .select({
      stage: leadsTable.stage,
      count: count(),
    })
    .from(leadsTable)
    .groupBy(leadsTable.stage);

  res.json(stages);
});

router.get("/dashboard/sources", async (_req, res): Promise<void> => {
  const sources = await db
    .select({
      source: leadsTable.source,
      count: count(),
    })
    .from(leadsTable)
    .groupBy(leadsTable.source);

  res.json(sources);
});

router.get("/dashboard/hot-leads", async (_req, res): Promise<void> => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const leads = await db
    .select()
    .from(leadsTable)
    .where(gte(leadsTable.createdAt, yesterday))
    .orderBy(desc(leadsTable.fitScore))
    .limit(10);

  res.json(
    leads.map((lead) => ({
      ...lead,
      followUpAt: lead.followUpAt ? lead.followUpAt.toISOString() : null,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
    })),
  );
});

export default router;
