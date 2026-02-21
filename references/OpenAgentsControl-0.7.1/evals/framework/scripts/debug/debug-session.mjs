import { createOpencodeClient } from '@opencode-ai/sdk';
import { SessionReader } from './dist/collector/session-reader.js';
import { TimelineBuilder } from './dist/collector/timeline-builder.js';

const client = createOpencodeClient({
  baseUrl: 'http://localhost:3721'
});

const sessionId = 'ses_54285cf4effeB8lTpo4r5v3swc';

const reader = new SessionReader(client);
const builder = new TimelineBuilder(reader);

console.log('Building timeline...\n');
const timeline = await builder.buildTimeline(sessionId);

console.log(`Timeline events: ${timeline.length}\n`);

// Show event types
const eventTypes = {};
timeline.forEach(e => {
  eventTypes[e.type] = (eventTypes[e.type] || 0) + 1;
});

console.log('Event types:');
Object.entries(eventTypes).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});

// Show tool calls
const toolCalls = timeline.filter(e => e.type === 'tool_call');
console.log(`\nTool calls: ${toolCalls.length}`);
toolCalls.forEach((tc, i) => {
  console.log(`  ${i + 1}. ${tc.data.tool} - ${tc.data.state}`);
});
