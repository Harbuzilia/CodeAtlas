/**
 * Tests for ServerManager
 * 
 * NOTE: These tests require the opencode CLI to be installed and available.
 * They are skipped by default in CI environments.
 * 
 * To run these tests manually:
 *   npx vitest run src/sdk/__tests__/server-manager.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ServerManager } from '../server-manager.js';

// Skip integration tests if SKIP_INTEGRATION is set or in CI
const skipIntegration = process.env.SKIP_INTEGRATION === 'true' || process.env.CI === 'true';

describe.skipIf(skipIntegration)('ServerManager Integration', () => {
  let server: ServerManager;

  beforeAll(() => {
    server = new ServerManager({
      port: 0, // Random port
      timeout: 15000,
    });
  });

  afterAll(async () => {
    if (server?.running()) {
      await server.stop();
    }
  });

  it('should start the server', async () => {
    const { url, port } = await server.start();
    
    expect(url).toBeDefined();
    expect(port).toBeGreaterThan(0);
    expect(server.running()).toBe(true);
  });

  it('should return the server URL', () => {
    const url = server.getUrl();
    
    expect(url).toBeDefined();
    expect(url).toContain('http://');
  });

  it('should respond to HTTP requests', async () => {
    const url = server.getUrl();
    if (!url) throw new Error('Server URL not available');
    
    const response = await fetch(url);
    
    expect(response.ok).toBe(true);
  });

  it('should stop the server', async () => {
    await server.stop();
    
    expect(server.running()).toBe(false);
  });
});

// Unit tests that don't require a running server
describe('ServerManager Unit', () => {
  it('should create with default options', () => {
    const server = new ServerManager();
    
    expect(server).toBeDefined();
    expect(server.running()).toBe(false);
  });

  it('should create with custom port', () => {
    const server = new ServerManager({ port: 8080 });
    
    expect(server).toBeDefined();
    expect(server.running()).toBe(false);
  });

  it('should return null URL when not running', () => {
    const server = new ServerManager();
    
    expect(server.getUrl()).toBeNull();
  });
});
