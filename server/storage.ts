import { payments, refunds, webhookEvents, type Payment, type InsertPayment, type Refund, type InsertRefund, type WebhookEvent, type InsertWebhookEvent } from "@shared/schema";

export interface IStorage {
  // Payment methods
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentByIntentId(paymentIntentId: string): Promise<Payment | undefined>;
  updatePayment(id: number, updates: Partial<Payment>): Promise<Payment | undefined>;
  deletePayment(id: number): Promise<boolean>;
  listPayments(limit?: number, offset?: number): Promise<Payment[]>;
  
  // Refund methods
  createRefund(refund: InsertRefund): Promise<Refund>;
  getRefund(id: number): Promise<Refund | undefined>;
  getRefundsByPaymentId(paymentId: number): Promise<Refund[]>;
  getRefundsByPaymentIntentId(paymentIntentId: string): Promise<Refund[]>;
  updateRefund(id: number, updates: Partial<Refund>): Promise<Refund | undefined>;
  listRefunds(limit?: number, offset?: number): Promise<Refund[]>;
  
  // Webhook methods
  createWebhookEvent(event: InsertWebhookEvent): Promise<WebhookEvent>;
  getWebhookEvent(eventId: string): Promise<WebhookEvent | undefined>;
  markWebhookEventProcessed(eventId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private payments: Map<number, Payment>;
  private refunds: Map<number, Refund>;
  private webhookEvents: Map<string, WebhookEvent>;
  private currentPaymentId: number;
  private currentRefundId: number;

  constructor() {
    this.payments = new Map();
    this.refunds = new Map();
    this.webhookEvents = new Map();
    this.currentPaymentId = 1;
    this.currentRefundId = 1;
  }

  // Payment methods
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = this.currentPaymentId++;
    const now = new Date();
    const payment: Payment = { 
      ...insertPayment,
      currency: insertPayment.currency || "gbp",
      description: insertPayment.description || null,
      customerEmail: insertPayment.customerEmail || null,
      cardLast4: insertPayment.cardLast4 || null,
      paymentMethodType: insertPayment.paymentMethodType || null,
      stripeFee: insertPayment.stripeFee || null,
      isLiveMode: insertPayment.isLiveMode || false,
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.payments.set(id, payment);
    return payment;
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }

  async getPaymentByIntentId(paymentIntentId: string): Promise<Payment | undefined> {
    return Array.from(this.payments.values()).find(
      (payment) => payment.paymentIntentId === paymentIntentId
    );
  }

  async updatePayment(id: number, updates: Partial<Payment>): Promise<Payment | undefined> {
    const payment = this.payments.get(id);
    if (!payment) return undefined;

    const updatedPayment: Payment = {
      ...payment,
      ...updates,
      updatedAt: new Date(),
    };
    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }

  async deletePayment(id: number): Promise<boolean> {
    return this.payments.delete(id);
  }

  async listPayments(limit = 50, offset = 0): Promise<Payment[]> {
    const allPayments = Array.from(this.payments.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return allPayments.slice(offset, offset + limit);
  }

  // Refund methods
  async createRefund(insertRefund: InsertRefund): Promise<Refund> {
    const id = this.currentRefundId++;
    const now = new Date();
    const refund: Refund = { 
      ...insertRefund,
      currency: insertRefund.currency || "gbp",
      notes: insertRefund.notes || null,
      isLiveMode: insertRefund.isLiveMode || false,
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.refunds.set(id, refund);
    return refund;
  }

  async getRefund(id: number): Promise<Refund | undefined> {
    return this.refunds.get(id);
  }

  async getRefundsByPaymentId(paymentId: number): Promise<Refund[]> {
    return Array.from(this.refunds.values()).filter(
      (refund) => refund.paymentId === paymentId
    );
  }

  async updateRefund(id: number, updates: Partial<Refund>): Promise<Refund | undefined> {
    const refund = this.refunds.get(id);
    if (!refund) return undefined;
    
    const updatedRefund: Refund = {
      ...refund,
      ...updates,
      updatedAt: new Date(),
    };
    this.refunds.set(id, updatedRefund);
    return updatedRefund;
  }

  async getRefundsByPaymentIntentId(paymentIntentId: string): Promise<Refund[]> {
    return Array.from(this.refunds.values()).filter(
      (refund) => refund.paymentIntentId === paymentIntentId
    );
  }

  async listRefunds(limit = 50, offset = 0): Promise<Refund[]> {
    const allRefunds = Array.from(this.refunds.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return allRefunds.slice(offset, offset + limit);
  }

  // Webhook methods
  async createWebhookEvent(insertEvent: InsertWebhookEvent): Promise<WebhookEvent> {
    const now = new Date();
    const event: WebhookEvent = { 
      ...insertEvent,
      isLiveMode: insertEvent.isLiveMode || false,
      processed: insertEvent.processed || false,
      id: this.webhookEvents.size + 1,
      createdAt: now 
    };
    this.webhookEvents.set(insertEvent.eventId, event);
    return event;
  }

  async getWebhookEvent(eventId: string): Promise<WebhookEvent | undefined> {
    return this.webhookEvents.get(eventId);
  }

  async markWebhookEventProcessed(eventId: string): Promise<void> {
    const event = this.webhookEvents.get(eventId);
    if (event) {
      this.webhookEvents.set(eventId, { ...event, processed: true });
    }
  }
}

export const storage = new MemStorage();
