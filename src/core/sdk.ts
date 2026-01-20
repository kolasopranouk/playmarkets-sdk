import type {
    SDKConfig,
    storageAdapter,
    Market,
    MarketOutcome,
    Bet,
    User,
    CreateMarketInput,
    placeBetInput,
    resolveMarketInput,
    EventType,
    EventCallback,
  } from './types';
  import { PredictSDKError, ErrorCodes } from './types';
  import { MemoryStorage } from '../adapters/storage';
  import { TypedEventEmitter } from '../utils/events';
  import { generateMarketId, generateBetId, generateOutcomeId } from '../utils/ids';
  import { calculateOdds, calculatePotentialPayout, calculatePayouts } from '../utils/odds';
  import { validateCreateMarketInput, validatePlaceBet, validateResolveMarket } from '../utils/validation';
  
  export class PredictSDK {
    private config: Required<SDKConfig>;
    private storage: storageAdapter;
    private events: TypedEventEmitter;
  
    constructor(config: SDKConfig) {
      this.config = {
        appId: config.appId,
        defaultFeeRate: config.defaultFeeRate ?? 0.02,
        storage: config.storage ?? new MemoryStorage(),
        initialBalance: config.initialBalance ?? 1000,
        debug: config.debug ?? false,
      };
      
      this.storage = this.config.storage;
      this.events = new TypedEventEmitter();
  
      if (this.config.debug) {
        this.events.onAny((event) => {
          console.log(`[PredictSDK] ${event.type}`, event);
        });
      }
    }
  
    on<T extends EventType>(event: T, callback: EventCallback<T>): () => void {
      return this.events.on(event, callback);
    }
  
    once<T extends EventType>(event: T, callback: EventCallback<T>): void {
      this.events.once(event, callback);
    }
  
    off<T extends EventType>(event: T, callback: EventCallback<T>): void {
      this.events.off(event, callback);
    }
  
    async createMarket(input: CreateMarketInput): Promise<Market> {
      validateCreateMarketInput(input);
  
      const closesAt = input.closesAt instanceof Date 
        ? input.closesAt.getTime() 
        : input.closesAt;
  
      const outcomes: MarketOutcome[] = input.outcomes.map((o) => {
        if (typeof o === 'string') {
          return {
            id: generateOutcomeId(),
            label: o,
            totalBets: 0,
            betCount: 0,
            odds: input.outcomes.length,
            probability: 1 / input.outcomes.length,
          };
        }
        return {
          id: o.id || generateOutcomeId(),
          label: o.label,
          totalBets: 0,
          betCount: 0,
          odds: input.outcomes.length,
          probability: 1 / input.outcomes.length,
        };
      });
  
      const market: Market = {
        id: generateMarketId(),
        appId: this.config.appId,
        question: input.question,
        description: input.description,
        outcomes,
        outcomeType: input.outcomeType ?? 'binary',
        status: 'OPEN',
        totalPool: 0,
        feeRate: input.feeRate ?? this.config.defaultFeeRate,
        createdAt: Date.now(),
        closesAt,
        metadata: input.metadata,
        allowedBettors: input.allowedBettors,
        minBet: input.minBet,
        maxBet: input.maxBet,
      };
  
      await this.storage.saveMarket(market);
      this.events.emit({ type: 'market:created', market });
  
      return market;
    }
  
    async getMarket(marketId: string): Promise<Market | null> {
      const market = await this.storage.getMarket(marketId);
      if (!market) return null;
  
      market.outcomes = calculateOdds(market);
      return market;
    }
  
    async getAllMarkets(filter?: {
      status?: Market['status'];
      appId?: string;
    }): Promise<Market[]> {
      let markets = await this.storage.getAllMarkets();
  
      if (filter?.status) {
        markets = markets.filter((m) => m.status === filter.status);
      }
      if (filter?.appId) {
        markets = markets.filter((m) => m.appId === filter.appId);
      }
  
      return markets.map((m) => ({
        ...m,
        outcomes: calculateOdds(m),
      }));
    }
  
    async closeMarket(marketId: string): Promise<Market> {
      const market = await this.storage.getMarket(marketId);
      if (!market) {
        throw new PredictSDKError(ErrorCodes.MARKET_NOT_FOUND, `Market ${marketId} not found`);
      }
  
      market.status = 'CLOSED';
      await this.storage.saveMarket(market);
      this.events.emit({ type: 'market:closed', market });
  
      return market;
    }
  
    async resolveMarket(input: resolveMarketInput): Promise<Market> {
      const market = await this.storage.getMarket(input.marketId);
      if (!market) {
        throw new PredictSDKError(ErrorCodes.MARKET_NOT_FOUND, `Market ${input.marketId} not found`);
      }
  
      validateResolveMarket(input, market);
  
      const allBets = await this.storage.getAllBets();
      const bets = allBets.filter((b) => b.marketId === market.id);
      
      const payouts = calculatePayouts(
        market,
        input.winningOutcomeId,
        bets.map((b) => ({
          bettorId: b.bettorId,
          outcomeId: b.outcomeId,
          amount: b.amount,
        }))
      );
  
      market.status = 'RESOLVED';
      market.resolvedAt = Date.now();
      market.winningOutcomeId = input.winningOutcomeId;
      await this.storage.saveMarket(market);
  
      for (const bet of bets) {
        const isWinner = bet.outcomeId === input.winningOutcomeId;
        const payout = payouts.get(bet.bettorId) || 0;
  
        bet.status = isWinner ? 'won' : 'lost';
        bet.payout = isWinner ? payout : 0;
        await this.storage.saveBet(bet);
  
        if (isWinner && payout > 0) {
          await this.updateUserBalance(bet.bettorId, payout);
          this.events.emit({ type: 'bet:won', bet, market });
        } else {
          this.events.emit({ type: 'bet:lost', bet, market });
        }
      }
  
      this.events.emit({ 
        type: 'market:resolved', 
        market, 
        winningOutcomeId: input.winningOutcomeId 
      });
  
      return market;
    }
  
    async cancelMarket(marketId: string, reason?: string): Promise<Market> {
      const market = await this.storage.getMarket(marketId);
      if (!market) {
        throw new PredictSDKError(ErrorCodes.MARKET_NOT_FOUND, `Market ${marketId} not found`);
      }
  
      if (market.status === 'RESOLVED') {
        throw new PredictSDKError(
          ErrorCodes.CONFLICT,
          'Cannot cancel a resolved market'
        );
      }
  
      const allBets = await this.storage.getAllBets();
      const bets = allBets.filter((b) => b.marketId === market.id);

      for (const bet of bets) {
        bet.status = 'refunded';
        bet.payout = bet.amount;
        await this.storage.saveBet(bet);
  
        await this.updateUserBalance(bet.bettorId, bet.amount);
        this.events.emit({ type: 'bet:refunded', bet, market });
      }

      market.status = 'CANCELLED';
      if (reason) {
        market.metadata = { ...market.metadata, cancelReason: reason };
      }
      await this.storage.saveMarket(market);
  
      this.events.emit({ type: 'market:cancelled', market });
  
      return market;
    }
  
  async getMarketStats(marketId: string) {
      const market = await this.storage.getMarket(marketId);
      if (!market) {
        throw new PredictSDKError(ErrorCodes.MARKET_NOT_FOUND, `Market ${marketId} not found`);
      }

      const totalBets = market.outcomes.reduce((sum, o) => sum + o.betCount, 0);
      return {
        totalPool: market.totalPool,
        totalBets,
        outcomeStats: market.outcomes.map((o) => ({
          id: o.id,
          label: o.label,
          totalBets: o.totalBets,
          betCount: o.betCount,
          odds: o.odds,
          probability: o.probability,
        })),
      };
    }
  
    async placeBet(input: placeBetInput): Promise<Bet> {
      const market = await this.storage.getMarket(input.marketId);
      if (!market) {
        throw new PredictSDKError(ErrorCodes.MARKET_NOT_FOUND, `Market ${input.marketId} not found`);
      }
  
      validatePlaceBet(input, market);
  
      const user = await this.getOrCreateUser(input.bettorId);
      if (user.balance < input.amount) {
        throw new PredictSDKError(
          ErrorCodes.INSUFFICIENT_BALANCE,
          `Insufficient balance. Have: ${user.balance}, Need: ${input.amount}`
        );
      }
  
      const currentOdds = calculateOdds(market);
      const outcomeOdds = currentOdds.find((o) => o.id === input.outcomeId)?.odds || 0;
  
      const potentialPayout = calculatePotentialPayout(input.amount, input.outcomeId, market);
  
      const bet: Bet = {
        id: generateBetId(),
        marketId: market.id,
        bettorId: input.bettorId,
        outcomeId: input.outcomeId,
        amount: input.amount,
        potentialPayout,
        status: 'confirmed',
        createdAt: Date.now(),
        oddsAtBet: outcomeOdds,
      };
  
      const outcome = market.outcomes.find((o) => o.id === input.outcomeId)!;
      outcome.totalBets += input.amount;
      outcome.betCount += 1;
      market.totalPool += input.amount;
      market.outcomes = calculateOdds(market);
  
      await this.updateUserBalance(input.bettorId, -input.amount);

      await this.storage.saveBet(bet);
      await this.storage.saveMarket(market);
  
      this.events.emit({ type: 'bet:placed', bet, market });
  
      return bet;
    }

    async getBet(betId: string): Promise<Bet | null> {
      return this.storage.getBet(betId);
    }
  

    async getBetsByMarket(marketId: string): Promise<Bet[]> {
      const allBets = await this.storage.getAllBets();
      return allBets.filter((b) => b.marketId === marketId);
    }
  

    async getBetsByUser(userId: string): Promise<Bet[]> {
      const allBets = await this.storage.getAllBets();
      return allBets.filter((b) => b.bettorId === userId);
    }
  

    async calculatePayout(marketId: string, outcomeId: string, amount: number): Promise<number> {
      const market = await this.storage.getMarket(marketId);
      if (!market) {
        throw new PredictSDKError(ErrorCodes.MARKET_NOT_FOUND, `Market ${marketId} not found`);
      }
  
      return calculatePotentialPayout(amount, outcomeId, market);
    }
  

    async getOrCreateUser(userId: string): Promise<User> {
      let user = await this.storage.getUser(userId);
      
      if (!user) {
        user = {
          id: userId,
          balance: this.config.initialBalance,
          totalBets: 0,
          totalWon: 0,
          totalLost: 0,
          createdAt: Date.now(),
        };
        await (this.storage as any).saveUser(user);
        this.events.emit({ type: 'user:created', user });
      }
  
      return user;
    }
  

    async getUser(userId: string): Promise<User | null> {
      return this.storage.getUser(userId);
    }
  

    private async updateUserBalance(userId: string, delta: number): Promise<User> {
      const user = await this.getOrCreateUser(userId);
      
      user.balance += delta;
      
      if (delta > 0) {
        user.totalWon += delta;
      } else {
        user.totalBets += Math.abs(delta);
      }
  
      await (this.storage as any).saveUser(user);
      this.events.emit({ type: 'user:balanceChanged', user, balance: user.balance });
  
      return user;
    }

    async addFunds(userId: string, amount: number): Promise<User> {
      if (amount <= 0) {
        throw new PredictSDKError(ErrorCodes.INVALID_INPUT, 'Amount must be positive');
      }
      return this.updateUserBalance(userId, amount);
    }
 
    getConfig(): Readonly<SDKConfig> {
      return { ...this.config };
    }
  
    async checkAndCloseExpiredMarkets(): Promise<Market[]> {
      const markets = await this.storage.getAllMarkets();
      const now = Date.now();
      const closed: Market[] = [];
  
      for (const market of markets) {
        if (market.status === 'OPEN' && now >= market.closesAt) {
          market.status = 'CLOSED';
          await this.storage.saveMarket(market);
          this.events.emit({ type: 'market:closed', market });
          closed.push(market);
        }
      }
  
      return closed;
    }
  
    async clear(): Promise<void> {
      await this.storage.clear();
    }
  }