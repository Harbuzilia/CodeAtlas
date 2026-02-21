#!/usr/bin/env npx tsx
/**
 * Debug script to inspect session data
 * 
 * Usage: npx tsx debug-session.ts [sessionId] [baseUrl]
 */

import { createOpencodeClient } from '@opencode-ai/sdk';

const sessionId = process.argv[2];
const baseUrl = process.argv[3] || 'http://127.0.0.1:3000';

async function inspect() {
  console.log(`Connecting to ${baseUrl}...`);
  const client = createOpencodeClient({ baseUrl });
  
  // Get sessions
  const sessions = await client.session.list();
  console.log('\n=== Sessions ===');
  console.log('Total sessions:', sessions.data?.length);
  
  // Find the session to inspect
  let targetSession = sessionId 
    ? sessions.data?.find(s => s.id === sessionId)
    : sessions.data?.[0];
    
  if (!targetSession) {
    console.log('No session found');
    return;
  }
  
  console.log('\n=== Session Info ===');
  console.log('ID:', targetSession.id);
  console.log('Title:', targetSession.title);
  
  // Get messages
  const messagesResp = await client.session.messages({ path: { id: targetSession.id } });
  const messages = messagesResp.data || [];
  console.log('\n=== Messages ===');
  console.log('Total messages:', messages.length);
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    console.log(`\n--- Message ${i + 1} ---`);
    console.log('Role:', msg.info?.role);
    console.log('Mode (agent):', msg.info?.mode);
    console.log('Parts count:', msg.parts?.length);
    
    if (msg.parts) {
      for (let j = 0; j < msg.parts.length; j++) {
        const part = msg.parts[j];
        console.log(`\n  Part ${j + 1}:`);
        console.log('    Type:', part.type);
        console.log('    ID:', part.id);
        
        if (part.type === 'tool') {
          console.log('    Tool name:', part.tool);
          console.log('    Status:', part.state?.status || part.status);
          console.log('    Input:', JSON.stringify(part.state?.input || part.input, null, 2).substring(0, 500));
          if (part.state?.output || part.output) {
            const output = JSON.stringify(part.state?.output || part.output);
            console.log('    Output preview:', output.substring(0, 300));
          }
        }
        
        if (part.type === 'text') {
          console.log('    Text preview:', (part.text || '').substring(0, 300));
        }
      }
    }
  }
  
  // Also dump raw structure for first message with parts
  const msgWithParts = messages.find(m => m.parts && m.parts.length > 0);
  if (msgWithParts) {
    console.log('\n=== Raw Part Structure (first message with parts) ===');
    console.log(JSON.stringify(msgWithParts.parts?.[0], null, 2));
  }
}

inspect().catch(console.error);
