import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { insertPaymentSchema, insertRefundSchema } from "@shared/schema";
import { z } from "zod";

// Environment variables validation
const testSecretKey = process.env.STRIPE_SECRET_KEY_TEST;
const liveSecretKey = process.env.STRIPE_SECRET_KEY_LIVE;
const testPublicKey = process.env.VITE_STRIPE_PUBLIC_KEY_TEST;
const livePublicKey = process.env.VITE_STRIPE_PUBLIC_KEY_LIVE;

if (!testSecretKey || !liveSecretKey) {
  throw new Error('Missing required Stripe keys. Need both TEST and LIVE keys.');
}

// Webhook secret is optional for basic functionality
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Default to test mode for safety
let currentMode: 'test' | 'live' = 'test';
let currentStripe = new Stripe(testSecretKey, {
  apiVersion: "2023-10-16",
});

// Function to switch Stripe mode safely
function switchStripeMode(mode: 'test' | 'live') {
  currentMode = mode;
  const secretKey = mode === 'live' ? liveSecretKey : testSecretKey;
  
  console.log(`🔄 SWITCHING TO ${mode.toUpperCase()} MODE`);
  console.log(`🔑 Using secret key: ${secretKey?.substring(0, 12)}...`);
  console.log(`🔑 Public key available: ${mode === 'live' ? !!livePublicKey : !!testPublicKey}`);
  
  currentStripe = new Stripe(secretKey!, {
    apiVersion: "2023-10-16",
  });
  
  return {
    mode: currentMode,
    secretKeyPrefix: secretKey?.substring(0, 12),
    publicKeyAvailable: mode === 'live' ? !!livePublicKey : !!testPublicKey,
    isLiveMode: mode === 'live'
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Switch Stripe mode endpoint
  app.post("/api/switch-mode", (req, res) => {
    const { mode } = req.body;
    
    if (mode !== 'test' && mode !== 'live') {
      return res.status(400).json({ error: "Mode must be 'test' or 'live'" });
    }
    
    const result = switchStripeMode(mode);
    console.log(`✅ MODE SWITCHED TO: ${mode.toUpperCase()}`);
    
    res.json(result);
  });

  // Get current Stripe configuration with detailed info
  app.get("/api/stripe-status", (req, res) => {
    const secretKey = currentMode === 'live' ? liveSecretKey : testSecretKey;
    const publicKey = currentMode === 'live' ? livePublicKey : testPublicKey;
    
    console.log(`📊 STATUS CHECK:`);
    console.log(`   Current Mode: ${currentMode.toUpperCase()}`);
    console.log(`   Secret Key: ${secretKey?.substring(0, 12)}...`);
    console.log(`   Public Key Available: ${!!publicKey}`);
    
    res.json({
      mode: currentMode,
      isLiveMode: currentMode === 'live',
      hasKeys: !!secretKey && !!publicKey,
      secretKeyPrefix: secretKey?.substring(0, 12),
      publicKeyAvailable: !!publicKey,
      keyDetails: {
        testKeysAvailable: !!testSecretKey && !!testPublicKey,
        liveKeysAvailable: !!liveSecretKey && !!livePublicKey
      }
    });
  });

  // Get public key for current mode
  app.get("/api/stripe-public-key", (req, res) => {
    const publicKey = currentMode === 'live' ? livePublicKey : testPublicKey;
    
    if (!publicKey) {
      return res.status(400).json({ 
        error: `No public key available for ${currentMode} mode` 
      });
    }
    
    console.log(`🔑 PROVIDING PUBLIC KEY for ${currentMode.toUpperCase()} mode: ${publicKey.substring(0, 12)}...`);
    
    res.json({ 
      publicKey,
      mode: currentMode
    });
  });
  
  // Create payment intent
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, currency = "gbp", description, customerEmail } = req.body;
      
      if (!amount || amount < 0.50) { // Minimum 50 pence
        return res.status(400).json({ error: "Amount must be at least £0.50" });
      }

      const paymentIntent = await currentStripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to pence
        currency,
        description: description || "Payment",
        metadata: {
          customer_email: customerEmail || "",
        },
      });

      // Store payment in database
      await storage.createPayment({
        paymentIntentId: paymentIntent.id,
        amount: Math.round(amount * 100),
        currency,
        status: paymentIntent.status,
        customerEmail: customerEmail || null,
        description: description || null,
        isLiveMode,
        cardLast4: null,
        paymentMethodType: null,
        stripeFee: null,
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id 
      });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ 
        error: "Error creating payment intent: " + error.message 
      });
    }
  });

  // Get payment status
  app.get("/api/payment-status/:paymentIntentId", async (req, res) => {
    try {
      const { paymentIntentId } = req.params;
      
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      const payment = await storage.getPaymentByIntentId(paymentIntentId);

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      res.json({
        paymentIntent,
        payment,
      });
    } catch (error: any) {
      console.error("Error retrieving payment status:", error);
      res.status(500).json({ 
        error: "Error retrieving payment status: " + error.message 
      });
    }
  });

  // Update payment status after successful confirmation
  app.post("/api/update-payment-status", async (req, res) => {
    try {
      const { paymentIntentId } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ error: "Payment Intent ID is required" });
      }

      // Get the latest payment status from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      const payment = await storage.getPaymentByIntentId(paymentIntentId);

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      // Get charge details if payment succeeded
      let cardLast4 = null;
      let paymentMethodType = null;
      let stripeFee = null;

      if (paymentIntent.status === 'succeeded' && paymentIntent.latest_charge) {
        const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
        cardLast4 = charge.payment_method_details?.card?.last4 || null;
        paymentMethodType = charge.payment_method_details?.type || null;
        stripeFee = charge.balance_transaction ? (charge.balance_transaction as any).fee : null;
      }

      // Update payment in database
      const updatedPayment = await storage.updatePayment(payment.id, {
        status: paymentIntent.status,
        cardLast4,
        paymentMethodType,
        stripeFee,
      });

      res.json({ 
        success: true, 
        payment: updatedPayment 
      });
    } catch (error: any) {
      console.error("Error updating payment status:", error);
      res.status(500).json({ 
        error: "Error updating payment status: " + error.message 
      });
    }
  });

  // List payments
  app.get("/api/payments", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const payments = await storage.listPayments(limit, offset);
      res.json(payments);
    } catch (error: any) {
      console.error("Error listing payments:", error);
      res.status(500).json({ 
        error: "Error listing payments: " + error.message 
      });
    }
  });

  // Create refund
  app.post("/api/create-refund", async (req, res) => {
    try {
      const { paymentIntentId, amount, reason = "requested_by_customer", notes } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ error: "Payment Intent ID is required" });
      }

      const payment = await storage.getPaymentByIntentId(paymentIntentId);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      if (payment.status !== "succeeded") {
        return res.status(400).json({ error: "Can only refund succeeded payments" });
      }

      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        reason: reason as Stripe.RefundCreateParams.Reason,
        metadata: {
          notes: notes || "",
        },
      };

      if (amount) {
        refundParams.amount = Math.round(amount * 100); // Convert to pence
      }

      const refund = await stripe.refunds.create(refundParams);

      // Store refund in database
      const storedRefund = await storage.createRefund({
        refundId: refund.id,
        paymentId: payment.id,
        paymentIntentId,
        amount: refund.amount,
        currency: refund.currency,
        reason,
        status: refund.status || "processing",
        notes: notes || null,
        isLiveMode,
      });

      res.json({ refund, storedRefund });
    } catch (error: any) {
      console.error("Error creating refund:", error);
      res.status(500).json({ 
        error: "Error creating refund: " + error.message 
      });
    }
  });

  // Get refunds for payment
  app.get("/api/refunds/:paymentIntentId", async (req, res) => {
    try {
      const { paymentIntentId } = req.params;
      const refunds = await storage.getRefundsByPaymentIntentId(paymentIntentId);
      res.json(refunds);
    } catch (error: any) {
      console.error("Error getting refunds:", error);
      res.status(500).json({ 
        error: "Error getting refunds: " + error.message 
      });
    }
  });

  // List all refunds
  app.get("/api/refunds", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const refunds = await storage.listRefunds(limit, offset);
      res.json(refunds);
    } catch (error: any) {
      console.error("Error listing refunds:", error);
      res.status(500).json({ 
        error: "Error listing refunds: " + error.message 
      });
    }
  });

  // Clear test payments with requires_payment_method status
  app.delete("/api/clear-test-payments", async (req, res) => {
    try {
      const payments = await storage.listPayments();
      const testPayments = payments.filter(p => p.status === 'requires_payment_method');
      
      for (const payment of testPayments) {
        await storage.deletePayment(payment.id);
      }
      
      res.json({ message: `Cleared ${testPayments.length} test payments` });
    } catch (error: any) {
      res.status(500).json({ message: "Error clearing test payments: " + error.message });
    }
  });

  // Stripe webhook endpoint
  app.post("/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
    if (!webhookSecret) {
      return res.status(400).send('Webhook endpoint not configured - missing STRIPE_WEBHOOK_SECRET');
    }

    const sig = req.headers['stripe-signature'];

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed:`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      // Store webhook event
      await storage.createWebhookEvent({
        eventId: event.id,
        eventType: event.type,
        data: JSON.stringify(event.data),
        processed: false,
        isLiveMode,
      });

      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntentSucceeded = event.data.object as Stripe.PaymentIntent;
          const payment = await storage.getPaymentByIntentId(paymentIntentSucceeded.id);
          if (payment) {
            // Get latest charge details from Stripe
            const charges = await stripe.charges.list({
              payment_intent: paymentIntentSucceeded.id,
              limit: 1,
            });
            
            const charge = charges.data[0];
            await storage.updatePayment(payment.id, {
              status: 'succeeded',
              cardLast4: charge?.payment_method_details?.card?.last4 || null,
              paymentMethodType: charge?.payment_method_details?.type || null,
              stripeFee: charge?.balance_transaction ? 
                (charge.balance_transaction as any).fee : null,
            });
          }
          break;

        case 'payment_intent.payment_failed':
          const paymentIntentFailed = event.data.object as Stripe.PaymentIntent;
          const failedPayment = await storage.getPaymentByIntentId(paymentIntentFailed.id);
          if (failedPayment) {
            await storage.updatePayment(failedPayment.id, {
              status: 'failed',
            });
          }
          break;

        case 'refund.updated':
          const refundUpdated = event.data.object as Stripe.Refund;
          // Update refund status in database
          // Note: In a real implementation, you'd find the refund by ID and update it
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      // Mark event as processed
      await storage.markWebhookEventProcessed(event.id);
      res.json({ received: true });
    } catch (error: any) {
      console.error("Error processing webhook:", error);
      res.status(500).json({ error: "Error processing webhook" });
    }
  });

  // Get Stripe mode status
  app.get("/api/stripe-status", (req, res) => {
    res.json({
      isLiveMode,
      hasKeys: !!process.env.STRIPE_SECRET_KEY_LIVE,
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
