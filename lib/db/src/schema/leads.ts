import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  contactTitle: text("contact_title"),
  contactEmail: text("contact_email"),
  contactLinkedIn: text("contact_linkedin"),
  companySize: text("company_size"),
  industry: text("industry"),
  source: text("source").notNull().default("manual"),
  sourceUrl: text("source_url"),
  sourceContext: text("source_context"),
  painPoint: text("pain_point").notNull().default("other"),
  fitScore: integer("fit_score").notNull().default(50),
  stage: text("stage").notNull().default("discovered"),
  approved: boolean("approved").notNull().default(false),
  notes: text("notes"),
  followUpAt: timestamp("follow_up_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;
