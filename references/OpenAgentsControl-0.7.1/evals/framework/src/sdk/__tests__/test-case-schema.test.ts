/**
 * Unit tests for TestCaseSchema validation
 * 
 * Tests that the schema correctly validates:
 * - Required fields (id, name, description, category, prompt/prompts)
 * - Optional fields (behavior, expectedViolations, expected)
 * - Flexible validation (behavior alone is valid)
 */

import { describe, it, expect } from 'vitest';
import { TestCaseSchema } from '../test-case-schema.js';

describe('TestCaseSchema', () => {
  describe('required fields', () => {
    it('should require id, name, description, category', () => {
      const result = TestCaseSchema.safeParse({
        prompt: 'test prompt',
        approvalStrategy: { type: 'auto-approve' },
        behavior: { minToolCalls: 1 },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const missingFields = result.error.issues.map(i => i.path[0]);
        expect(missingFields).toContain('id');
        expect(missingFields).toContain('name');
        expect(missingFields).toContain('description');
        expect(missingFields).toContain('category');
      }
    });

    it('should require either prompt or prompts', () => {
      const result = TestCaseSchema.safeParse({
        id: 'test-1',
        name: 'Test',
        description: 'Test description',
        category: 'developer',
        approvalStrategy: { type: 'auto-approve' },
        behavior: { minToolCalls: 1 },
        // No prompt or prompts
      });

      expect(result.success).toBe(false);
    });
  });

  describe('behavior validation flexibility', () => {
    it('should accept behavior alone (without expectedViolations)', () => {
      const result = TestCaseSchema.safeParse({
        id: 'test-1',
        name: 'Test',
        description: 'Test description',
        category: 'developer',
        prompt: 'Do something',
        approvalStrategy: { type: 'auto-approve' },
        behavior: {
          mustUseTools: ['bash'],
          minToolCalls: 1,
        },
        // No expectedViolations - this should be valid!
      });

      expect(result.success).toBe(true);
    });

    it('should accept expectedViolations alone (without behavior)', () => {
      const result = TestCaseSchema.safeParse({
        id: 'test-1',
        name: 'Test',
        description: 'Test description',
        category: 'developer',
        prompt: 'Do something',
        approvalStrategy: { type: 'auto-approve' },
        expectedViolations: [
          { rule: 'approval-gate', shouldViolate: false, severity: 'error' },
        ],
        // No behavior - this should be valid!
      });

      expect(result.success).toBe(true);
    });

    it('should accept behavior + expectedViolations together', () => {
      const result = TestCaseSchema.safeParse({
        id: 'test-1',
        name: 'Test',
        description: 'Test description',
        category: 'developer',
        prompt: 'Do something',
        approvalStrategy: { type: 'auto-approve' },
        behavior: {
          mustUseTools: ['bash'],
          minToolCalls: 1,
        },
        expectedViolations: [
          { rule: 'approval-gate', shouldViolate: false, severity: 'error' },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('should accept deprecated expected format', () => {
      const result = TestCaseSchema.safeParse({
        id: 'test-1',
        name: 'Test',
        description: 'Test description',
        category: 'developer',
        prompt: 'Do something',
        approvalStrategy: { type: 'auto-approve' },
        expected: {
          pass: true,
          minMessages: 1,
        },
      });

      expect(result.success).toBe(true);
    });

    it('should reject when no behavior/expected/expectedViolations provided', () => {
      const result = TestCaseSchema.safeParse({
        id: 'test-1',
        name: 'Test',
        description: 'Test description',
        category: 'developer',
        prompt: 'Do something',
        approvalStrategy: { type: 'auto-approve' },
        // No behavior, expected, or expectedViolations
      });

      expect(result.success).toBe(false);
    });
  });

  describe('behavior fields', () => {
    it('should validate mustUseTools as string array', () => {
      const result = TestCaseSchema.safeParse({
        id: 'test-1',
        name: 'Test',
        description: 'Test description',
        category: 'developer',
        prompt: 'Do something',
        approvalStrategy: { type: 'auto-approve' },
        behavior: {
          mustUseTools: ['read', 'write', 'bash'],
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.behavior?.mustUseTools).toEqual(['read', 'write', 'bash']);
      }
    });

    it('should validate minToolCalls and maxToolCalls as numbers', () => {
      const result = TestCaseSchema.safeParse({
        id: 'test-1',
        name: 'Test',
        description: 'Test description',
        category: 'developer',
        prompt: 'Do something',
        approvalStrategy: { type: 'auto-approve' },
        behavior: {
          minToolCalls: 1,
          maxToolCalls: 10,
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.behavior?.minToolCalls).toBe(1);
        expect(result.data.behavior?.maxToolCalls).toBe(10);
      }
    });

    it('should validate boolean flags', () => {
      const result = TestCaseSchema.safeParse({
        id: 'test-1',
        name: 'Test',
        description: 'Test description',
        category: 'developer',
        prompt: 'Do something',
        approvalStrategy: { type: 'auto-approve' },
        behavior: {
          requiresApproval: true,
          requiresContext: true,
          shouldDelegate: false,
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.behavior?.requiresApproval).toBe(true);
        expect(result.data.behavior?.requiresContext).toBe(true);
        expect(result.data.behavior?.shouldDelegate).toBe(false);
      }
    });
  });

  describe('approval strategies', () => {
    it('should accept auto-approve strategy', () => {
      const result = TestCaseSchema.safeParse({
        id: 'test-1',
        name: 'Test',
        description: 'Test description',
        category: 'developer',
        prompt: 'Do something',
        approvalStrategy: { type: 'auto-approve' },
        behavior: { minToolCalls: 1 },
      });

      expect(result.success).toBe(true);
    });

    it('should accept auto-deny strategy', () => {
      const result = TestCaseSchema.safeParse({
        id: 'test-1',
        name: 'Test',
        description: 'Test description',
        category: 'developer',
        prompt: 'Do something',
        approvalStrategy: { type: 'auto-deny' },
        behavior: { minToolCalls: 1 },
      });

      expect(result.success).toBe(true);
    });

    it('should accept smart strategy with config', () => {
      const result = TestCaseSchema.safeParse({
        id: 'test-1',
        name: 'Test',
        description: 'Test description',
        category: 'developer',
        prompt: 'Do something',
        approvalStrategy: {
          type: 'smart',
          config: {
            allowedTools: ['read', 'write'],
            deniedTools: ['bash'],
            maxApprovals: 5,
            defaultDecision: true,
          },
        },
        behavior: { minToolCalls: 1 },
      });

      expect(result.success).toBe(true);
    });
  });

  describe('multi-turn conversations', () => {
    it('should accept prompts array for multi-turn', () => {
      const result = TestCaseSchema.safeParse({
        id: 'test-1',
        name: 'Test',
        description: 'Test description',
        category: 'developer',
        prompts: [
          { text: 'First message' },
          { text: 'Second message', delayMs: 1000 },
          { text: 'Third message', expectContext: true, contextFile: 'docs/api.md' },
        ],
        approvalStrategy: { type: 'auto-approve' },
        behavior: { minToolCalls: 1 },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.prompts).toHaveLength(3);
      }
    });
  });
});
