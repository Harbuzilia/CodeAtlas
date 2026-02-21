/**
 * Inspect the most recent session to see what events were captured
 */

import { SessionReader } from './dist/collector/session-reader.js';
import path from 'path';
import os from 'os';

const sessionStoragePath = path.join(os.homedir(), '.local', 'share', 'opencode');
const reader = new SessionReader(undefined, sessionStoragePath);

// Get session ID from command line or use most recent
const sessionId = process.argv[2];
let mostRecent;

if (sessionId) {
  console.log(`Looking for session: ${sessionId}`);
  mostRecent = await reader.getSessionInfo(sessionId);
  if (!mostRecent) {
    console.log('Session not found!');
    process.exit(1);
  }
} else {
  // Get the most recent session
  const sessions = await reader.listSessions();
  mostRecent = sessions[0];
}

console.log('='.repeat(70));
console.log('Most Recent Session Analysis');
console.log('='.repeat(70));
console.log('');
console.log('Session Info:');
console.log('  ID:', mostRecent.id);
console.log('  Title:', mostRecent.title);
console.log('  Agent:', mostRecent.agent || 'N/A');
console.log('  Directory:', mostRecent.directory);
console.log('  Created:', new Date(mostRecent.time.created).toISOString());
console.log('');

// Get messages
const messages = await reader.getMessages(mostRecent.id);
console.log(`Messages: ${messages.length}`);
console.log('');

for (let i = 0; i < messages.length; i++) {
  const msg = messages[i];
  console.log('-'.repeat(70));
  console.log(`Message ${i + 1}:`);
  console.log('  ID:', msg.id);
  console.log('  Role:', msg.role);
  console.log('  Agent:', msg.agent || 'N/A');
  console.log('  Model:', msg.model?.modelID || 'N/A');
  console.log('  Created:', new Date(msg.time.created).toISOString());
  
  const parts = await reader.getParts(mostRecent.id, msg.id);
  console.log(`  Parts: ${parts.length}`);
  console.log('');
  
  for (let j = 0; j < parts.length; j++) {
    const part = parts[j];
    console.log(`  Part ${j + 1}:`);
    console.log(`    Type: ${part.type}`);
    
    if (part.type === 'text') {
      const text = part.text || '';
      console.log(`    Text: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);
    } else if (part.type === 'tool') {
      console.log(`    Tool: ${part.tool}`);
      console.log(`    Input: ${JSON.stringify(part.input).substring(0, 100)}...`);
    }
    console.log('');
  }
}

console.log('='.repeat(70));
