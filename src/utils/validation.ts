import {PredictSDKError, ErrorCodes} from '../core/types';
import type { CreateMarketInput, Market, placeBetInput, resolveMarketInput } from '../core/types';

export function validateCreateMarketInput(input: CreateMarketInput): void {
    if (!input.question || typeof input.question !== 'string') {
        throw new PredictSDKError(ErrorCodes.INVALID_CONFIG, 'Question is required and must be a string');
    }

    if (!input.outcomes || !Array.isArray(input.outcomes) || input.outcomes.length < 2) {
        throw new PredictSDKError(ErrorCodes.INVALID_CONFIG, 'Outcomes are required and must be an array of at least 2 strings');
    }

    const closesAt = input.closesAt instanceof Date
        ? input.closesAt.getTime()
        : input.closesAt;

    if (typeof closesAt !== 'number' || isNaN(closesAt) || closesAt <= Date.now()) {
        throw new PredictSDKError(ErrorCodes.INVALID_CONFIG, 'closesAt must be a valid future timestamp');
    }

    if (input.feeRate !== undefined) {
        if (typeof input.feeRate !== 'number' || input.feeRate < 0 || input.feeRate > 0.5) {
            throw new PredictSDKError(ErrorCodes.INVALID_CONFIG, 'feeRate must be a number between 0 and 0.5');
        }
    }

    if (input.minBet !== undefined && input.maxBet !== undefined && input.minBet > input.maxBet) {
        throw new PredictSDKError(ErrorCodes.INVALID_CONFIG, 'minBet must be less than maxBet');
    }

    if (input.minBet !== undefined && input.minBet < 0) {
        throw new PredictSDKError(ErrorCodes.INVALID_CONFIG, 'minBet must be a positive number');
    }

    if (input.maxBet !== undefined && input.maxBet < 0) {
        throw new PredictSDKError(ErrorCodes.INVALID_CONFIG, 'maxBet must be a positive number');
    }
}

export function validatePlaceBet(input: placeBetInput, market: Market): void {
    if (market.status !== 'OPEN') {
        throw new PredictSDKError(ErrorCodes.INVALID_INPUT, 'Market is not open');
    }

    if (Date.now() > market.closesAt) {
        throw new PredictSDKError(ErrorCodes.INVALID_INPUT, 'Market is closed');
    }

    const outcome = market.outcomes.find((o) => o.id === input.outcomeId);
    if (!outcome) {
        throw new PredictSDKError(ErrorCodes.INVALID_INPUT, 'Outcome not found');
    }

    if (typeof input.amount !== 'number' || input.amount <= 0) {
        throw new PredictSDKError(ErrorCodes.INVALID_INPUT, 'Amount must be a positive number');
    }

    if (market.minBet !== undefined && input.amount < market.minBet) {
        throw new PredictSDKError(ErrorCodes.INVALID_INPUT, 'Amount must be greater than or equal to minBet');
    }

    if (market.maxBet !== undefined && input.amount > market.maxBet) {
        throw new PredictSDKError(ErrorCodes.INVALID_INPUT, 'Amount must be less than or equal to maxBet');
    }

    if (market.allowedBettors !== undefined && !market.allowedBettors.includes(input.bettorId)) {
        throw new PredictSDKError(ErrorCodes.INVALID_INPUT, 'Bettor is not allowed to bet on this market');
    }
}

export function validateResolveMarket(input: resolveMarketInput, market: Market): void {
    if (market.status !== 'RESOLVED') {
        throw new PredictSDKError(ErrorCodes.INVALID_INPUT, 'Market is not resolved');
    }

    if (market.winningOutcomeId === undefined) {
        throw new PredictSDKError(ErrorCodes.INVALID_INPUT, 'Winning outcome is not set');
    }

    const outcome = market.outcomes.find((o) => o.id === input.winningOutcomeId);
    if (!outcome) {
        throw new PredictSDKError(ErrorCodes.INVALID_INPUT, 'Outcome not found');
    }
}