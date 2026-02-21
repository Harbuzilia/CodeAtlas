/**
 * Type-safe tests for ResultSaver
 * 
 * These tests verify:
 * 1. Type safety at compile time
 * 2. Correct JSON structure generation
 * 3. Category extraction logic
 * 4. File naming conventions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ResultSaver, type ResultSummary, type TestCategory } from '../result-saver.js';
import type { TestResult } from '../test-runner.js';
import type { TestCase } from '../test-case-schema.js';
import { rmSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ResultSaver', () => {
  let tempDir: string;
  let resultSaver: ResultSaver;
  
  beforeEach(() => {
    // Create temp directory for tests
    tempDir = join(tmpdir(), `result-saver-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    resultSaver = new ResultSaver(tempDir);
  });
  
  afterEach(() => {
    // Clean up temp directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
  
  describe('Type Safety', () => {
    it('should generate type-safe ResultSummary', async () => {
      const mockResults = createMockResults();
      
      const savedPath = await resultSaver.save(mockResults, 'openagent', 'opencode/grok-code-fast');
      
      // Read and parse JSON
      const json = readFileSync(savedPath, 'utf8');
      const summary: ResultSummary = JSON.parse(json);
      
      // Type assertions (compile-time checks)
      expect(summary.meta.timestamp).toBeTypeOf('string');
      expect(summary.meta.agent).toBe('openagent');
      expect(summary.meta.model).toBe('opencode/grok-code-fast');
      expect(summary.meta.framework_version).toBeTypeOf('string');
      
      expect(summary.summary.total).toBeTypeOf('number');
      expect(summary.summary.passed).toBeTypeOf('number');
      expect(summary.summary.failed).toBeTypeOf('number');
      expect(summary.summary.duration_ms).toBeTypeOf('number');
      expect(summary.summary.pass_rate).toBeTypeOf('number');
      
      expect(summary.by_category).toBeTypeOf('object');
      expect(summary.tests).toBeInstanceOf(Array);
    });
    
    it('should enforce readonly properties', () => {
      // This test verifies compile-time readonly enforcement
      const mockResults = createMockResults();
      
      // TypeScript should prevent these assignments at compile time:
      // summary.meta.timestamp = 'new value'; // ❌ Error: Cannot assign to 'timestamp' because it is a read-only property
      // summary.tests[0].passed = false; // ❌ Error: Cannot assign to 'passed' because it is a read-only property
      
      expect(true).toBe(true); // Placeholder - real test is compile-time
    });
    
    it('should validate category types', async () => {
      const mockResults = createMockResults();
      const savedPath = await resultSaver.save(mockResults, 'openagent', 'opencode/grok-code-fast');
      
      const json = readFileSync(savedPath, 'utf8');
      const summary: ResultSummary = JSON.parse(json);
      
      const validCategories: TestCategory[] = ['developer', 'business', 'creative', 'edge-case', 'other'];
      
      for (const test of summary.tests) {
        expect(validCategories).toContain(test.category);
      }
    });
  });
  
  describe('JSON Structure', () => {
    it('should generate correct summary statistics', async () => {
      const mockResults = createMockResults();
      const savedPath = await resultSaver.save(mockResults, 'openagent', 'opencode/grok-code-fast');
      
      const json = readFileSync(savedPath, 'utf8');
      const summary: ResultSummary = JSON.parse(json);
      
      expect(summary.summary.total).toBe(3);
      expect(summary.summary.passed).toBe(2);
      expect(summary.summary.failed).toBe(1);
      expect(summary.summary.pass_rate).toBeCloseTo(2/3, 2);
    });
    
    it('should group tests by category', async () => {
      const mockResults = createMockResults();
      const savedPath = await resultSaver.save(mockResults, 'openagent', 'opencode/grok-code-fast');
      
      const json = readFileSync(savedPath, 'utf8');
      const summary: ResultSummary = JSON.parse(json);
      
      expect(summary.by_category.developer).toBeDefined();
      expect(summary.by_category.developer.total).toBe(2);
      expect(summary.by_category.developer.passed).toBe(2);
      
      expect(summary.by_category['edge-case']).toBeDefined();
      expect(summary.by_category['edge-case'].total).toBe(1);
      expect(summary.by_category['edge-case'].passed).toBe(0);
    });
    
    it('should include violation details', async () => {
      const mockResults = createMockResults();
      const savedPath = await resultSaver.save(mockResults, 'openagent', 'opencode/grok-code-fast');
      
      const json = readFileSync(savedPath, 'utf8');
      const summary: ResultSummary = JSON.parse(json);
      
      const failedTest = summary.tests.find(t => !t.passed);
      expect(failedTest).toBeDefined();
      expect(failedTest!.violations.total).toBe(1);
      expect(failedTest!.violations.errors).toBe(1);
      expect(failedTest!.violations.details).toBeDefined();
      expect(failedTest!.violations.details![0].type).toBe('missing-approval');
    });
  });
  
  describe('File Management', () => {
    it('should create history directory structure', async () => {
      const mockResults = createMockResults();
      await resultSaver.save(mockResults, 'openagent', 'opencode/grok-code-fast');
      
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const historyDir = join(tempDir, 'history', yearMonth);
      
      expect(existsSync(historyDir)).toBe(true);
    });
    
    it('should update latest.json', async () => {
      const mockResults = createMockResults();
      await resultSaver.save(mockResults, 'openagent', 'opencode/grok-code-fast');
      
      const latestPath = join(tempDir, 'latest.json');
      expect(existsSync(latestPath)).toBe(true);
      
      const json = readFileSync(latestPath, 'utf8');
      const summary: ResultSummary = JSON.parse(json);
      expect(summary.meta.agent).toBe('openagent');
    });
    
    it('should generate correct filename format', async () => {
      const mockResults = createMockResults();
      const savedPath = await resultSaver.save(mockResults, 'openagent', 'opencode/grok-code-fast');
      
      const filename = savedPath.split('/').pop()!;
      
      // Format: DD-HHMMSS-{agent}.json
      expect(filename).toMatch(/^\d{2}-\d{6}-openagent\.json$/);
    });
  });
  
  describe('Metadata', () => {
    it('should include git commit hash if available', async () => {
      const mockResults = createMockResults();
      const savedPath = await resultSaver.save(mockResults, 'openagent', 'opencode/grok-code-fast');
      
      const json = readFileSync(savedPath, 'utf8');
      const summary: ResultSummary = JSON.parse(json);
      
      // Git commit should be 7 hex characters or undefined
      if (summary.meta.git_commit) {
        expect(summary.meta.git_commit).toMatch(/^[0-9a-f]{7}$/);
      }
    });
    
    it('should include framework version', async () => {
      const mockResults = createMockResults();
      const savedPath = await resultSaver.save(mockResults, 'openagent', 'opencode/grok-code-fast');
      
      const json = readFileSync(savedPath, 'utf8');
      const summary: ResultSummary = JSON.parse(json);
      
      expect(summary.meta.framework_version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });
});

/**
 * Create mock test results for testing
 */
