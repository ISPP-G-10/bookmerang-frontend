import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  getSubscriptionStatus,
  createCheckoutSession,
  cancelSubscription as cancelSubscriptionApi,
  syncSubscriptionFromStripe,
  SubscriptionStatus,
} from '@/lib/subscriptionApi';
import { useAuth } from './AuthContext';

interface SubscriptionContextType {
  isPremium: boolean;
  subscriptionStatus: SubscriptionStatus | null;
  loading: boolean;
  /** Creates a Stripe Checkout session and returns the URL to show in a WebView */
  getCheckoutUrl: () => Promise<string>;
  /** Cancels the active subscription */
  cancelSubscription: () => Promise<void>;
  /** Re-fetches subscription status from backend */
  refreshStatus: () => Promise<void>;
  /** Syncs subscription directly from Stripe API. Returns the status. */
  syncFromStripe: () => Promise<SubscriptionStatus | null>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isPremium: false,
  subscriptionStatus: null,
  loading: true,
  getCheckoutUrl: async () => '',
  cancelSubscription: async () => {},
  refreshStatus: async () => {},
  syncFromStripe: async () => null,
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const { refreshUserPlan, session } = useAuth();

  const refreshStatus = useCallback(async () => {
    try {
      const status = await getSubscriptionStatus();
      setSubscriptionStatus(status);
      await refreshUserPlan();
    } catch (error) {
      console.warn('[SubscriptionContext] refreshStatus failed:', error);
    }
  }, [refreshUserPlan]);

  const getCheckoutUrl = useCallback(async (): Promise<string> => {
    const session = await createCheckoutSession();
    return session.checkoutUrl;
  }, []);

  const cancelSubscription = useCallback(async () => {
    await cancelSubscriptionApi();
    await refreshStatus();
  }, [refreshStatus]);

  const syncFromStripe = useCallback(async (): Promise<SubscriptionStatus | null> => {
    try {
      const status = await syncSubscriptionFromStripe();
      setSubscriptionStatus(status);
      await refreshUserPlan();
      return status;
    } catch (error) {
      console.warn('[SubscriptionContext] syncFromStripe failed, falling back to refreshStatus:', error);
      await refreshStatus();
      return null;
    }
  }, [refreshStatus, refreshUserPlan]);

  // Load subscription status when authenticated
  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }

    refreshStatus().finally(() => {
      setLoading(false);
    });
  }, [refreshStatus, session]);

  const isPremium = subscriptionStatus?.isPremium ?? false;

  return (
    <SubscriptionContext.Provider
      value={{
        isPremium,
        subscriptionStatus,
        loading,
        getCheckoutUrl,
        cancelSubscription,
        refreshStatus,
        syncFromStripe,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextType {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription debe usarse dentro de un <SubscriptionProvider>');
  }
  return ctx;
}
