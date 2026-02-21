/**
 * Test script to verify SessionReader can find SDK sessions
 * 
 * This script tests the fix for the session storage path mismatch.
 * It should now find sessions created by the SDK in the hash-based directory.
 */

import { SessionReader } from './dist/collector/session-reader.js';
import { getProjectHash } from './dist/config.js';
import path from 'path';
import os from 'os';

const projectPath = '/Users/darrenhinde/Documents/GitHub/opencode-agents/evals/framework';
const sessionStoragePath = path.join(os.homedir(), '.local', 'share', 'opencode');

console.log('='.repeat(60));
console.log('Testing SessionReader with SDK storage paths');
console.log('='.repeat(60));
console.log('');

console.log('Project path:', projectPath);
console.log('Project hash:', getProjectHash(projectPath));
console.log('Storage path:', sessionStoragePath);
console.log('');

const reader = new SessionReader(projectPath, sessionStoragePath);
const sessions = reader.listSessions();

console.log('Found', sessions.length, 'sessions');
console.log('');

if (sessions.length > 0) {
  console.log('Most recent 5 sessions:');
  sessions.slice(0, 5).forEach((session, idx) => {
    console.log(`${idx + 1}. ${session.id}`);
    console.log(`   Title: ${session.title}`);
    console.log(`   Created: ${new Date(session.time.created).toISOString()}`);
    console.log('');
  });
} else {
  console.log('No sessions found. This might indicate:');
  console.log('1. No tests have been run yet');
  console.log('2. Sessions are in a different location');
  console.log('3. Project hash calculation is incorrect');
}

console.log('='.repeat(60));
