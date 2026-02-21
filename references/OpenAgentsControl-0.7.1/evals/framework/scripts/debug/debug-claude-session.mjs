import { createOpencodeClient } from '@opencode-ai/sdk';
import { SessionReader } from './dist/collector/session-reader.js';
import { TimelineBuilder } from './dist/collector/timeline-builder.js';

const client = createOpencodeClient({
  baseUrl: 'http://localhost:3721'
});

const sessionId = 'ses_542667051ffe5nQvZ31DzUo6Ux';

const reader = new SessionReader(client);
const builder = new TimelineBuilder(reader);

console.log('Building timeline...\n');
const timeline = await builder.buildTimeline(sessionId);

console.log(`Timeline events: ${timeline.length}\n`);

// Show tool calls
const toolCalls = timeline.filter(e => e.type === 'tool_call');
console.log(`Tool calls: ${toolCalls.length}`);
toolCalls.forEach((tc, i) => {
  console.log(`  ${i + 1}. ${tc.data.tool} - ${tc.data.state?.status || 'unknown'}`);
  if (tc.data.state?.input) {
    console.log(`     Input:`, JSON.stringify(tc.data.state.input).substring(0, 100));
  }
});

// Show text parts
const textParts = timeline.filter(e => e.type === 'text');
console.log(`\nText parts: ${textParts.length}`);
textParts.forEach((tp, i) => {
  const text = tp.data.text || '';
  console.log(`  ${i + 1}. ${text.substring(0, 100)}...`);
});
