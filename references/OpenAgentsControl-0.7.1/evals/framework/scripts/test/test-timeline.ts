/**
 * Test script to verify timeline builder works with real session data
 */

import { SessionReader } from './src/collector/session-reader.js';
import { TimelineBuilder } from './src/collector/timeline-builder.js';

async function test() {
  const reader = new SessionReader();
  const builder = new TimelineBuilder(reader);
  
  // Get sessions
  const sessions = await reader.listSessions();
  console.log('Total sessions:', sessions.length);
  
  // Find a session with tools (check first 10)
  for (const session of sessions.slice(0, 10)) {
    console.log('\n--- Checking session:', session.id);
    console.log('    Title:', session.title?.substring(0, 60));
    
    const messagesWithParts = await reader.getMessagesWithParts(session.id);
    console.log('    Messages:', messagesWithParts.length);
    
    let toolCount = 0;
    const toolNames: string[] = [];
    
    for (const msg of messagesWithParts) {
      for (const part of msg.parts || []) {
        if (part.type === 'tool') {
          toolCount++;
          toolNames.push(part.tool);
        }
      }
    }
    
    console.log('    Tool parts in raw data:', toolCount);
    if (toolNames.length > 0) {
      console.log('    Tools:', [...new Set(toolNames)].join(', '));
    }
    
    if (toolCount > 0) {
      // Build timeline and check
      const timeline = await builder.buildTimeline(session.id);
      const toolCalls = timeline.filter(e => e.type === 'tool_call');
      console.log('    Timeline tool_call events:', toolCalls.length);
      
      if (toolCalls.length > 0) {
        console.log('    ✅ Timeline correctly captured tool calls!');
        console.log('    First tool in timeline:', toolCalls[0].data?.tool);
      } else {
        console.log('    ❌ Timeline MISSING tool calls!');
      }
      
      // Found a session with tools, we can stop
      console.log('\n=== VERIFICATION COMPLETE ===');
      if (toolCalls.length === toolCount) {
        console.log('✅ SUCCESS: Timeline correctly captures all tool calls');
      } else {
        console.log(`❌ MISMATCH: Raw data has ${toolCount} tools, timeline has ${toolCalls.length}`);
      }
      return;
    }
  }
  
  console.log('\n⚠️  No sessions with tool calls found in first 10 sessions');
}

test().catch(console.error);
