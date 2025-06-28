import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  paymentIntentId: text("payment_intent_id").notNull().unique(),
  amount: integer("amount").notNull(), // Amount in pence
  currency: text("currency").notNull().default("gbp"),
  status: text("status").notNull(), // succeeded, failed, processing, requires_action
  customerEmail: text("customer_email"),
  description: text("description"),
  cardLast4: text("card_last4"),
  paymentMethodType: text("payment_method_type"),
  isLiveMode: boolean("is_live_mode").notNull().default(false),
  stripeFee: integer("stripe_fee"), // Fee in pence
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const refunds = pgTable("refunds", {
  id: serial("id").primaryKey(),
  refundId: text("refund_id").notNull().unique(),
  paymentId: integer("payment_id").notNull().references(() => payments.id),
  paymentIntentId: text("payment_intent_id").notNull(),
  amount: integer("amount").notNull(), // Amount in pence
  currency: text("currency").notNull().default("gbp"),
  reason: text("reason").notNull(), // requested_by_customer, duplicate, fraudulent
  status: text("status").notNull(), // succeeded, failed, processing
  notes: text("notes"),
  isLiveMode: boolean("is_live_mode").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const webhookEvents = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  data: text("data").notNull(), // JSON string
  processed: boolean("processed").notNull().default(false),
  isLiveMode: boolean("is_live_mode").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRefundSchema = createInsertSchema(refunds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({
  id: true,
  createdAt: true,
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Refund = typeof refunds.$inferSelect;
export type InsertRefund = z.infer<typeof insertRefundSchema>;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
