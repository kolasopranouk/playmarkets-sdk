import type { Market, MarketOutcome } from '../core/types';

export function calculateOdds(market: Market): MarketOutcome[] {
    const totalPool = market.totalPool;
    const feePool = totalPool * market.feeRate;
    const payoutPool = totalPool - feePool;

    return market.outcomes.map((outcome) => {

        if (outcome.totalBets === 0 || totalPool === 0) {
            return {
                ...outcome,
                odds: market.outcomes.length,
                probability: 1 / market.outcomes.length,
            }
        }


        const odds = payoutPool / outcome.totalBets;

        const probability = outcome.totalBets / totalPool;

        return {
            ...outcome,
            odds: Math.round(odds * 100) / 100,
            probability: Math.round(probability * 1000) / 1000,
        }
    });
}

export function calculatePotentialPayout(amount: number, outcomeId: string, market: Market): number {

    const outcome = market.outcomes.find((o) => o.id === outcomeId);
    if (!outcome) {
        return 0;
    }

    const totalPool = market.totalPool + amount;
    const feePool = totalPool * market.feeRate;

    const payoutPool = totalPool - feePool;

    const outcomePool = outcome.totalBets + amount;

    const payout = outcomePool / payoutPool;

    return Math.round(payout * 100) / 100;
}

export function calculatePayouts(
    market: Market,
    winningOutcomeId: string,
    bets: { bettorId: string; outcomeId: string; amount: number }[]
): Map<string, number> {
    const payouts = new Map<string, number>();
    const totalPool = market.totalPool;
    const feePool = totalPool * market.feeRate;
    const payoutPool = totalPool - feePool;

    const winningOutcome = market.outcomes.find((o) => o.id === winningOutcomeId);
    if (!winningOutcome || winningOutcome.totalBets === 0) {
        for (const bet of bets) {
            const currentPayout = payouts.get(bet.bettorId) || 0;
            const refund = currentPayout + bet.amount;
            payouts.set(bet.bettorId, refund);
        }
        return payouts;
    }

    for (const bet of bets) {
        if (bet.outcomeId === winningOutcomeId) {
            const share = bet.amount / winningOutcome.totalBets;
            const payout = share * payoutPool;
            const currentPayout = payouts.get(bet.bettorId) || 0;
            payouts.set(bet.bettorId, currentPayout + Math.round(payout * 100) / 100);
        }
    }
    return payouts;
}

export function formatOdds(odds: number, format: 'decimal' | 'american' | 'fractional' = 'decimal'): string {

    switch (format) {
        case 'decimal':
            return odds.toFixed(2);
        case 'american':
            if (odds >= 2) {
                return `+${Math.round((odds - 1) * 100)}`;
            } else {
                return `-${Math.round((-100 / (odds - 1)))}`;
            }
        case 'fractional':
            const fraction = odds - 1;

            const denominators = [1, 2, 3, 4, 5, 6, 8, 10];

            let bestNum = Math.round(fraction);
            let bestDen = 1;
            let bestDiff = Math.abs(fraction - bestNum);

            for (const den of denominators) {
                const num = Math.round(fraction * den);
                const diff = Math.abs(fraction - num / den);
                if (diff < bestDiff) {
                    bestNum = num;
                    bestDen = den;
                    bestDiff = diff;
                }
            }
            return `${bestNum}/${bestDen}`;
        default:
            return odds.toFixed(2);
    }
}

export function kellyBet(
    probability: number,
    odds: number,
    bankroll: number,
    fraction: number = 0.25
): number {
    const b = odds - 1;
    const p = probability;
    const q = 1 - p;

    const kelly = (b * p - q) / b;

    if (kelly < 0) return 0;

    const bet = kelly * fraction * bankroll;

    return Math.round(bet * 100) / 100;
}