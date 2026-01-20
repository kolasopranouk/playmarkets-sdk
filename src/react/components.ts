import { useState, useCallback, createElement } from 'react';
import type { CSSProperties } from 'react';
import { useMarket, usePlaceBet, useUser } from './hooks';
import type { Market, MarketOutcome } from '../core/types';
import { formatOdds } from '../utils/odds';

const h = createElement;

const styles: Record<string, CSSProperties> = {
  card: {
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '16px',
    backgroundColor: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  question: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '12px',
    color: '#1a1a1a',
  },
  outcomeButton: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: '12px 16px',
    marginBottom: '8px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    backgroundColor: '#fafafa',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  outcomeButtonSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  outcomeLabel: {
    fontWeight: 500,
    color: '#1a1a1a',
  },
  oddsLabel: {
    fontSize: '14px',
    color: '#666',
  },
  progressBar: {
    height: '4px',
    backgroundColor: '#e0e0e0',
    borderRadius: '2px',
    overflow: 'hidden',
    marginTop: '8px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    transition: 'width 0.3s',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '16px',
    marginTop: '12px',
    boxSizing: 'border-box' as const,
  },
  button: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '12px',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  stats: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#666',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
    marginLeft: '8px',
  },
  badgeOpen: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  badgeClosed: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  badgeResolved: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  error: {
    color: '#dc2626',
    fontSize: '14px',
    marginTop: '8px',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '24px',
    color: '#666',
  },
};

