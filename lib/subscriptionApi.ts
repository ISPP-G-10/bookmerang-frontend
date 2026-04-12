import { apiRequest } from './api';

export interface SubscriptionStatus {
  isPremium: boolean;
  subscription?: {
    id: number;
    platform: string;
    status: string;
    periodEnd: string;
    cancelsAtPeriodEnd: boolean;
  };
}

export interface CheckoutSession {
  checkoutUrl: string;
}

/**
 * Get the current subscription status for the authenticated user
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const res = await apiRequest('/subscriptions/status');

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al obtener estado de suscripción: ${res.status} ${errorText}`);
  }

  return res.json();
}

/**
 * Create a Stripe Checkout session.
 * Returns a URL to load inside a WebView.
 */
export async function createCheckoutSession(): Promise<CheckoutSession> {
  const res = await apiRequest('/subscriptions/checkout', {
    method: 'POST',
  });

  if (!res.ok) {
    const errorText = await res.text();
    let message = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      message = errorJson.error || errorJson.message || errorText;
    } catch {}
    throw new Error(message);
  }

  return res.json();
}

/**
 * Cancel the user's active subscription
 */
export async function cancelSubscription(): Promise<void> {
  const res = await apiRequest('/subscriptions/cancel', {
    method: 'POST',
  });

  if (!res.ok) {
    const errorText = await res.text();
    let message = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      message = errorJson.error || errorJson.message || errorText;
    } catch {}
    throw new Error(message);
  }
}

/**
 * Sync subscription state directly from the Stripe API.
 * Fallback for when webhooks are unavailable (e.g. local dev).
 * Returns the updated subscription status.
 */
export async function syncSubscriptionFromStripe(): Promise<SubscriptionStatus> {
  const res = await apiRequest('/subscriptions/sync', {
    method: 'POST',
  });

  if (!res.ok) {
    const errorText = await res.text();
    let message = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      message = errorJson.error || errorJson.message || errorText;
    } catch {}
    throw new Error(message);
  }

  return res.json();
}
