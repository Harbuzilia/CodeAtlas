/**
 * MessageParser - Parse and extract information from OpenCode messages
 * 
 * Extracts agent names, model info, metrics, and other metadata from messages.
 */

import { Message, ModelInfo, MessageMetrics, Part, ToolPart, TextPart } from '../types/index.js';

/**
 * Parse and extract information from messages
 */
export class MessageParser {
  /**
   * Extract agent name from message
   * Agent name is stored in the 'mode' field for assistant messages
   */
  getAgent(message: Message): string | null {
    if (message.role !== 'assistant') {
      return null;
    }
    return message.mode || null;
  }

  /**
   * Extract model information
   */
  getModel(message: Message): ModelInfo | null {
    if (!message.modelID || !message.providerID) {
      return null;
    }

    return {
      modelID: message.modelID,
      providerID: message.providerID,
    };
  }

  /**
   * Extract message metrics (tokens, cost, duration)
   */
  getMetrics(message: Message): MessageMetrics {
    const duration = message.time.completed
      ? message.time.completed - message.time.created
      : undefined;

    return {
      tokens: message.tokens,
      cost: message.cost,
      duration,
    };
  }

  /**
   * Check if message is from user
   */
  isUserMessage(message: Message): boolean {
    return message.role === 'user';
  }

  /**
   * Check if message is from assistant
   */
  isAssistantMessage(message: Message): boolean {
    return message.role === 'assistant';
  }

  /**
   * Check if message has error
   */
  hasError(message: Message): boolean {
    return !!message.error;
  }

  /**
   * Check if message is completed
   */
  isCompleted(message: Message): boolean {
    return !!message.time.completed;
  }

  /**
   * Extract text content from text parts
   */
  extractTextFromParts(parts: Part[]): string {
    return parts
      .filter((part): part is TextPart => part.type === 'text')
      .map(part => part.text)
      .join('\n');
  }

  /**
   * Extract tool calls from parts
   */
  extractToolCalls(parts: Part[]): ToolPart[] {
    return parts.filter((part): part is ToolPart => part.type === 'tool');
  }

  /**
   * Get tool names used in parts
   */
  getToolsUsed(parts: Part[]): string[] {
    const toolParts = this.extractToolCalls(parts);
    return toolParts.map(part => part.tool);
  }

  /**
   * Check if specific tool was used
   */
  wasToolUsed(parts: Part[], toolName: string): boolean {
    const tools = this.getToolsUsed(parts);
    return tools.includes(toolName);
  }

  /**
   * Check if any execution tool was used (bash, write, edit, task)
   */
  hasExecutionTools(parts: Part[]): boolean {
    const executionTools = ['bash', 'write', 'edit', 'task'];
    const tools = this.getToolsUsed(parts);
    return tools.some(tool => executionTools.includes(tool));
  }

  /**
   * Get failed tool calls
   */
  getFailedToolCalls(parts: Part[]): ToolPart[] {
    const toolParts = this.extractToolCalls(parts);
    return toolParts.filter(part => part.status === 'error' || !!part.error);
  }

  /**
   * Get successful tool calls
   */
  getSuccessfulToolCalls(parts: Part[]): ToolPart[] {
    const toolParts = this.extractToolCalls(parts);
    return toolParts.filter(part => part.status === 'completed' && !part.error);
  }

  /**
   * Check if text contains approval language
   */
  containsApprovalLanguage(text: string): boolean {
    const approvalKeywords = [
      'approval',
      'approve',
      'proceed',
      'confirm',
      'permission',
      'before proceeding',
      'should i',
      'may i',
      'can i proceed',
      'would you like me to',
      'shall i',
    ];

    const lowerText = text.toLowerCase();
    return approvalKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Check if parts contain approval request
   */
  hasApprovalRequest(parts: Part[]): boolean {
    const text = this.extractTextFromParts(parts);
    return this.containsApprovalLanguage(text);
  }

  /**
   * Extract file paths from tool calls
   */
  extractFilePaths(parts: Part[]): string[] {
    const toolParts = this.extractToolCalls(parts);
    const filePaths: string[] = [];

    for (const part of toolParts) {
      // Extract file paths from different tool types
      if (part.tool === 'read' || part.tool === 'write' || part.tool === 'edit') {
        if (part.input?.filePath) {
          filePaths.push(part.input.filePath);
        }
      }
    }

    return [...new Set(filePaths)]; // Remove duplicates
  }

  /**
   * Count file operations (write, edit)
   */
  countFileOperations(parts: Part[]): number {
    const toolParts = this.extractToolCalls(parts);
    return toolParts.filter(part => 
      part.tool === 'write' || part.tool === 'edit'
    ).length;
  }

  /**
   * Check if context file was loaded
   */
  wasContextFileLoaded(parts: Part[], contextFile: string): boolean {
    const toolParts = this.extractToolCalls(parts);
    const readCalls = toolParts.filter(part => part.tool === 'read');

    return readCalls.some(part => {
      const filePath = part.input?.filePath || '';
      return filePath.includes(contextFile);
    });
  }

  /**
   * Check if delegation was used (task tool)
   */
  wasDelegated(parts: Part[]): boolean {
    return this.wasToolUsed(parts, 'task');
  }
}
