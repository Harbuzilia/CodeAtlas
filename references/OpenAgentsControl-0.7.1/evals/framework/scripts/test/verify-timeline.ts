#!/usr/bin/env npx tsx
/**
 * Verify timeline builder correctly captures tools from a real session
 */

import { createOpencodeClient } from '@opencode-ai/sdk';
import { SessionReader } from './src/collector/session-reader.js';
import { TimelineBuilder } from './src/collector/timeline-builder.js';

const sessionId = process.argv[2];
const baseUrl = process.argv[3] || 'http://127.0.0.1:3000';

async function verify() {
  console.log(`Connecting to ${baseUrl}...`);
  const client = createOpencodeClient({ baseUrl });
  
  // Create reader with SDK client
  const reader = new SessionReader(client);
  const builder = new TimelineBuilder(reader);
  
  // Get session to test
  let targetSessionId = sessionId;
  if (!targetSessionId) {
    const sessions = await client.session.list();
    // Find a session with tools (our current conversation)
    targetSessionId = sessions.data?.find(s => s.title?.includes('Testing eval system'))?.id || sessions.data?.[0]?.id;
  }
  
  if (!targetSessionId) {
    console.log('No session found');
    return;
  }
  
  console.log(`\nTesting session: ${targetSessionId}`);
  
  // Get raw messages with parts
  console.log('\n=== Raw Data ===');
  const messagesWithParts = await reader.getMessagesWithParts(targetSessionId);
  console.log(`Messages: ${messagesWithParts.length}`);
  
  let rawToolCount = 0;
  const rawToolNames: string[] = [];
  
  for (const msg of messagesWithParts) {
    for (const part of msg.parts || []) {
      if (part.type === 'tool') {
        rawToolCount++;
        rawToolNames.push(part.tool);
      }
    }
  }
  
  console.log(`Tool parts in raw data: ${rawToolCount}`);
  if (rawToolNames.length > 0) {
    console.log(`Tools: ${[...new Set(rawToolNames)].join(', ')}`);
  }
  
  // Build timeline
  console.log('\n=== Timeline ===');
  const timeline = await builder.buildTimeline(targetSessionId);
  const toolCalls = timeline.filter(e => e.type === 'tool_call');
  
  console.log(`Total timeline events: ${timeline.length}`);
  console.log(`Tool call events: ${toolCalls.length}`);
  
  if (toolCalls.length > 0) {
    console.log('\nTool calls found:');
    toolCalls.slice(0, 10).forEach((tc, i) => {
      console.log(`  ${i + 1}. ${tc.data?.tool}: ${JSON.stringify(tc.data?.state?.input || tc.data?.input || {}).substring(0, 100)}`);
    });
  }
  
  // Verify
  console.log('\n=== Verification ===');
  if (rawToolCount === toolCalls.length) {
    console.log(`✅ SUCCESS: Raw data has ${rawToolCount} tools, timeline has ${toolCalls.length} tool_call events`);
  } else {
    console.log(`❌ MISMATCH: Raw data has ${rawToolCount} tools, timeline has ${toolCalls.length} tool_call events`);
  }
}

verify().catch(console.error);
