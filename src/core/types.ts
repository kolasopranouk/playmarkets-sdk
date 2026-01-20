export type MarketStatus = 'OPEN' | 'CLOSED' | 'RESOLVED' | 'CANCELLED';

export type OutcomeType = 'binary' | 'multiple' | 'scalar';

export interface MarketOutcome { 
    id: string;
    label: string;
    totalBets: number;
    betCount: number;
    odds: number;
    probability: number;
}

export interface Market {
    id: string;
    appId: string;
    question: string;
    description?: string;
    outcomes: MarketOutcome[];
    outcomeType: OutcomeType;
    status: MarketStatus;
    totalPool: number;
    feeRate: number;

    createdAt: number;

    closesAt: number;

    resolvedAt?: number;

    winningOutcomeId?: string;

    metadata?: Record<string, unknown>;

    allowedBettors?: string[];

    minBet?: number;

    maxBet?: number;
}

export type BetStatus = 'pending' | 'confirmed' | 'won' | 'lost' | 'refunded';

export interface Bet {
    id: string;
    marketId: string;
    bettorId: string;
    outcomeId: string;
    amount: number;
    potentialPayout: number;
    status: BetStatus;
    payout?: number;
    createdAt: number;
    oddsAtBet: number;
}

export interface User {
    id: string;
    balance: number;
    totalBets: number;
    totalWon: number;
    totalLost: number;
    createdAt: number;
}

export type SDKEvent = 
    | {
        type: 'market:created';
        market: Market;
    }
    | {
        type: 'market:resolved';
        market: Market;
        winningOutcomeId: string;
    }
    | {
        type: 'market:cancelled';
        market: Market;
    } | {
        type: 'market:updated';
        market: Market;
    } | {
        type: 'market:closed';
        market: Market;
    }
    | {
        type: 'bet:placed';
        bet: Bet;
        market: Market;
    }
    | {
        type: 'bet:confirmed';
        bet: Bet;
        market: Market;
    }
    | {
        type: 'bet:won';
        bet: Bet;
        market: Market;
    }
    | {
        type: 'bet:lost';
        bet: Bet;
        market: Market;
    }
    | {
        type: 'bet:refunded';
        bet: Bet;
        market: Market;
    }
    | {
        type: 'user:created';
        user: User;
    }
    | {
        type: 'user:balanceChanged';
        user: User;
        balance: number;
    };

export type EventType = SDKEvent['type'];

export type EventCallback<T extends EventType> = (event: Extract<SDKEvent, { type: T }>) => void;

export interface SDKConfig {
    appId: string;
    defaultFeeRate?: number;
    storage?: storageAdapter;
    initialBalance?: number;
    debug?: boolean;
}

export interface storageAdapter {
    getMarket(id: string): Promise<Market | null>;
    getAllMarkets(): Promise<Market[]>;
    saveMarket(market: Market): Promise<void>;
    deleteMarket(id: string): Promise<void>;
    getBet(id: string): Promise<Bet | null>;
    getAllBets(): Promise<Bet[]>;
    saveBet(bet: Bet): Promise<void>;
    deleteBet(id: string): Promise<void>;
    getUser(id: string): Promise<User | null>;
    getAllUsers(): Promise<User[]>;

    clear(): Promise<void>;

    getStats(): {
        markets: number;
        bets: number;
        users: number;
    };

    exportData(): { markets: Market[]; bets: Bet[]; users: User[] };
    importData(data: { markets: Market[]; bets: Bet[]; users: User[] }): void;
}

export interface CreateMarketInput {
    question: string;
    description?: string;
    outcomes: string[] | { id: string; label: string }[];
    closesAt: number | Date;
    outcomeType: OutcomeType;
    feeRate?: number;
    metadata?: Record<string, unknown>;
    allowedBettors?: string[];
    minBet?: number;
    maxBet?: number;
}

export interface placeBetInput {
    marketId: string;
    bettorId: string;
    outcomeId: string;
    amount: number;
}

export interface resolveMarketInput {
    marketId: string;
    winningOutcomeId: string;
    proof?: string | Record<string, unknown>;
}

export class PredictSDKError extends Error {
    constructor(public code: string, message: string, public details?: unknown) {
        super(message);
        this.name = 'PredictSDKError';
    }
}

export const ErrorCodes = {
    INVALID_INPUT: 'INVALID_INPUT',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    CONFLICT: 'CONFLICT',
    TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
    BAD_GATEWAY: 'BAD_GATEWAY',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    GATEWAY_TIMEOUT: 'GATEWAY_TIMEOUT',
    MARKET_NOT_FOUND: 'MARKET_NOT_FOUND',
    BET_NOT_FOUND: 'BET_NOT_FOUND',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    MARKET_ALREADY_CREATED: 'MARKET_ALREADY_CREATED',
    BET_ALREADY_PLACED: 'BET_ALREADY_PLACED',
    USER_ALREADY_CREATED: 'USER_ALREADY_CREATED',
    MARKET_NOT_OPEN: 'MARKET_NOT_OPEN',
    MARKET_NOT_CLOSED: 'MARKET_NOT_CLOSED',
    MARKET_NOT_RESOLVED: 'MARKET_NOT_RESOLVED',
    INVALID_CONFIG: 'INVALID_CONFIG',
    INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];