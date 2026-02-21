import { createOpencodeClient, type Session, type Message, type Part } from '@opencode-ai/sdk';

// SDK input type for text parts
type TextPartInput = {
  type: 'text';
  text: string;
  id?: string;
  synthetic?: boolean;
  ignored?: boolean;
};

export interface ClientConfig {
  baseUrl: string;
  timeout?: number;
}

/**
 * Configuration for creating a new session
 */
export interface SessionConfig {
  /** Session title */
  title?: string;
}

/**
 * Configuration for sending a prompt to a session
 */
export interface PromptConfig {
  /** The prompt text to send */
  text: string;
  /** Agent to use for this prompt (e.g., 'openagent', 'opencoder') */
  agent?: string;
  /** Model to use for this prompt */
  model?: {
    providerID: string;
    modelID: string;
  };
  /** Working directory for the agent */
  directory?: string;
  /** Files to attach to the prompt */
  files?: string[];
  /** If true, only adds context without triggering AI response */
  noReply?: boolean;
}

/**
 * @deprecated Use PromptConfig instead
 */
export interface PromptOptions extends PromptConfig {}

export interface SessionInfo {
  id: string;
  title?: string;
  messages: Array<{
    info: Message;
    parts: Part[];
  }>;
}

export class ClientManager {
  private client: ReturnType<typeof createOpencodeClient>;

  constructor(config: ClientConfig) {
    this.client = createOpencodeClient({
      baseUrl: config.baseUrl,
    });
  }

  /**
   * Create a new session
   * 
   * Note: Agent selection happens in sendPrompt(), not here.
   * The SDK's session.create() only accepts title and parentID.
   * 
   * @param config - Session configuration
   * @returns Created session
   */
  async createSession(config: SessionConfig = {}): Promise<Session> {
    try {
      const response = await this.client.session.create({
        body: {
          title: config.title || `Eval Session ${new Date().toISOString()}`,
        },
      });

      if (!response.data) {
        throw new Error('Failed to create session: No data in response');
      }

      return response.data;
    } catch (error) {
      console.error('[ClientManager] Session creation error:', error);
      throw new Error(`Failed to create session: ${(error as Error).message}`);
    }
  }

  /**
   * Send a prompt to a session
   * 
   * This is where agent selection happens! The agent parameter in the body
   * determines which agent processes the prompt.
   * 
   * @param sessionId - Session ID to send prompt to
   * @param config - Prompt configuration including agent, text, model, etc.
   * @returns Message response with info and parts
   */
  async sendPrompt(sessionId: string, config: PromptConfig): Promise<{ info: Message; parts: Part[] }> {
    const parts: TextPartInput[] = [{ type: 'text', text: config.text }];

    // Add file attachments if specified
    if (config.files && config.files.length > 0) {
      // TODO: Implement file attachment support
      console.warn('[ClientManager] File attachments not yet implemented');
    }

    // Build request body with agent parameter
    const body: any = {
      parts,
      noReply: config.noReply,
    };

    // Add agent if specified (this is the key fix!)
    if (config.agent) {
      body.agent = config.agent;
    }

    // Add model if specified
    if (config.model) {
      body.model = config.model;
    }

    // Build request with optional directory parameter
    const request: any = {
      path: { id: sessionId },
      body,
    };

    // Add directory if specified
    if (config.directory) {
      request.query = { directory: config.directory };
    }

    const response = await this.client.session.prompt(request);

    if (!response.data) {
      throw new Error('Failed to send prompt: No data in response');
    }

    return response.data;
  }

  /**
   * Get session details including all messages
   */
  async getSession(sessionId: string): Promise<SessionInfo> {
    const [sessionResponse, messagesResponse] = await Promise.all([
      this.client.session.get({ path: { id: sessionId } }),
      this.client.session.messages({ path: { id: sessionId } }),
    ]);

    if (!sessionResponse.data) {
      throw new Error('Failed to get session');
    }

    return {
      id: sessionResponse.data.id,
      title: sessionResponse.data.title,
      messages: messagesResponse.data || [],
    };
  }

  /**
   * List all sessions
   */
  async listSessions(): Promise<Session[]> {
    const response = await this.client.session.list();
    return response.data || [];
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const response = await this.client.session.delete({
      path: { id: sessionId },
    });
    return response.data || false;
  }

  /**
   * Abort a running session
   */
  async abortSession(sessionId: string): Promise<boolean> {
    const response = await this.client.session.abort({
      path: { id: sessionId },
    });
    return response.data || false;
  }

  /**
   * Send a command to a session
   */
  async sendCommand(sessionId: string, command: string): Promise<Message> {
    const response = await this.client.session.command({
      path: { id: sessionId },
      body: { 
        command,
        arguments: '', // Required by SDK
      },
    });

    if (!response.data) {
      throw new Error('Failed to send command');
    }

    return response.data.info;
  }

  /**
   * Respond to a permission request
   */
  async respondToPermission(
    sessionId: string,
    permissionId: string,
    approved: boolean
  ): Promise<boolean> {
    const response = await this.client.postSessionIdPermissionsPermissionId({
      path: { id: sessionId, permissionID: permissionId },
      body: { response: approved ? 'once' : 'reject' },
    });
    return response.data || false;
  }

  /**
   * Get the underlying SDK client for advanced usage
   */
  getClient(): ReturnType<typeof createOpencodeClient> {
    return this.client;
  }
}
