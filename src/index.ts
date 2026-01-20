export { PredictSDK } from './core/sdk';

export type {
    Market,
    MarketOutcome,
    Bet,
    User,
    CreateMarketInput,
    placeBetInput,
    resolveMarketInput,
    EventType,
    EventCallback,
    SDKConfig,
    storageAdapter
} from './core/types';

export { PredictSDKError, ErrorCodes } from './core/types';

export { MemoryStorage, LocalStorage } from './adapters/storage';

export {
    calculateOdds,
    calculatePotentialPayout,
    calculatePayouts,
    getMarketStats,
    formatOdds,
    kellyBet
} from './utils/odds';

export {
    generateMarketId,
    generateBetId,
    generateOutcomeId,
} from './utils/ids';