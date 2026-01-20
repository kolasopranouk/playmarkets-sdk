/**
 * ID Generation Utilities
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique market ID
 */
export function generateMarketId(): string {
  return `mkt_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
}

/**
 * Generate a unique bet ID
 */
export function generateBetId(): string {
  return `bet_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
}

/**
 * Generate a unique outcome ID
 */
export function generateOutcomeId(): string {
  return `out_${uuidv4().replace(/-/g, '').slice(0, 8)}`;
}

/**
 * Generate a short ID (for display)
 */
export function shortId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Validate an ID format
 */
export function isValidId(id: string, prefix?: string): boolean {
  if (typeof id !== 'string' || id.length === 0) return false;
  if (prefix && !id.startsWith(`${prefix}_`)) return false;
  return true;
}