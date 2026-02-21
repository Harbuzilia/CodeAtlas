/**
 * SessionReader - Read OpenCode session data
 * 
 * SIMPLIFIED APPROACH:
 * 1. Use SDK client to get session data (primary method)
 * 2. Fallback to disk scan by session ID (when SDK unavailable)
 * 
 * This avoids complex path calculations and hash discovery.
 * Works for any agent, any project structure.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SessionInfo, Message, Part, MessageWithParts } from '../types/index.js';

// SDK client type (optional dependency)
type OpencodeClient = any;

/**
 * Read and parse OpenCode session data
 * 
 * Uses SDK client when available, falls back to simple file scanning.
 */
export class SessionReader {
  private sdkClient?: OpencodeClient;
  private sessionStoragePath: string;

  /**
   * Create a SessionReader
   * 
   * @param sdkClient - Optional SDK client for retrieving session data
   * @param sessionStoragePath - Base storage path (defaults to ~/.local/share/opencode)
   */
  constructor(sdkClient?: OpencodeClient, sessionStoragePath?: string) {
    this.sdkClient = sdkClient;
    this.sessionStoragePath = sessionStoragePath || path.join(os.homedir(), '.local', 'share', 'opencode');
  }

  /**
   * Find a session file by scanning all session directories
   * 
   * Simple approach: Just look for the session ID in any hash directory.
   * No need to calculate hashes or match project paths.
   * 
   * @param sessionId - Session ID to find
   * @returns Full path to session file or null if not found
   */
  private findSessionFile(sessionId: string): string | null {
    try {
      const sessionBasePath = path.join(this.sessionStoragePath, 'storage', 'session');

      if (!fs.existsSync(sessionBasePath)) {
        return null;
      }

      // Scan all hash directories
      const hashDirs = fs.readdirSync(sessionBasePath);
      
      for (const hashDir of hashDirs) {
        const hashPath = path.join(sessionBasePath, hashDir);
        
        // Skip if not a directory
        if (!fs.statSync(hashPath).isDirectory()) {
          continue;
        }

        // Check if session file exists in this hash directory
        const sessionFile = path.join(hashPath, `${sessionId}.json`);
        if (fs.existsSync(sessionFile)) {
          return sessionFile;
        }
      }

      return null;
    } catch (error) {
      console.error(`Error finding session file for ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Get session metadata
   * 
   * SIMPLIFIED APPROACH:
   * 1. Try SDK client first (if available)
   * 2. Fallback to scanning disk for session file by ID
   * 
   * No complex path calculations, no hash discovery, no project path matching.
   * Just find the session by ID, regardless of where it's stored.
   * 
   * @param sessionId - Session ID to retrieve
   * @returns SessionInfo object or null if not found
   */
  async getSessionInfo(sessionId: string): Promise<SessionInfo | null> {
    try {
      // Method 1: Use SDK client (preferred - always up to date)
      if (this.sdkClient) {
        try {
          const response = await this.sdkClient.session.get({ path: { id: sessionId } });
          if (response.data) {
            return response.data as SessionInfo;
          }
        } catch (error) {
          // SDK failed, fall through to disk scan
          console.warn(`SDK session.get() failed for ${sessionId}, falling back to disk scan`);
        }
      }

      // Method 2: Scan disk for session file (fallback)
      const sessionFile = this.findSessionFile(sessionId);
      if (sessionFile) {
        const content = fs.readFileSync(sessionFile, 'utf-8');
        return JSON.parse(content) as SessionInfo;
      }

      // Session not found
      return null;
    } catch (error) {
      console.error(`Error reading session info for ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * List all available sessions
   * 
   * SIMPLIFIED APPROACH:
   * 1. Try SDK client first (if available)
   * 2. Fallback to scanning all session directories
   * 
   * @returns Array of SessionInfo objects sorted by creation time (newest first)
   */
  async listSessions(): Promise<SessionInfo[]> {
    try {
      // Method 1: Use SDK client (preferred)
      if (this.sdkClient) {
        try {
          const response = await this.sdkClient.session.list();
          if (response.data) {
            return response.data.sort((a: SessionInfo, b: SessionInfo) => 
              b.time.created - a.time.created
            );
          }
        } catch (error) {
          console.warn('SDK session.list() failed, falling back to disk scan');
        }
      }

      // Method 2: Scan all session directories (fallback)
      const sessions: SessionInfo[] = [];
      const sessionBasePath = path.join(this.sessionStoragePath, 'storage', 'session');

      if (!fs.existsSync(sessionBasePath)) {
        return [];
      }

      // Scan all hash directories
      const hashDirs = fs.readdirSync(sessionBasePath);
      
      for (const hashDir of hashDirs) {
        const hashPath = path.join(sessionBasePath, hashDir);
        
        if (!fs.statSync(hashPath).isDirectory()) {
          continue;
        }

        // Read all session files in this directory
        const files = fs.readdirSync(hashPath).filter(f => f.endsWith('.json'));
        
        for (const file of files) {
          const sessionFile = path.join(hashPath, file);
          const content = fs.readFileSync(sessionFile, 'utf-8');
          const session = JSON.parse(content) as SessionInfo;
          sessions.push(session);
        }
      }

      // Sort by creation time (newest first)
      return sessions.sort((a, b) => b.time.created - a.time.created);
    } catch (error) {
      console.error('Error listing sessions:', error);
      return [];
    }
  }

  /**
   * Get all messages for a session (info only, without parts)
   * 
   * @deprecated Use getMessagesWithParts() instead for full message data
   * 
   * Uses SDK client when available, falls back to disk scan.
   * 
   * @param sessionId - Session ID
   * @returns Array of Message objects sorted by creation time
   */
  async getMessages(sessionId: string): Promise<Message[]> {
    const messagesWithParts = await this.getMessagesWithParts(sessionId);
    return messagesWithParts.map(m => m.info);
  }

  /**
   * Get all messages for a session WITH their parts included
   * 
   * This is the preferred method as the SDK returns messages with parts embedded.
   * Using this avoids the need for separate getParts() calls.
   * 
   * @param sessionId - Session ID
   * @returns Array of MessageWithParts objects sorted by creation time
   */
  async getMessagesWithParts(sessionId: string): Promise<MessageWithParts[]> {
    try {
      // Method 1: Use SDK client (preferred)
      if (this.sdkClient) {
        try {
          const response = await this.sdkClient.session.messages({ path: { id: sessionId } });
          if (response.data) {
            // SDK returns { info: Message, parts: Part[] } for each message
            return response.data.map((m: any) => ({
              info: m.info,
              parts: m.parts || [],
            }));
          }
        } catch (error) {
          console.warn(`SDK session.messages() failed for ${sessionId}, falling back to disk scan`);
        }
      }

      // Method 2: Scan disk (fallback - not commonly used)
      // Note: SDK sessions typically don't have separate message files
      return [];
    } catch (error) {
      console.error(`Error reading messages for session ${sessionId}:`, error);
      return [];
    }
  }

  /**
   * Get a specific message
   * 
   * Uses SDK client when available.
   * 
   * @param sessionId - Session ID
   * @param messageId - Message ID
   * @returns Message object or null if not found
   */
  async getMessage(sessionId: string, messageId: string): Promise<Message | null> {
    try {
      // Method 1: Use SDK client (preferred)
      if (this.sdkClient) {
        try {
          const response = await this.sdkClient.session.message({ 
            path: { id: sessionId, messageID: messageId } 
          });
          if (response.data) {
            return response.data.info;
          }
        } catch (error) {
          console.warn(`SDK session.message() failed for ${messageId}`);
        }
      }

      // Method 2: Disk scan not implemented (SDK sessions don't use separate message files)
      return null;
    } catch (error) {
      console.error(`Error reading message ${messageId}:`, error);
      return null;
    }
  }

  /**
   * Get all parts for a message
   * 
   * Uses SDK client when available.
   * 
   * @param sessionId - Session ID
   * @param messageId - Message ID
   * @returns Array of Part objects sorted by creation time
   */
  async getParts(sessionId: string, messageId: string): Promise<Part[]> {
    try {
      // Method 1: Use SDK client (preferred)
      if (this.sdkClient) {
        try {
          const response = await this.sdkClient.session.message({ 
            path: { id: sessionId, messageID: messageId } 
          });
          if (response.data && response.data.parts) {
            return response.data.parts;
          }
        } catch (error) {
          console.warn(`SDK session.message() failed for parts of ${messageId}`);
        }
      }

      // Method 2: Disk scan not implemented (SDK sessions don't use separate part files)
      return [];
    } catch (error) {
      console.error(`Error reading parts for message ${messageId}:`, error);
      return [];
    }
  }

  /**
   * Get a specific part
   * 
   * Uses SDK client when available.
   * 
   * @param sessionId - Session ID
   * @param messageId - Message ID
   * @param partId - Part ID
   * @returns Part object or null if not found
   */
  async getPart(sessionId: string, messageId: string, partId: string): Promise<Part | null> {
    try {
      // Get all parts and find the specific one
      const parts = await this.getParts(sessionId, messageId);
      return parts.find(p => p.id === partId) || null;
    } catch (error) {
      console.error(`Error reading part ${partId}:`, error);
      return null;
    }
  }

  /**
   * Get complete session data (info + messages + parts)
   * 
   * Retrieves all session data in one call.
   * 
   * @param sessionId - Session ID
   * @returns Complete session data
   */
  async getCompleteSession(sessionId: string): Promise<{
    info: SessionInfo | null;
    messages: Array<{
      message: Message;
      parts: Part[];
    }>;
  }> {
    const info = await this.getSessionInfo(sessionId);
    const messages = await this.getMessages(sessionId);

    const messagesWithParts = await Promise.all(
      messages.map(async message => ({
        message,
        parts: await this.getParts(sessionId, message.id),
      }))
    );

    return {
      info,
      messages: messagesWithParts,
    };
  }
}
