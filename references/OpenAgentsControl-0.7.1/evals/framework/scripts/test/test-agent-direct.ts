#!/usr/bin/env npx tsx
/**
 * Direct test: Ask agent to run ls and check if it actually executes
 */

import { createOpencodeClient } from '@opencode-ai/sdk';

const baseUrl = process.argv[2] || 'http://127.0.0.1:3000';
const agentToUse = process.argv[3] || 'opencoder';

async function test() {
  console.log(`Connecting to ${baseUrl}...`);
  console.log(`Using agent: ${agentToUse}`);
  const client = createOpencodeClient({ baseUrl });
  
  // Create a new session
  console.log('\n1. Creating session...');
  const sessionResp = await client.session.create({
    body: { title: 'Direct Tool Test' }
  });
  const sessionId = sessionResp.data?.id;
  console.log(`   Session: ${sessionId}`);
  
  if (!sessionId) {
    console.log('Failed to create session');
    return;
  }
  
  // Send a simple prompt using the correct API
  console.log('\n2. Sending prompt: "Run ls in the current directory"');
  console.log('   (prompt() should block until complete)');
  
  const startTime = Date.now();
  try {
    const response = await client.session.prompt({
      path: { id: sessionId },
      body: {
        parts: [{ type: 'text', text: 'Run ls in the current directory' }],
        agent: agentToUse,
        model: {
          providerID: 'anthropic',
          modelID: 'claude-sonnet-4-5'
        }
      }
    });
    const elapsed = Date.now() - startTime;
    console.log(`   Prompt completed in ${elapsed}ms`);
    console.log(`   Response has data: ${!!response.data}`);
    
    // Check response directly
    if (response.data) {
      console.log(`   Response info role: ${response.data.info?.role}`);
      console.log(`   Response parts: ${response.data.parts?.length || 0}`);
      
      for (const part of response.data.parts || []) {
        console.log(`   - Part type: ${part.type}`);
        if (part.type === 'tool') {
          console.log(`     Tool: ${part.tool}, Status: ${part.state?.status}`);
        }
      }
    }
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.log(`   Error after ${elapsed}ms:`, (error as Error).message);
  }
  
  // No artificial wait - prompt() should have blocked until complete
  console.log('\n3. Checking messages...');
  
  // Get messages
  console.log('\n4. Checking response...');
  const messagesResp = await client.session.messages({ path: { id: sessionId } });
  const messages = messagesResp.data || [];
  
  console.log(`   Total messages: ${messages.length}`);
  
  // Check for tool usage
  let toolCount = 0;
  let bashOutput = '';
  
  for (const msg of messages) {
    if (msg.info?.role === 'assistant') {
      for (const part of msg.parts || []) {
        if (part.type === 'tool') {
          toolCount++;
          console.log(`\n   TOOL FOUND: ${part.tool}`);
          console.log(`   Status: ${part.state?.status || part.status}`);
          
          if (part.tool === 'bash') {
            console.log(`   Command: ${part.state?.input?.command || part.input?.command}`);
            bashOutput = part.state?.output || part.output || '';
            if (bashOutput) {
              console.log(`   Output preview: ${String(bashOutput).substring(0, 500)}`);
            }
          }
        }
      }
    }
  }
  
  console.log('\n=== RESULT ===');
  if (toolCount > 0) {
    console.log(`✅ Agent used ${toolCount} tool(s)`);
    if (bashOutput) {
      console.log('✅ Got bash output - tools are working!');
    }
  } else {
    console.log('❌ Agent did NOT use any tools');
    console.log('\nAgent response (text only):');
    for (const msg of messages) {
      if (msg.info?.role === 'assistant') {
        for (const part of msg.parts || []) {
          if (part.type === 'text') {
            console.log(part.text?.substring(0, 1000));
          }
        }
      }
    }
  }
  
  // Cleanup
  console.log('\n5. Cleaning up...');
  try {
    await client.session.delete({ path: { id: sessionId } });
    console.log('   Session deleted');
  } catch {
    console.log('   Could not delete session');
  }
}

test().catch(console.error);
