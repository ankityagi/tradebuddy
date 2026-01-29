import { describe, it, expect } from 'vitest';
import { generateAssessment, getRiskLevelColor } from '../src/domain/assessment';
import type { Metrics } from '../src/domain/types';

describe('Assessment Logic', () => {
  describe('generateAssessment', () => {
    it('generates "risk-heavy" assessment for high RR and low POP', () => {
      const metrics: Metrics = {
        maxRisk: 300,
        maxReward: 500,
        rr: 1.67,
        popEst: 0.4,
        breakeven: [102],
      };

      const assessment = generateAssessment(metrics);

      expect(assessment.text).toContain('Risk-heavy');
      expect(assessment.riskLevel).toBe('high');
      expect(assessment.factors.rr).toBe(1.67);
      expect(assessment.factors.popEst).toBe(0.4);
    });

    it('generates "balanced" assessment for moderate RR and POP', () => {
      const metrics: Metrics = {
        maxRisk: 200,
        maxReward: 250,
        rr: 1.25,
        popEst: 0.55,
        breakeven: [100],
      };

      const assessment = generateAssessment(metrics);

      expect(assessment.text).toContain('Balanced');
      expect(assessment.riskLevel).toBe('medium');
    });

    it('generates "favorable" assessment for low RR and high POP', () => {
      const metrics: Metrics = {
        maxRisk: 300,
        maxReward: 200,
        rr: 0.67,
        popEst: 0.7,
        breakeven: [95],
      };

      const assessment = generateAssessment(metrics);

      expect(assessment.text).toContain('Favorable');
      expect(assessment.riskLevel).toBe('low');
    });

    it('handles high probability trades', () => {
      const metrics: Metrics = {
        maxRisk: 500,
        maxReward: 100,
        rr: 0.2,
        popEst: 0.85,
        breakeven: [90],
      };

      const assessment = generateAssessment(metrics);

      expect(assessment.text).toContain('Favorable');
      expect(assessment.riskLevel).toBe('low');
    });

    it('handles low probability trades', () => {
      const metrics: Metrics = {
        maxRisk: 100,
        maxReward: 500,
        rr: 5.0,
        popEst: 0.25,
        breakeven: [120],
      };

      const assessment = generateAssessment(metrics);

      expect(assessment.text).toContain('Risk-heavy');
      expect(assessment.riskLevel).toBe('high');
    });

    it('handles excellent RR ratio', () => {
      const metrics: Metrics = {
        maxRisk: 100,
        maxReward: 300,
        rr: 3.0,
        popEst: 0.5,
        breakeven: [105],
      };

      const assessment = generateAssessment(metrics);

      expect(assessment.text).toContain('Excellent risk/reward');
      expect(assessment.riskLevel).toBe('medium');
    });

    it('handles poor RR ratio', () => {
      const metrics: Metrics = {
        maxRisk: 500,
        maxReward: 100,
        rr: 0.2,
        popEst: 0.5,
        breakeven: [95],
      };

      const assessment = generateAssessment(metrics);

      expect(assessment.text).toContain('Limited reward');
      expect(assessment.riskLevel).toBe('high');
    });

    it('handles insufficient data', () => {
      const metrics: Metrics = {};

      const assessment = generateAssessment(metrics);

      expect(assessment.text).toContain('Insufficient data');
      expect(assessment.riskLevel).toBe('unknown');
    });

    it('warns about high max risk', () => {
      const metrics: Metrics = {
        maxRisk: 6000,
        maxReward: 1000,
        rr: 0.17,
        popEst: 0.75,
      };

      const assessment = generateAssessment(metrics);

      expect(assessment.text).toContain('exceeds $5,000');
    });

    it('warns about missing POP estimate', () => {
      const metrics: Metrics = {
        maxRisk: 200,
        maxReward: 300,
        rr: 1.5,
        popEst: undefined,
      };

      const assessment = generateAssessment(metrics);

      expect(assessment.text).toContain('POP estimate unavailable');
    });

    it('handles infinite RR ratio', () => {
      const metrics: Metrics = {
        maxRisk: 0,
        maxReward: 500,
        rr: Infinity,
        popEst: 0.5,
      };

      const assessment = generateAssessment(metrics);

      expect(assessment.text).toContain('Unable to calculate');
      expect(assessment.riskLevel).toBe('unknown');
    });

    it('provides default assessment for edge cases', () => {
      const metrics: Metrics = {
        maxRisk: 200,
        maxReward: 200,
        rr: 1.0,
        popEst: 0.5,
      };

      const assessment = generateAssessment(metrics);

      expect(assessment.text).toContain('Balanced');
      expect(assessment.riskLevel).toBe('medium');
    });
  });

  describe('getRiskLevelColor', () => {
    it('returns correct colors for each risk level', () => {
      expect(getRiskLevelColor('low')).toBe('green');
      expect(getRiskLevelColor('medium')).toBe('yellow');
      expect(getRiskLevelColor('high')).toBe('red');
      expect(getRiskLevelColor('unknown')).toBe('gray');
    });
  });
});