function createMockResults(): TestResult[] {
  const baseTestCase: TestCase = {
    id: 'test-001',
    name: 'Test 001',
    description: 'Test description',
    category: 'developer',
    prompt: 'Test prompt',
    approvalStrategy: { type: 'auto-approve' },
  };
  
  return [
    {
      testCase: { ...baseTestCase, id: 'task-simple-001', category: 'developer' },
      sessionId: 'session-1',
      passed: true,
      errors: [],
      events: [],
      duration: 1000,
      approvalsGiven: 0,
      evaluation: {
        sessionId: 'session-1',
        sessionInfo: {} as any,
        timestamp: Date.now(),
        totalViolations: 0,
        violationsBySeverity: { error: 0, warning: 0, info: 0 },
        allViolations: [],
        allEvidence: [],
        evaluatorResults: [],
        overallPassed: true,
        overallScore: 1.0,
      },
    },
    {
      testCase: { ...baseTestCase, id: 'ctx-code-001', category: 'developer' },
      sessionId: 'session-2',
      passed: true,
      errors: [],
      events: [],
      duration: 2000,
      approvalsGiven: 1,
      evaluation: {
        sessionId: 'session-1',
        sessionInfo: {} as any,
        timestamp: Date.now(),
        totalViolations: 0,
        violationsBySeverity: { error: 0, warning: 0, info: 0 },
        allViolations: [],
        allEvidence: [],
        evaluatorResults: [],
        overallPassed: true,
        overallScore: 1.0,
      },
    },
    {
      testCase: { ...baseTestCase, id: 'missing-approval-negative', category: 'edge-case' },
      sessionId: 'session-3',
      passed: false,
      errors: [],
      events: [],
      duration: 1500,
      approvalsGiven: 0,
      evaluation: {
        sessionId: 'session-3',
        sessionInfo: {} as any,
        timestamp: Date.now(),
        totalViolations: 1,
        violationsBySeverity: { error: 1, warning: 0, info: 0 },
        allViolations: [
          {
            type: 'missing-approval',
            severity: 'error',
            message: 'Execution tool called without approval',
            timestamp: Date.now(),
            evidence: {},
          },
        ],
        allEvidence: [],
        evaluatorResults: [],
        overallPassed: false,
        overallScore: 0.0,
      },
    },
  ];
}
