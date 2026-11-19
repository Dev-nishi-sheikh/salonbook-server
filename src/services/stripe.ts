import Stripe from 'stripe';
import { config } from '../config';

const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2024-04-10',
});

export const createCheckoutSession = async (
  amount: number,
  currency: string,
  successUrl: string,
  cancelUrl: string,
  metadata: Record<string, string>
): Promise<Stripe.Checkout.Session> => {
  return stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: metadata.serviceName || 'Salon Appointment',
            description: metadata.description || 'Payment for salon appointment',
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
  });
};

export const verifyWebhookSignature = (
  payload: string | Buffer,
  signature: string
): Stripe.Event => {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    config.stripe.webhookSecret
  );
};

export const retrieveSession = async (sessionId: string): Promise<Stripe.Checkout.Session> => {
  return stripe.checkout.sessions.retrieve(sessionId);
};

export { stripe };