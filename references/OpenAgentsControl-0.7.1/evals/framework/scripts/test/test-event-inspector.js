import { TestRunner } from './dist/sdk/test-runner.js';
import { loadTestCase } from './dist/sdk/test-case-loader.js';

async function inspectTest() {
  const testCase = await loadTestCase('../agents/openagent/tests/developer/ctx-code-001.yaml');
  
  const runner = new TestRunner({
    debug: true,
    runEvaluators: false,
    defaultModel: 'opencode/grok-code-fast',
  });

  await runner.start();
  const result = await runner.runTest(testCase);
  await runner.stop();

  console.log('\n=== EVENT DETAILS ===');
  console.log(`Total events: ${result.events.length}`);
  result.events.forEach((event, idx) => {
    console.log(`\n${idx + 1}. ${event.type}`);
    console.log(`   Properties:`, JSON.stringify(event.properties, null, 2));
  });

  console.log('\n=== TEST RESULT ===');
  console.log(`Passed: ${result.passed}`);
  console.log(`Approvals: ${result.approvalsGiven}`);
  console.log(`Errors: ${result.errors.length}`);
}

inspectTest().catch(console.error);
