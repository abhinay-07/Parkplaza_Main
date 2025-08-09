const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create Payment Intent
const createPaymentIntent = async ({ amount, currency = 'inr', metadata = {} }) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to paisa/cents
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    };
  } catch (error) {
    console.error('Stripe payment intent creation error:', error);
    throw error;
  }
};

// Confirm Payment
const confirmPayment = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Stripe payment confirmation error:', error);
    throw error;
  }
};

// Create Customer
const createCustomer = async ({ email, name, phone }) => {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      phone,
    });
    return customer;
  } catch (error) {
    console.error('Stripe customer creation error:', error);
    throw error;
  }
};

// Create refund
const createRefund = async (paymentIntentId, amount = null) => {
  try {
    const refundData = {
      payment_intent: paymentIntentId,
    };
    
    if (amount) {
      refundData.amount = Math.round(amount * 100); // Convert to paisa/cents
    }

    const refund = await stripe.refunds.create(refundData);
    return refund;
  } catch (error) {
    console.error('Stripe refund error:', error);
    throw error;
  }
};

// Webhook signature verification
const verifyWebhookSignature = (payload, signature) => {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    return event;
  } catch (error) {
    console.error('Stripe webhook verification error:', error);
    throw error;
  }
};

// Create Setup Intent for saving payment methods
const createSetupIntent = async (customerId) => {
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });
    return setupIntent;
  } catch (error) {
    console.error('Stripe setup intent error:', error);
    throw error;
  }
};

// Get payment methods for a customer
const getPaymentMethods = async (customerId) => {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    return paymentMethods;
  } catch (error) {
    console.error('Stripe get payment methods error:', error);
    throw error;
  }
};

module.exports = {
  createPaymentIntent,
  confirmPayment,
  createCustomer,
  createRefund,
  verifyWebhookSignature,
  createSetupIntent,
  getPaymentMethods,
  stripe
};