#!/usr/bin/env node

/**
 * Show detailed test results to understand what happened
 * 
 * This is a simple version that shows captured events during test execution
 */

import { TestRunner } from './test-runner.js';
import { loadTestCase } from './test-case-loader.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function showTestDetails(testFile: string) {
  console.log('🔍 Running test with detailed output\n');

  const testPath = join(__dirname, '../../..', 'opencode/openagent/sdk-tests', testFile);
  
  try {
    // Load test case
    const testCase = await loadTestCase(testPath);
    console.log(`📋 Test: ${testCase.name}`);
    console.log(`   ID: ${testCase.id}`);
    console.log(`   Category: ${testCase.category}`);
    console.log();

    console.log('📝 Expected Results:');
    if (testCase.expected) {
      console.log(`   Should pass: ${testCase.expected.pass}`);
      if (testCase.expected.minMessages) {
        console.log(`   Min messages: ${testCase.expected.minMessages}`);
      }
      if (testCase.expected.maxMessages) {
        console.log(`   Max messages: ${testCase.expected.maxMessages}`);
      }
      if (testCase.expected.toolCalls) {
        console.log(`   Expected tools: ${testCase.expected.toolCalls.join(', ')}`);
      }
    }
    if (testCase.behavior) {
      console.log('   Behavior Expectations:');
      if (testCase.behavior.mustUseTools) {
        console.log(`     Must use tools: ${testCase.behavior.mustUseTools.join(', ')}`);
      }
      if (testCase.behavior.requiresApproval !== undefined) {
        console.log(`     Requires approval: ${testCase.behavior.requiresApproval}`);
      }
    }
    if (testCase.expectedViolations) {
      console.log('   Expected Violations:');
      testCase.expectedViolations.forEach(v => {
        console.log(`     ${v.rule}: shouldViolate=${v.shouldViolate}`);
      });
    }
    console.log();

    // Create runner
    const runner = new TestRunner({
      debug: true,
      runEvaluators: false,
      defaultModel: 'opencode/grok-code-fast',
    });

    // Start and run
    await runner.start();
    const result = await runner.runTest(testCase);
    await runner.stop();

    // Show detailed results
    console.log('\n' + '='.repeat(70));
    console.log('DETAILED RESULTS');
    console.log('='.repeat(70));
    console.log();

    console.log(`✅ Test ${result.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`   Duration: ${result.duration}ms`);
    console.log(`   Session ID: ${result.sessionId}`);
    console.log();

    console.log('📊 Captured Events:');
    console.log(`   Total: ${result.events.length}`);
    
    const eventCounts: Record<string, number> = {};
    result.events.forEach(e => {
      eventCounts[e.type] = (eventCounts[e.type] || 0) + 1;
    });
    
    Object.entries(eventCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`   - ${type}: ${count}`);
      });
    console.log();

    console.log('📨 Event Timeline:');
    result.events.forEach((event, idx) => {
      console.log(`   ${idx + 1}. ${event.type}`);
      if (event.properties && Object.keys(event.properties).length > 0) {
        const props = JSON.stringify(event.properties).substring(0, 80);
        console.log(`      ${props}${props.length >= 80 ? '...' : ''}`);
      }
    });
    console.log();

    console.log('🎯 Approvals:');
    console.log(`   Total given: ${result.approvalsGiven}`);
    console.log();

    if (result.errors.length > 0) {
      console.log('❌ Errors:');
      result.errors.forEach(err => console.log(`   - ${err}`));
      console.log();
    }

    console.log('💡 Analysis:');
    const messageEvents = result.events.filter(e => e.type.includes('message'));
    console.log(`   Message events: ${messageEvents.length}`);
    
    if (testCase.expected?.minMessages && messageEvents.length < testCase.expected.minMessages) {
      console.log(`   ⚠️  Expected at least ${testCase.expected.minMessages} messages, got ${messageEvents.length}`);
    }
    
    const expectedTools = testCase.expected?.toolCalls || testCase.behavior?.mustUseTools;
    if (result.approvalsGiven === 0 && expectedTools && expectedTools.length > 0) {
      console.log(`   ⚠️  Expected tool calls but no approvals were requested`);
      console.log(`   💡 The agent might not be trying to use tools`);
    }
    console.log();

    console.log('🔗 Session Location:');
    console.log(`   ~/.local/share/opencode/storage/session/${result.sessionId}.json`);
    console.log();

    process.exit(result.passed ? 0 : 1);

  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    console.error((error as Error).stack);
    process.exit(1);
  }
}

const testFile = process.argv[2];

if (!testFile) {
  console.error('Usage: tsx src/sdk/show-test-details.ts <test-file>');
  console.error('\nExample:');
  console.error('  tsx src/sdk/show-test-details.ts developer/install-dependencies.yaml');
  process.exit(1);
}

showTestDetails(testFile).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
