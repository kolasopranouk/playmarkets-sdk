import { useState, useEffect, useCallback, useContext, createContext, createElement } from 'react';
import type { ReactNode } from 'react';
import type { PredictSDK } from '../core/sdk';
import type { Market, Bet, User, CreateMarketInput, placeBetInput } from '../core/types';

const PredictSDKContext = createContext<PredictSDK | null>(null);

export interface PredictSDKProviderProps {
  sdk: PredictSDK;
  children: ReactNode;
}

export function PredictSDKProvider({ sdk, children }: PredictSDKProviderProps) {
  return createElement(PredictSDKContext.Provider, { value: sdk }, children);
}

export function useSDK(): PredictSDK {
  const sdk = useContext(PredictSDKContext);
  if (!sdk) {
    throw new Error('useSDK must be used within a PredictSDKProvider');
  }
  return sdk;
}

export interface UseMarketResult {
  market: Market | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useMarket(marketId: string): UseMarketResult {
  const sdk = useSDK();
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const m = await sdk.getMarket(marketId);
      setMarket(m);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [sdk, marketId]);

  useEffect(() => {
    refresh();

    // Subscribe to updates
    const unsub1 = sdk.on('market:updated', (e) => {
      if (e.market.id === marketId) setMarket(e.market);
    });
    const unsub2 = sdk.on('market:resolved', (e) => {
      if (e.market.id === marketId) setMarket(e.market);
    });
    const unsub3 = sdk.on('market:closed', (e) => {
      if (e.market.id === marketId) setMarket(e.market);
    });
    const unsub4 = sdk.on('bet:placed', (e) => {
      if (e.market.id === marketId) setMarket(e.market);
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, [sdk, marketId, refresh]);

  return { market, loading, error, refresh };
}

export interface UseMarketsResult {
  markets: Market[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useMarkets(filter?: { status?: Market['status'] }): UseMarketsResult {
  const sdk = useSDK();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const m = await sdk.getAllMarkets(filter);
      setMarkets(m);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [sdk, filter?.status]);

  useEffect(() => {
    refresh();

    // Subscribe to market creation
    const unsub = sdk.on('market:created', () => {
      refresh();
    });

    return unsub;
  }, [sdk, refresh]);

  return { markets, loading, error, refresh };
}

export interface UsePlaceBetResult {
  placeBet: (input: Omit<placeBetInput, 'bettorId'>) => Promise<Bet>;
  loading: boolean;
  error: Error | null;
}

export function usePlaceBet(bettorId: string): UsePlaceBetResult {
  const sdk = useSDK();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const placeBet = useCallback(
    async (input: Omit<placeBetInput, 'bettorId'>) => {
      try {
        setLoading(true);
        setError(null);
        const bet = await sdk.placeBet({ ...input, bettorId });
        return bet;
      } catch (e) {
        setError(e as Error);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [sdk, bettorId]
  );

  return { placeBet, loading, error };
}

export interface UseUserBetsResult {
  bets: Bet[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useUserBets(userId: string): UseUserBetsResult {
  const sdk = useSDK();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const b = await sdk.getBetsByUser(userId);
      setBets(b);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [sdk, userId]);

  useEffect(() => {
    refresh();

    const unsub1 = sdk.on('bet:placed', (e) => {
      if (e.bet.bettorId === userId) refresh();
    });
    const unsub2 = sdk.on('bet:won', (e) => {
      if (e.bet.bettorId === userId) refresh();
    });
    const unsub3 = sdk.on('bet:lost', (e) => {
      if (e.bet.bettorId === userId) refresh();
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [sdk, userId, refresh]);

  return { bets, loading, error, refresh };
}

export interface UseUserResult {
  user: User | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useUser(userId: string): UseUserResult {
  const sdk = useSDK();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const u = await sdk.getOrCreateUser(userId);
      setUser(u);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [sdk, userId]);

  useEffect(() => {
    refresh();

    const unsub = sdk.on('user:balanceChanged', (e) => {
      if (e.user.id === userId) setUser(e.user);
    });

    return unsub;
  }, [sdk, userId, refresh]);

  return { user, loading, error, refresh };
}

export interface UseCreateMarketResult {
  createMarket: (input: CreateMarketInput) => Promise<Market>;
  loading: boolean;
  error: Error | null;
}

export function useCreateMarket(): UseCreateMarketResult {
  const sdk = useSDK();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createMarket = useCallback(
    async (input: CreateMarketInput) => {
      try {
        setLoading(true);
        setError(null);
        const market = await sdk.createMarket(input);
        return market;
      } catch (e) {
        setError(e as Error);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [sdk]
  );

  return { createMarket, loading, error };
}
export interface UseResolveMarketResult {
  resolveMarket: (marketId: string, winningOutcomeId: string) => Promise<Market>;
  loading: boolean;
  error: Error | null;
}

export function useResolveMarket(): UseResolveMarketResult {
  const sdk = useSDK();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const resolveMarket = useCallback(
    async (marketId: string, winningOutcomeId: string) => {
      try {
        setLoading(true);
        setError(null);
        const market = await sdk.resolveMarket({ marketId, winningOutcomeId });
        return market;
      } catch (e) {
        setError(e as Error);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [sdk]
  );

  return { resolveMarket, loading, error };
}

export function usePayoutCalculator(marketId: string) {
  const sdk = useSDK();
  const [loading, setLoading] = useState(false);

  const calculate = useCallback(
    async (outcomeId: string, amount: number) => {
      setLoading(true);
      try {
        return await sdk.calculatePayout(marketId, outcomeId, amount);
      } finally {
        setLoading(false);
      }
    },
    [sdk, marketId]
  );

  return { calculate, loading };
}