interface OutcomeButtonProps {
  outcome: MarketOutcome;
  market: Market;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function OutcomeButton({ outcome, market, selected, onClick, disabled }: OutcomeButtonProps) {
  const isWinner = market.status === 'RESOLVED' && market.winningOutcomeId === outcome.id;
  
  const buttonStyle: CSSProperties = {
    ...styles.outcomeButton,
    ...(selected ? styles.outcomeButtonSelected : {}),
    ...(isWinner ? { borderColor: '#22c55e', backgroundColor: '#f0fdf4' } : {}),
    ...(disabled ? { cursor: 'default', opacity: 0.8 } : {}),
  };

  return h('button', {
    onClick,
    disabled,
    style: buttonStyle,
  },
    h('div', { style: { flex: 1 } },
      h('span', { style: styles.outcomeLabel },
        outcome.label,
        isWinner ? ' ✓' : ''
      ),
      h('span', { style: { ...styles.oddsLabel, marginLeft: '8px' } },
        `${formatOdds(outcome.odds)}x (${(outcome.probability * 100).toFixed(0)}%)`
      ),
      h('div', { style: styles.progressBar },
        h('div', {
          style: {
            ...styles.progressFill,
            width: `${outcome.probability * 100}%`,
          }
        })
      )
    )
  );
}

export interface MarketCardProps {
  marketId: string;
  userId: string;
  onBetPlaced?: (bet: any) => void;
  showStats?: boolean;
  style?: CSSProperties;
}

export function MarketCard({
  marketId,
  userId,
  onBetPlaced,
  showStats = true,
  style,
}: MarketCardProps) {
  const { market, loading, error } = useMarket(marketId);
  const { user } = useUser(userId);
  const { placeBet, loading: betting, error: betError } = usePlaceBet(userId);
  
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('');

  const handleBet = useCallback(async () => {
    if (!selectedOutcome || !amount || !market) return;
    
    try {
      const bet = await placeBet({
        marketId: market.id,
        outcomeId: selectedOutcome,
        amount: parseFloat(amount),
      });
      onBetPlaced?.(bet);
      setSelectedOutcome(null);
      setAmount('');
    } catch (e) {
    }
  }, [selectedOutcome, amount, market, placeBet, onBetPlaced]);

  if (loading) {
    return h('div', { style: { ...styles.card, ...styles.loading, ...style } }, 'Loading...');
  }

  if (error || !market) {
    return h('div', { style: { ...styles.card, ...style } },
      h('div', { style: styles.error }, 'Error loading market')
    );
  }

  const statusBadgeStyle = {
    OPEN: styles.badgeOpen,
    CLOSED: styles.badgeClosed,
    RESOLVED: styles.badgeResolved,
    CANCELLED: styles.badgeClosed,
  }[market.status];

  const children: any[] = [
    h('div', { key: 'question', style: styles.question },
      market.question,
      h('span', { style: { ...styles.badge, ...statusBadgeStyle } },
        market.status.toUpperCase()
      )
    ),
    
    ...market.outcomes.map((outcome) =>
      h(OutcomeButton, {
        key: outcome.id,
        outcome,
        market,
        selected: selectedOutcome === outcome.id,
        onClick: () => market.status === 'OPEN' && setSelectedOutcome(outcome.id),
        disabled: market.status !== 'OPEN',
      })
    ),
  ];

  if (market.status === 'OPEN' && selectedOutcome) {
    children.push(
      h('input', {
        key: 'amount-input',
        type: 'number',
        placeholder: 'Bet amount',
        value: amount,
        onChange: (e: any) => setAmount(e.target.value),
        style: styles.input,
        min: market.minBet || 0,
        max: market.maxBet,
      }),
      h('button', {
        key: 'bet-button',
        onClick: handleBet,
        disabled: betting || !amount || parseFloat(amount) <= 0,
        style: {
          ...styles.button,
          ...(betting || !amount ? styles.buttonDisabled : {}),
        },
      }, betting ? 'Placing bet...' : `Bet ${amount || '0'}`)
    );
  }

  if (betError) {
    children.push(
      h('div', { key: 'error', style: styles.error }, betError.message)
    );
  }

  if (showStats) {
    children.push(
      h('div', { key: 'stats', style: styles.stats },
        h('span', null, `Pool: $${market.totalPool.toFixed(2)}`),
        h('span', null, `Your balance: $${user?.balance.toFixed(2) || '0.00'}`)
      )
    );
  }

  return h('div', { style: { ...styles.card, ...style } }, ...children);
}

export interface UserBalanceProps {
  userId: string;
  style?: CSSProperties;
}

export function UserBalance({ userId, style }: UserBalanceProps) {
  const { user, loading } = useUser(userId);

  if (loading || !user) {
    return h('span', { style }, 'Loading...');
  }

  return h('span', { style: { fontWeight: 600, ...style } },
    `$${user.balance.toFixed(2)}`
  );
}

export interface BetWidgetProps {
  marketId: string;
  userId: string;
  compact?: boolean;
}

export function BetWidget({ marketId, userId, compact = false }: BetWidgetProps) {
  const { market } = useMarket(marketId);
  const { placeBet, loading } = usePlaceBet(userId);

  if (!market || market.status !== 'OPEN') return null;

  const handleQuickBet = async (outcomeId: string, amount: number) => {
    await placeBet({ marketId, outcomeId, amount });
  };

  if (compact) {
    return h('div', { style: { display: 'flex', gap: '8px' } },
      ...market.outcomes.map((o) =>
        h('button', {
          key: o.id,
          onClick: () => handleQuickBet(o.id, 10),
          disabled: loading,
          style: {
            padding: '8px 16px',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            backgroundColor: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
          },
        }, `${o.label} (${formatOdds(o.odds)}x)`)
      )
    );
  }

  return h(MarketCard, { marketId, userId });
}

export interface MarketListProps {
  markets: Market[];
  userId: string;
  onSelectMarket?: (market: Market) => void;
}

export function MarketList({ markets, userId, onSelectMarket }: MarketListProps) {
  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } },
    ...markets.map((market) =>
      h('div', {
        key: market.id,
        onClick: () => onSelectMarket?.(market),
        style: {
          ...styles.card,
          cursor: onSelectMarket ? 'pointer' : 'default',
        },
      },
        h('div', { style: styles.question }, market.question),
        h('div', { style: styles.stats },
          h('span', null, `Pool: $${market.totalPool.toFixed(2)}`),
          h('span', null, `${market.outcomes.length} outcomes`),
          h('span', null, `Status: ${market.status}`)
        )
      )
    )
  );
}