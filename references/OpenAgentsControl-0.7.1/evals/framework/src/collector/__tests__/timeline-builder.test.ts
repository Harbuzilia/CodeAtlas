/**
 * Tests for TimelineBuilder
 * 
 * Verifies that the timeline builder correctly:
 * 1. Extracts tool calls from message parts
 * 2. Creates proper timeline events
 * 3. Handles various part types (tool, text, step-start, step-finish)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TimelineBuilder } from '../timeline-builder.js';
import { SessionReader } from '../session-reader.js';
import type { MessageWithParts, Part, Message } from '../../types/index.js';

// Mock SessionReader
vi.mock('../session-reader.js');

describe('TimelineBuilder', () => {
  let builder: TimelineBuilder;
  let mockReader: SessionReader;

  beforeEach(() => {
    mockReader = new SessionReader();
    builder = new TimelineBuilder(mockReader);
  });

  describe('buildTimeline', () => {
    it('should extract tool calls from message parts', async () => {
      const mockMessages: MessageWithParts[] = [
        {
          info: createMessage('msg_1', 'user'),
          parts: [createTextPart('prt_1', 'msg_1', 'List files')],
        },
        {
          info: createMessage('msg_2', 'assistant', 'openagent'),
          parts: [
            createToolPart('prt_2', 'msg_2', 'bash', { command: 'ls -la' }, 'completed'),
          ],
        },
      ];

      vi.spyOn(mockReader, 'getMessagesWithParts').mockResolvedValue(mockMessages);

      const timeline = await builder.buildTimeline('test-session');

      // Should have: 2 message events + 1 text part + 1 tool call
      expect(timeline.length).toBe(4);

      const toolCalls = timeline.filter(e => e.type === 'tool_call');
      expect(toolCalls.length).toBe(1);
      expect(toolCalls[0].data.tool).toBe('bash');
    });

    it('should extract multiple tool calls', async () => {
      const mockMessages: MessageWithParts[] = [
        {
          info: createMessage('msg_1', 'assistant', 'openagent'),
          parts: [
            createToolPart('prt_1', 'msg_1', 'read', { filePath: '/test.ts' }, 'completed'),
            createToolPart('prt_2', 'msg_1', 'write', { filePath: '/output.ts', content: 'test' }, 'completed'),
            createToolPart('prt_3', 'msg_1', 'bash', { command: 'npm test' }, 'completed'),
          ],
        },
      ];

      vi.spyOn(mockReader, 'getMessagesWithParts').mockResolvedValue(mockMessages);

      const timeline = await builder.buildTimeline('test-session');

      const toolCalls = timeline.filter(e => e.type === 'tool_call');
      expect(toolCalls.length).toBe(3);

      const toolNames = toolCalls.map(t => t.data.tool);
      expect(toolNames).toContain('read');
      expect(toolNames).toContain('write');
      expect(toolNames).toContain('bash');
    });

    it('should handle messages with no tool parts', async () => {
      const mockMessages: MessageWithParts[] = [
        {
          info: createMessage('msg_1', 'assistant', 'openagent'),
          parts: [
            createStepStartPart('prt_1', 'msg_1'),
            createTextPart('prt_2', 'msg_1', 'I will help you with that'),
            createStepFinishPart('prt_3', 'msg_1'),
          ],
        },
      ];

      vi.spyOn(mockReader, 'getMessagesWithParts').mockResolvedValue(mockMessages);

      const timeline = await builder.buildTimeline('test-session');

      const toolCalls = timeline.filter(e => e.type === 'tool_call');
      expect(toolCalls.length).toBe(0);

      const textEvents = timeline.filter(e => e.type === 'text');
      expect(textEvents.length).toBe(1);
    });

    it('should preserve tool input data', async () => {
      const mockMessages: MessageWithParts[] = [
        {
          info: createMessage('msg_1', 'assistant', 'openagent'),
          parts: [
            createToolPart('prt_1', 'msg_1', 'read', { filePath: '/path/to/file.ts' }, 'completed'),
          ],
        },
      ];

      vi.spyOn(mockReader, 'getMessagesWithParts').mockResolvedValue(mockMessages);

      const timeline = await builder.buildTimeline('test-session');

      const toolCall = timeline.find(e => e.type === 'tool_call');
      expect(toolCall).toBeDefined();
      expect(toolCall?.data.tool).toBe('read');
      expect(toolCall?.data.state?.input?.filePath).toBe('/path/to/file.ts');
    });

    it('should handle context file reads', async () => {
      const mockMessages: MessageWithParts[] = [
        {
          info: createMessage('msg_1', 'assistant', 'openagent'),
          parts: [
            createToolPart('prt_1', 'msg_1', 'read', { filePath: '/project/.opencode/context/code.md' }, 'completed'),
            createToolPart('prt_2', 'msg_1', 'write', { filePath: '/src/app.ts', content: 'code' }, 'completed'),
          ],
        },
      ];

      vi.spyOn(mockReader, 'getMessagesWithParts').mockResolvedValue(mockMessages);

      const timeline = await builder.buildTimeline('test-session');

      const toolCalls = timeline.filter(e => e.type === 'tool_call');
      expect(toolCalls.length).toBe(2);

      // First tool should be read (context file)
      expect(toolCalls[0].data.tool).toBe('read');
      expect(toolCalls[0].data.state?.input?.filePath).toContain('.opencode/context');
    });

    it('should sort events by timestamp', async () => {
      const mockMessages: MessageWithParts[] = [
        {
          info: { ...createMessage('msg_1', 'assistant'), time: { created: 1000 } },
          parts: [
            { ...createToolPart('prt_1', 'msg_1', 'read', {}, 'completed'), time: { created: 1100 } },
            { ...createToolPart('prt_2', 'msg_1', 'write', {}, 'completed'), time: { created: 1200 } },
          ],
        },
      ];

      vi.spyOn(mockReader, 'getMessagesWithParts').mockResolvedValue(mockMessages);

      const timeline = await builder.buildTimeline('test-session');

      // Verify events are sorted by timestamp
      for (let i = 1; i < timeline.length; i++) {
        expect(timeline[i].timestamp).toBeGreaterThanOrEqual(timeline[i - 1].timestamp);
      }
    });
  });

  describe('getToolsUsed', () => {
    it('should return unique tool names', async () => {
      const mockMessages: MessageWithParts[] = [
        {
          info: createMessage('msg_1', 'assistant'),
          parts: [
            createToolPart('prt_1', 'msg_1', 'read', {}, 'completed'),
            createToolPart('prt_2', 'msg_1', 'read', {}, 'completed'),
            createToolPart('prt_3', 'msg_1', 'write', {}, 'completed'),
          ],
        },
      ];

      vi.spyOn(mockReader, 'getMessagesWithParts').mockResolvedValue(mockMessages);

      const timeline = await builder.buildTimeline('test-session');
      const tools = builder.getToolsUsed(timeline);

      expect(tools).toHaveLength(2);
      expect(tools).toContain('read');
      expect(tools).toContain('write');
    });
  });

  describe('wasToolUsed', () => {
    it('should detect if a specific tool was used', async () => {
      const mockMessages: MessageWithParts[] = [
        {
          info: createMessage('msg_1', 'assistant'),
          parts: [
            createToolPart('prt_1', 'msg_1', 'bash', { command: 'ls' }, 'completed'),
          ],
        },
      ];

      vi.spyOn(mockReader, 'getMessagesWithParts').mockResolvedValue(mockMessages);

      const timeline = await builder.buildTimeline('test-session');

      expect(builder.wasToolUsed(timeline, 'bash')).toBe(true);
      expect(builder.wasToolUsed(timeline, 'write')).toBe(false);
    });
  });
});

// Helper functions to create mock data

function createMessage(id: string, role: 'user' | 'assistant', mode?: string): Message {
  return {
    id,
    role,
    sessionID: 'test-session',
    mode,
    time: { created: Date.now() },
  };
}

function createTextPart(id: string, messageID: string, text: string): Part {
  return {
    id,
    messageID,
    sessionID: 'test-session',
    type: 'text',
    text,
  };
}

function createToolPart(
  id: string,
  messageID: string,
  tool: string,
  input: Record<string, any>,
  status: string
): Part {
  return {
    id,
    messageID,
    sessionID: 'test-session',
    type: 'tool',
    tool,
    state: {
      status,
      input,
    },
  };
}

function createStepStartPart(id: string, messageID: string): Part {
  return {
    id,
    messageID,
    sessionID: 'test-session',
    type: 'step-start',
  };
}

function createStepFinishPart(id: string, messageID: string): Part {
  return {
    id,
    messageID,
    sessionID: 'test-session',
    type: 'step-finish',
  };
}
