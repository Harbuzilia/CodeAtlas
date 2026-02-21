/**
 * Tests for TestRunner
 * 
 * NOTE: Integration tests require the opencode CLI to be installed.
 * They are skipped by default in CI environments.
 * 
 * To run these tests manually:
 *   npx vitest run src/sdk/__tests__/test-runner.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestRunner } from '../test-runner.js';
import type { TestCase } from '../test-case-schema.js';

// Skip integration tests if SKIP_INTEGRATION is set or in CI
const skipIntegration = process.env.SKIP_INTEGRATION === 'true' || process.env.CI === 'true';

describe.skipIf(skipIntegration)('TestRunner Integration', () => {
  let runner: TestRunner;

  beforeAll(async () => {
    runner = new TestRunner({
      debug: false,
      defaultTimeout: 30000,
      runEvaluators: false, // Disable evaluators for faster tests
    });
    
    await runner.start();
  }, 30000); // 30s timeout for server startup

  afterAll(async () => {
    if (runner) {
      await runner.stop();
    }
  });

  it('should run a simple test case', async () => {
    const testCase: TestCase = {
      id: 'unit-test-001',
      name: 'Simple Echo Test',
      description: 'Test that agent responds to a simple prompt',
      category: 'edge-case',
      prompt: 'Say "Hello" and nothing else.',
      approvalStrategy: {
        type: 'auto-approve',
      },
      expected: {
        pass: true,
        minMessages: 1,
      },
      timeout: 30000,
    };

    const result = await runner.runTest(testCase);

    expect(result.sessionId).toBeDefined();
    expect(result.testCase.id).toBe('unit-test-001');
    expect(result.duration).toBeGreaterThan(0);
    expect(result.errors.length).toBe(0);
  }, 60000); // 60s timeout

  it('should capture events during test execution', async () => {
    const testCase: TestCase = {
      id: 'unit-test-002',
      name: 'Event Capture Test',
      description: 'Test that events are captured',
      category: 'edge-case',
      prompt: 'What is 2 + 2?',
      approvalStrategy: {
        type: 'auto-approve',
      },
      expected: {
        pass: true,
      },
      timeout: 30000,
    };

    const result = await runner.runTest(testCase);

    expect(result.events.length).toBeGreaterThan(0);
  }, 60000);

  it('should handle test with behavior expectations', async () => {
    const testCase: TestCase = {
      id: 'unit-test-003',
      name: 'Behavior Test',
      description: 'Test with behavior expectations',
      category: 'edge-case',
      prompt: 'Say "Test passed" and nothing else.',
      approvalStrategy: {
        type: 'auto-approve',
      },
      behavior: {
        maxToolCalls: 0, // Should not use any tools
      },
      timeout: 30000,
    };

    const result = await runner.runTest(testCase);

    expect(result.sessionId).toBeDefined();
    expect(result.errors.length).toBe(0);
  }, 60000);
});

// Unit tests that don't require a running server
describe('TestRunner Unit', () => {
  it('should create with default options', () => {
    const runner = new TestRunner();
    
    expect(runner).toBeDefined();
  });

  it('should create with custom options', () => {
    const runner = new TestRunner({
      port: 8080,
      debug: true,
      defaultTimeout: 60000,
      runEvaluators: false,
    });
    
    expect(runner).toBeDefined();
  });

  it('should throw if runTest called before start', async () => {
    const runner = new TestRunner();
    
    const testCase: TestCase = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      category: 'edge-case',
      prompt: 'Test',
      approvalStrategy: { type: 'auto-approve' },
      expected: { pass: true },
    };

    await expect(runner.runTest(testCase)).rejects.toThrow('Test runner not started');
  });
});
