import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
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
  apiVersion: "2024-06-20",
});

// Function to switch Stripe mode safely
function switchStripeMode(mode: 'test' | 'live') {
  currentMode = mode;
  const secretKey = mode === 'live' ? liveSecretKey : testSecretKey;
  
  console.log(`🔄 SWITCHING TO ${mode.toUpperCase()} MODE`);
  console.log(`🔑 Using secret key: ${secretKey?.substring(0, 12)}...`);
  console.log(`🔑 Public key available: ${mode === 'live' ? !!livePublicKey : !!testPublicKey}`);
  
  currentStripe = new Stripe(secretKey!, {
    apiVersion: "2024-06-20",
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
      const payment = await storage.createPayment({
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
        status: paymentIntent.status,
        description: description || null,
        customerEmail: customerEmail || null,
        isLiveMode: currentMode === 'live',
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentId: payment.id
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
      
      const paymentIntent = await currentStripe.paymentIntents.retrieve(paymentIntentId);
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
      const paymentIntent = await currentStripe.paymentIntents.retrieve(paymentIntentId);
      const payment = await storage.getPaymentByIntentId(paymentIntentId);

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      // Get charge details if payment succeeded
      let cardLast4 = null;
      let paymentMethodType = null;
      let stripeFee = null;

      if (paymentIntent.status === 'succeeded' && paymentIntent.charges?.data?.length > 0) {
        const charge = paymentIntent.charges.data[0];
        
        if (charge.payment_method_details?.card) {
          cardLast4 = charge.payment_method_details.card.last4;
          paymentMethodType = charge.payment_method_details.card.brand;
        }
        
        if (charge.balance_transaction) {
          const balanceTransaction = await currentStripe.balanceTransactions.retrieve(charge.balance_transaction as string);
          stripeFee = balanceTransaction.fee;
        }
      }

      // Update payment status in database
      const updatedPayment = await storage.updatePayment(payment.id, {
        status: paymentIntent.status,
        cardLast4,
        paymentMethodType,
        stripeFee,
      });

      res.json({ 
        success: true, 
        payment: updatedPayment,
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
        }
      });
    } catch (error: any) {
      console.error("Error updating payment status:", error);
      res.status(500).json({ 
        error: "Error updating payment status: " + error.message 
      });
    }
  });

  // List all payments
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

      const refund = await currentStripe.refunds.create(refundParams);

      // Store refund in database
      const storedRefund = await storage.createRefund({
        refundId: refund.id,
        paymentId: payment.id,
        paymentIntentId,
        amount: refund.amount / 100, // Convert pence back to pounds for database storage
        currency: refund.currency,
        reason,
        status: refund.status || "processing",
        notes: notes || null,
        isLiveMode: currentMode === 'live',
      });

      res.json({ refund: storedRefund });
    } catch (error: any) {
      console.error("Error creating refund:", error);
      res.status(500).json({ 
        error: "Error creating refund: " + error.message 
      });
    }
  });

  // Get refunds by payment intent ID
  app.get("/api/refunds/:paymentIntentId", async (req, res) => {
    try {
      const refunds = await storage.getRefundsByPaymentIntentId(req.params.paymentIntentId);
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

  // Sync historical data from Stripe
  app.post("/api/sync-stripe-history", async (req, res) => {
    try {
      console.log("🔄 Starting Stripe historical data sync...");
      
      let syncedPayments = 0;
      let syncedRefunds = 0;
      
      // Sync Payment Intents
      console.log(`📥 Fetching payment intents from Stripe (${currentMode} mode)...`);
      const paymentIntents = await currentStripe.paymentIntents.list({ 
        limit: 100,
        expand: ['data.charges.data.payment_method']
      });
      
      for (const pi of paymentIntents.data) {
        // Check if payment already exists
        const existingPayment = await storage.getPaymentByIntentId(pi.id);
        
        if (!existingPayment) {
          // Extract payment method info if available
          let cardLast4 = null;
          let paymentMethodType = null;
          
          if (pi.charges?.data?.[0]?.payment_method) {
            const pm = pi.charges.data[0].payment_method;
            if (typeof pm === 'object' && pm !== null && 'card' in pm && pm.card) {
              cardLast4 = pm.card.last4;
              paymentMethodType = pm.type;
            }
          }
          
          const paymentData = {
            paymentIntentId: pi.id,
            amount: pi.amount / 100, // Convert from cents
            currency: pi.currency,
            status: pi.status,
            description: pi.description || null,
            customerEmail: pi.receipt_email || null,
            cardLast4,
            paymentMethodType,
            stripeFee: null, // Would need separate API call for exact fee
            isLiveMode: currentMode === 'live'
          };
          
          await storage.createPayment(paymentData);
          syncedPayments++;
        }
      }
      
      // Sync Refunds
      console.log(`📥 Fetching refunds from Stripe (${currentMode} mode)...`);
      const refunds = await currentStripe.refunds.list({ 
        limit: 100,
        expand: ['data.charge.payment_intent']
      });
      
      for (const refund of refunds.data) {
        // Check if refund already exists
        const existingRefunds = await storage.getRefundsByPaymentIntentId(refund.payment_intent as string);
        const alreadyExists = existingRefunds.some(r => r.refundId === refund.id);
        
        if (!alreadyExists) {
          // Find the corresponding payment in our database
          const payment = await storage.getPaymentByIntentId(refund.payment_intent as string);
          
          if (payment) {
            const refundData = {
              paymentId: payment.id,
              paymentIntentId: refund.payment_intent as string,
              refundId: refund.id,
              amount: refund.amount / 100, // Convert from cents
              currency: refund.currency,
              status: refund.status || 'pending',
              reason: (refund.reason as 'requested_by_customer' | 'duplicate' | 'fraudulent') || 'requested_by_customer',
              notes: refund.metadata?.notes || null,
              isLiveMode: currentMode === 'live'
            };
            
            await storage.createRefund(refundData);
            syncedRefunds++;
          }
        }
      }
      
      console.log(`✅ Sync complete: ${syncedPayments} payments, ${syncedRefunds} refunds`);
      
      res.json({
        success: true,
        syncedPayments,
        syncedRefunds,
        mode: currentMode
      });
      
    } catch (error: any) {
      console.error("❌ Error syncing Stripe history:", error);
      res.status(500).json({ 
        message: "Error syncing Stripe history: " + error.message,
        error: error.message 
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

  // Fix currency amounts - one-time fix for existing records
  app.post("/api/fix-currency", async (req, res) => {
    try {
      const refunds = await storage.listRefunds();
      let fixedCount = 0;
      
      for (const refund of refunds) {
        // Fix refunds that have amounts in pence instead of pounds (amount = 50 should be 0.50)
        if (refund.amount === 50) {
          const correctedAmount = 0.50;
          await storage.updateRefund(refund.id, { amount: correctedAmount });
          console.log(`Fixed refund ${refund.id}: ${refund.amount} → ${correctedAmount}`);
          fixedCount++;
        }
      }
      
      res.json({ 
        message: `Fixed ${fixedCount} refund records`,
        fixedCount 
      });
    } catch (error: any) {
      console.error("Error fixing currency:", error);
      res.status(500).json({ 
        error: "Error fixing currency: " + error.message 
      });
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
      event = currentStripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
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
        isLiveMode: currentMode === 'live',
      });

      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntentSucceeded = event.data.object as Stripe.PaymentIntent;
          // Update payment status in database
          const payment = await storage.getPaymentByIntentId(paymentIntentSucceeded.id);
          if (payment) {
            await storage.updatePayment(payment.id, {
              status: 'succeeded',
            });
          }
          break;

        case 'payment_intent.payment_failed':
          const paymentIntentFailed = event.data.object as Stripe.PaymentIntent;
          // Update payment status in database
          const failedPayment = await storage.getPaymentByIntentId(paymentIntentFailed.id);
          if (failedPayment) {
            await storage.updatePayment(failedPayment.id, {
              status: 'failed',
            });
          }
          break;

        case 'refund.created':
          const refundCreated = event.data.object as Stripe.Refund;
          // Update refund status in database
          // Note: In a real implementation, you'd find the refund by ID and update it
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

  const httpServer = createServer(app);
  return httpServer;
}