const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Order
const createOrder = async ({ amount, currency = 'INR', receipt, notes = {} }) => {
  try {
    const options = {
      amount: Math.round(amount * 100), // Convert to paisa
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes,
    };

    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    throw error;
  }
};

// Verify Payment Signature
const verifyPaymentSignature = (orderId, paymentId, signature) => {
  try {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Razorpay signature verification error:', error);
    return false;
  }
};

// Capture Payment
const capturePayment = async (paymentId, amount) => {
  try {
    const payment = await razorpay.payments.capture(
      paymentId,
      Math.round(amount * 100), // Convert to paisa
      'INR'
    );
    return payment;
  } catch (error) {
    console.error('Razorpay payment capture error:', error);
    throw error;
  }
};

// Fetch Payment Details
const fetchPayment = async (paymentId) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Razorpay fetch payment error:', error);
    throw error;
  }
};

// Create Refund
const createRefund = async (paymentId, amount = null, notes = {}) => {
  try {
    const refundData = {
      notes,
    };

    if (amount) {
      refundData.amount = Math.round(amount * 100); // Convert to paisa
    }

    const refund = await razorpay.payments.refund(paymentId, refundData);
    return refund;
  } catch (error) {
    console.error('Razorpay refund error:', error);
    throw error;
  }
};

// Fetch Order Details
const fetchOrder = async (orderId) => {
  try {
    const order = await razorpay.orders.fetch(orderId);
    return order;
  } catch (error) {
    console.error('Razorpay fetch order error:', error);
    throw error;
  }
};

// Create Customer
const createCustomer = async ({ name, email, contact, notes = {} }) => {
  try {
    const customer = await razorpay.customers.create({
      name,
      email,
      contact,
      notes,
    });
    return customer;
  } catch (error) {
    console.error('Razorpay customer creation error:', error);
    throw error;
  }
};

// Webhook signature verification
const verifyWebhookSignature = (body, signature, secret = process.env.RAZORPAY_KEY_SECRET) => {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(body))
      .digest('hex');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Razorpay webhook verification error:', error);
    return false;
  }
};

module.exports = {
  createOrder,
  verifyPaymentSignature,
  capturePayment,
  fetchPayment,
  createRefund,
  fetchOrder,
  createCustomer,
  verifyWebhookSignature,
  razorpay
};