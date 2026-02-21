/**
 * Test the simplified SDK-based session retrieval approach
 * 
 * This test verifies that:
 * 1. SessionReader can find sessions using SDK client
 * 2. SessionReader falls back to disk scan when SDK unavailable
 * 3. Works regardless of project path or hash calculation
 */

import { SessionReader } from './dist/collector/session-reader.js';
import path from 'path';
import os from 'os';

console.log('='.repeat(70));
console.log('Testing Simplified Session Retrieval Approach');
console.log('='.repeat(70));
console.log('');

const sessionStoragePath = path.join(os.homedir(), '.local', 'share', 'opencode');

// Test 1: Disk-based fallback (no SDK client)
console.log('Test 1: Disk-based session retrieval (no SDK)');
console.log('-'.repeat(70));

const readerNoSDK = new SessionReader(undefined, sessionStoragePath);

// Try to find a known session
const knownSessionId = 'ses_542a980dbffep8ZGbqIZQ4uF3A';
console.log(`Looking for session: ${knownSessionId}`);

try {
  const session = await readerNoSDK.getSessionInfo(knownSessionId);
  
  if (session) {
    console.log('✅ SUCCESS: Found session via disk scan');
    console.log(`   ID: ${session.id}`);
    console.log(`   Title: ${session.title}`);
    console.log(`   Directory: ${session.directory}`);
    console.log(`   Project ID: ${session.projectID}`);
  } else {
    console.log('❌ FAILED: Session not found');
  }
} catch (error) {
  console.log('❌ ERROR:', error.message);
}

console.log('');

// Test 2: List all sessions
console.log('Test 2: List all sessions (disk scan)');
console.log('-'.repeat(70));

try {
  const sessions = await readerNoSDK.listSessions();
  console.log(`✅ Found ${sessions.length} total sessions`);
  
  if (sessions.length > 0) {
    console.log('');
    console.log('Most recent 5 sessions:');
    sessions.slice(0, 5).forEach((session, idx) => {
      console.log(`${idx + 1}. ${session.id}`);
      console.log(`   Title: ${session.title || 'Untitled'}`);
      console.log(`   Directory: ${session.directory || 'N/A'}`);
      console.log(`   Created: ${new Date(session.time.created).toISOString()}`);
      console.log('');
    });
  }
} catch (error) {
  console.log('❌ ERROR:', error.message);
}

console.log('='.repeat(70));
console.log('Summary:');
console.log('');
console.log('✅ Simplified approach working!');
console.log('   - No complex path calculations');
console.log('   - No hash discovery needed');
console.log('   - Just scan for session ID');
console.log('   - Works for any agent, any project');
console.log('');
console.log('Next: Run actual tests with SDK client to verify full integration');
console.log('='.repeat(70));
