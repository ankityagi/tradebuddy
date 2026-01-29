/**
 * TradeBuddy MVP - Assessment Logic
 *
 * This module provides deterministic trade assessment based on risk metrics.
 * No LLM or external API required - uses simple threshold-based rules.
 */

import type { Metrics } from './types';

export interface AssessmentResult {
  /** Assessment text */
  text: string;

  /** Factors used in the assessment */
  factors: {
    rr?: number;
    popEst?: number;
    maxRisk?: number;
    maxReward?: number;
  };

  /** Overall risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'unknown';
}

/**
 * Generate a deterministic assessment for a trade based on its metrics
 *
 * Assessment Rules:
 * - RR >= 1.5 and POP < 45%: "Risk-heavy; consider sizing down."
 * - 0.7 <= RR < 1.5 and 45% <= POP <= 60%: "Balanced; monitor breakeven distance."
 * - RR < 0.7 and POP > 60%: "Favorable risk reward."
 * - Edge cases handled with generic guidance
 *
 * @param metrics - Calculated risk metrics
 * @returns Assessment result with text and factors
 */
export function generateAssessment(metrics: Metrics): AssessmentResult {
  const { rr, popEst, maxRisk, maxReward } = metrics;

  // If we don't have enough data, return generic assessment
  if (rr === undefined && popEst === undefined) {
    return {
      text: 'Insufficient data for assessment. Please review trade parameters.',
      factors: { rr, popEst, maxRisk, maxReward },
      riskLevel: 'unknown',
    };
  }

  // Handle edge cases
  if (rr !== undefined && !isFinite(rr)) {
    return {
      text: 'Unable to calculate risk/reward ratio. Review trade structure.',
      factors: { rr, popEst, maxRisk, maxReward },
      riskLevel: 'unknown',
    };
  }

  // Main assessment logic
  const rrValue = rr ?? 0;
  const popValue = popEst ?? 0;

  let text = '';
  let riskLevel: 'low' | 'medium' | 'high' | 'unknown' = 'unknown';

  // High risk/reward with low probability
  if (rrValue >= 1.5 && popValue < 0.45) {
    text =
      'Risk-heavy trade with high potential reward but lower probability of success. Consider sizing down or adjusting position.';
    riskLevel = 'high';
  }
  // Balanced trade
  else if (rrValue >= 0.7 && rrValue < 1.5 && popValue >= 0.45 && popValue <= 0.6) {
    text =
      'Balanced trade with moderate risk/reward and probability. Monitor breakeven distance and manage position size appropriately.';
    riskLevel = 'medium';
  }
  // Favorable risk/reward
  else if (rrValue < 0.7 && popValue > 0.6) {
    text =
      'Favorable risk/reward profile with high probability of success. Low risk relative to potential reward.';
    riskLevel = 'low';
  }
  // High probability, lower reward
  else if (popValue > 0.7) {
    text =
      'High probability trade. While success is more likely, ensure reward justifies the position size and capital commitment.';
    riskLevel = 'low';
  }
  // Low probability
  else if (popValue < 0.35) {
    text =
      'Low probability trade. Consider if the potential reward justifies the risk, and size accordingly.';
    riskLevel = 'high';
  }
  // Good risk/reward ratio
  else if (rrValue >= 2.0) {
    text =
      'Excellent risk/reward ratio. Potential reward significantly exceeds risk. Ensure probability supports the trade thesis.';
    riskLevel = 'medium';
  }
  // Poor risk/reward ratio
  else if (rrValue < 0.5) {
    text =
      'Limited reward relative to risk. Evaluate if this trade aligns with your strategy and risk tolerance.';
    riskLevel = 'high';
  }
  // Default case
  else {
    text =
      'Trade parameters are within normal ranges. Review all metrics and ensure alignment with your trading plan.';
    riskLevel = 'medium';
  }

  // Add specific warnings
  const warnings: string[] = [];

  if (maxRisk !== undefined && maxRisk > 5000) {
    warnings.push(
      'Note: Maximum risk exceeds $5,000. Ensure this fits your risk management rules.'
    );
  }

  if (popEst === undefined) {
    warnings.push(
      'POP estimate unavailable - limited market data. Use caution when evaluating probability.'
    );
  }

  if (warnings.length > 0) {
    text += ' ' + warnings.join(' ');
  }

  return {
    text,
    factors: { rr, popEst, maxRisk, maxReward },
    riskLevel,
  };
}

/**
 * Get a simple risk level badge color for UI display
 */
export function getRiskLevelColor(level: 'low' | 'medium' | 'high' | 'unknown'): string {
  switch (level) {
    case 'low':
      return 'green';
    case 'medium':
      return 'yellow';
    case 'high':
      return 'red';
    default:
      return 'gray';
  }
}
