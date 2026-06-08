import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, outreachTable } from "@workspace/db";
import {
  ListOutreachQueryParams,
  CreateOutreachBody,
  UpdateOutreachParams,
  UpdateOutreachBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/outreach", async (req, res): Promise<void> => {
  const query = ListOutreachQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let q = db.select().from(outreachTable).$dynamic();
  if (query.data.leadId) {
    q = q.where(eq(outreachTable.leadId, query.data.leadId));
  }

  const messages = await q.orderBy(desc(outreachTable.createdAt));
  res.json(messages.map(serializeOutreach));
});

router.post("/outreach", async (req, res): Promise<void> => {
  const parsed = CreateOutreachBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [msg] = await db
    .insert(outreachTable)
    .values({
      leadId: parsed.data.leadId,
      channel: parsed.data.channel || "email",
      message: parsed.data.message,
      status: parsed.data.status || "draft",
    })
    .returning();

  res.status(201).json(serializeOutreach(msg));
});

router.patch("/outreach/:id", async (req, res): Promise<void> => {
  const params = UpdateOutreachParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateOutreachBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.sentAt) {
    updateData.sentAt = new Date(parsed.data.sentAt);
  }

  const [msg] = await db
    .update(outreachTable)
    .set(updateData)
    .where(eq(outreachTable.id, params.data.id))
    .returning();

  if (!msg) {
    res.status(404).json({ error: "Outreach not found" });
    return;
  }

  res.json(serializeOutreach(msg));
});

function serializeOutreach(msg: typeof outreachTable.$inferSelect) {
  return {
    ...msg,
    sentAt: msg.sentAt ? msg.sentAt.toISOString() : null,
    createdAt: msg.createdAt.toISOString(),
  };
}

export default router;
