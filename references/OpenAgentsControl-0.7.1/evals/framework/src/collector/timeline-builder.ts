/**
 * TimelineBuilder - Build chronological timeline of session events
 * 
 * Combines messages and parts into a unified timeline for analysis.
 */

import { TimelineEvent, Message, Part, ToolPart, TextPart, MessageWithParts } from '../types/index.js';
import { SessionReader } from './session-reader.js';
import { MessageParser } from './message-parser.js';

/**
 * Build and manage session timelines
 */
export class TimelineBuilder {
  private reader: SessionReader;
  private parser: MessageParser;

  constructor(reader: SessionReader) {
    this.reader = reader;
    this.parser = new MessageParser();
  }

  /**
   * Build complete timeline for a session
   * 
   * Now async to support SDK-based session retrieval.
   * Uses getMessagesWithParts() to get messages and parts in one call.
   */
  async buildTimeline(sessionId: string): Promise<TimelineEvent[]> {
    // Get messages with parts included (SDK returns them together)
    const messagesWithParts = await this.reader.getMessagesWithParts(sessionId);
    const events: TimelineEvent[] = [];

    for (const msgWithParts of messagesWithParts) {
      const message = msgWithParts.info;
      const parts = msgWithParts.parts || [];

      // Add message event
      events.push(this.createMessageEvent(message, parts));

      // Add part events
      for (const part of parts) {
        const partEvent = this.createPartEvent(part, message);
        if (partEvent) {
          events.push(partEvent);
        }
      }
    }

    // Sort by timestamp
    return events.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Create timeline event from message
   */
  private createMessageEvent(message: Message, parts: Part[]): TimelineEvent {
    const agent = this.parser.getAgent(message);
    const model = this.parser.getModel(message);

    return {
      timestamp: message.time.created,
      type: message.role === 'user' ? 'user_message' : 'assistant_message',
      agent: agent || undefined,
      model: model?.modelID,
      messageId: message.id,
      data: {
        message,
        parts,
        text: this.parser.extractTextFromParts(parts),
        tools: this.parser.getToolsUsed(parts),
      },
    };
  }

  /**
   * Create timeline event from part
   */
  private createPartEvent(part: Part, message: Message): TimelineEvent | null {
    const timestamp = part.time?.created || message.time.created;
    const agent = this.parser.getAgent(message);
    const model = this.parser.getModel(message);

    switch (part.type) {
      case 'tool':
        return {
          timestamp,
          type: 'tool_call',
          agent: agent || undefined,
          model: model?.modelID,
          messageId: message.id,
          partId: part.id,
          data: part,
        };

      case 'patch':
        return {
          timestamp,
          type: 'patch',
          agent: agent || undefined,
          model: model?.modelID,
          messageId: message.id,
          partId: part.id,
          data: part,
        };

      case 'reasoning':
        return {
          timestamp,
          type: 'reasoning',
          agent: agent || undefined,
          model: model?.modelID,
          messageId: message.id,
          partId: part.id,
          data: part,
        };

      case 'text':
        return {
          timestamp,
          type: 'text',
          agent: agent || undefined,
          model: model?.modelID,
          messageId: message.id,
          partId: part.id,
          data: part,
        };

      default:
        // Skip other part types for now
        return null;
    }
  }

  /**
   * Filter timeline by event type
   */
  filterByType(
    timeline: TimelineEvent[],
    type: TimelineEvent['type']
  ): TimelineEvent[] {
    return timeline.filter(event => event.type === type);
  }

  /**
   * Filter timeline by agent
   */
  filterByAgent(timeline: TimelineEvent[], agent: string): TimelineEvent[] {
    return timeline.filter(event => event.agent === agent);
  }

  /**
   * Get events in time range
   */
  getEventsInRange(
    timeline: TimelineEvent[],
    start: number,
    end: number
  ): TimelineEvent[] {
    return timeline.filter(
      event => event.timestamp >= start && event.timestamp <= end
    );
  }

  /**
   * Get tool call events
   */
  getToolCalls(timeline: TimelineEvent[]): TimelineEvent[] {
    return this.filterByType(timeline, 'tool_call');
  }

  /**
   * Get user messages
   */
  getUserMessages(timeline: TimelineEvent[]): TimelineEvent[] {
    return this.filterByType(timeline, 'user_message');
  }

  /**
   * Get assistant messages
   */
  getAssistantMessages(timeline: TimelineEvent[]): TimelineEvent[] {
    return this.filterByType(timeline, 'assistant_message');
  }

  /**
   * Get text events
   */
  getTextEvents(timeline: TimelineEvent[]): TimelineEvent[] {
    return this.filterByType(timeline, 'text');
  }

  /**
   * Find events before a specific timestamp
   */
  getEventsBefore(timeline: TimelineEvent[], timestamp: number): TimelineEvent[] {
    return timeline.filter(event => event.timestamp < timestamp);
  }

  /**
   * Find events after a specific timestamp
   */
  getEventsAfter(timeline: TimelineEvent[], timestamp: number): TimelineEvent[] {
    return timeline.filter(event => event.timestamp > timestamp);
  }

  /**
   * Get first event of a specific type
   */
  getFirstEventOfType(
    timeline: TimelineEvent[],
    type: TimelineEvent['type']
  ): TimelineEvent | null {
    const events = this.filterByType(timeline, type);
    return events.length > 0 ? events[0] : null;
  }

  /**
   * Get last event of a specific type
   */
  getLastEventOfType(
    timeline: TimelineEvent[],
    type: TimelineEvent['type']
  ): TimelineEvent | null {
    const events = this.filterByType(timeline, type);
    return events.length > 0 ? events[events.length - 1] : null;
  }

  /**
   * Check if tool was used in timeline
   */
  wasToolUsed(timeline: TimelineEvent[], toolName: string): boolean {
    const toolCalls = this.getToolCalls(timeline);
    return toolCalls.some(event => {
      const toolPart = event.data as ToolPart;
      return toolPart.tool === toolName;
    });
  }

  /**
   * Get all tools used in timeline
   */
  getToolsUsed(timeline: TimelineEvent[]): string[] {
    const toolCalls = this.getToolCalls(timeline);
    const tools = toolCalls.map(event => {
      const toolPart = event.data as ToolPart;
      return toolPart.tool;
    });
    return [...new Set(tools)]; // Remove duplicates
  }

  /**
   * Count occurrences of a specific tool
   */
  countToolUsage(timeline: TimelineEvent[], toolName: string): number {
    const toolCalls = this.getToolCalls(timeline);
    return toolCalls.filter(event => {
      const toolPart = event.data as ToolPart;
      return toolPart.tool === toolName;
    }).length;
  }

  /**
   * Get timeline summary
   */
  getSummary(timeline: TimelineEvent[]): {
    totalEvents: number;
    userMessages: number;
    assistantMessages: number;
    toolCalls: number;
    tools: string[];
    duration: number;
  } {
    const userMessages = this.getUserMessages(timeline);
    const assistantMessages = this.getAssistantMessages(timeline);
    const toolCalls = this.getToolCalls(timeline);
    const tools = this.getToolsUsed(timeline);

    const firstEvent = timeline[0];
    const lastEvent = timeline[timeline.length - 1];
    const duration = lastEvent && firstEvent
      ? lastEvent.timestamp - firstEvent.timestamp
      : 0;

    return {
      totalEvents: timeline.length,
      userMessages: userMessages.length,
      assistantMessages: assistantMessages.length,
      toolCalls: toolCalls.length,
      tools,
      duration,
    };
  }
}
