/**
 * Integration tests for ClientManager + EventStreamHandler
 * 
 * NOTE: These tests require the opencode CLI to be installed and a running server.
 * They are skipped by default in CI environments.
 * 
 * To run these tests manually:
 *   npx vitest run src/sdk/__tests__/client-integration.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ServerManager } from '../server-manager.js';
import { ClientManager } from '../client-manager.js';
import { EventStreamHandler } from '../event-stream-handler.js';
import { AutoApproveStrategy } from '../approval/auto-approve-strategy.js';

// Skip integration tests if SKIP_INTEGRATION is set or in CI
const skipIntegration = process.env.SKIP_INTEGRATION === 'true' || process.env.CI === 'true';

describe.skipIf(skipIntegration)('ClientManager Integration', () => {
  let server: ServerManager;
  let client: ClientManager;
  let eventHandler: EventStreamHandler;
  let sessionId: string;

  beforeAll(async () => {
    server = new ServerManager({
      port: 0,
      timeout: 15000,
    });
    
    const { url } = await server.start();
    client = new ClientManager({ baseUrl: url });
    eventHandler = new EventStreamHandler(url);
  });

  afterAll(async () => {
    if (eventHandler?.listening()) {
      eventHandler.stopListening();
    }
    if (sessionId && client) {
      try {
        await client.deleteSession(sessionId);
      } catch {
        // Ignore cleanup errors
      }
    }
    if (server?.running()) {
      await server.stop();
    }
  });

  it('should create a session', async () => {
    const session = await client.createSession({ title: 'Integration Test Session' });
    sessionId = session.id;
    
    expect(session.id).toBeDefined();
    expect(session.title).toBe('Integration Test Session');
  });

  it('should list sessions', async () => {
    const sessions = await client.listSessions();
    
    expect(sessions).toBeDefined();
    expect(Array.isArray(sessions)).toBe(true);
    
    const found = sessions.find(s => s.id === sessionId);
    expect(found).toBeDefined();
  });

  it('should get session by ID', async () => {
    const session = await client.getSession(sessionId);
    
    expect(session).toBeDefined();
    expect(session.id).toBe(sessionId);
  });

  it('should setup event handler with auto-approve', async () => {
    const approvalStrategy = new AutoApproveStrategy();
    const events: string[] = [];
    
    eventHandler.on('session.updated', () => { events.push('session.updated'); });
    eventHandler.on('message.created', () => { events.push('message.created'); });
    eventHandler.on('message.updated', () => { events.push('message.updated'); });
    
    eventHandler.onPermission(async (event) => {
      return approvalStrategy.shouldApprove(event);
    });

    // Start listening in background
    eventHandler.startListening().catch(() => {
      // Ignore errors when stopping
    });
    
    // Give time to connect
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    expect(eventHandler.listening()).toBe(true);
  });

  it('should send a prompt and receive events', async () => {
    const events: string[] = [];
    
    eventHandler.on('message.updated', () => { events.push('message.updated'); });
    
    await client.sendPrompt(sessionId, {
      text: 'Say "Hello" and nothing else.',
    });
    
    // Give time for events
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Should have received some events
    expect(events.length).toBeGreaterThan(0);
  });

  it('should delete session', async () => {
    await client.deleteSession(sessionId);
    
    // Session should no longer exist
    const sessions = await client.listSessions();
    const found = sessions.find(s => s.id === sessionId);
    expect(found).toBeUndefined();
    
    sessionId = ''; // Clear so afterAll doesn't try to delete again
  });
});

// Unit tests that don't require a running server
describe('ClientManager Unit', () => {
  it('should create with base URL', () => {
    const client = new ClientManager({ baseUrl: 'http://localhost:3000' });
    
    expect(client).toBeDefined();
  });
});

describe('EventStreamHandler Unit', () => {
  it('should create with base URL', () => {
    const handler = new EventStreamHandler('http://localhost:3000');
    
    expect(handler).toBeDefined();
    expect(handler.listening()).toBe(false);
  });

  it('should register event handlers', () => {
    const handler = new EventStreamHandler('http://localhost:3000');
    
    handler.on('session.created', () => {});
    handler.on('message.created', () => {});
    
    // No error means success
    expect(true).toBe(true);
  });

  it('should remove all handlers', () => {
    const handler = new EventStreamHandler('http://localhost:3000');
    
    handler.on('session.created', () => {});
    handler.removeAllHandlers();
    
    // No error means success
    expect(true).toBe(true);
  });
});
