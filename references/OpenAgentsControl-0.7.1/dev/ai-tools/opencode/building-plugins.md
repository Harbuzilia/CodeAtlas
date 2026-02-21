# Building OpenCode Plugins

## Introduction

OpenCode plugins extend the functionality of the OpenCode AI agent system. Plugins can:

- Monitor system events (messages, sessions, errors)
- Add custom tools for agents to use
- Modify LLM parameters dynamically
- Intercept and transform messages
- Control permissions and behavior
- Track and manage context usage

Plugins are written in TypeScript and registered via `opencode.json`.

---

## Getting Started

### Basic Plugin Structure

Create a TypeScript file (e.g., `my-plugin.ts`):

```typescript
import { Plugin } from "@opencode-ai/plugin"

export const MyPlugin: Plugin = async (ctx) => {
  // Plugin initialization
  // ctx provides: client, project, directory, worktree, $
  
  return {
    // Your hooks go here
    async event({ event }) {
      // Handle system events
    },
    
    tool: {
      // Custom tools
    },
    
    async config(config) {
      // Load configuration
    }
  }
}
```

### Plugin Registration

Add to your `opencode.json`:

```json
{
  "plugin": [
    "file:///absolute/path/to/my-plugin.ts",
    "file://./relative/path/to/plugin.ts"
  ]
}
```

**Path formats:**
- Absolute: `file:///Users/name/plugins/my-plugin.ts`
- Relative to config: `file://./plugins/my-plugin.ts`
- Home directory: `file://~/opencode/plugins/my-plugin.ts`

### Plugin Input Context (`PluginInput`)

When your plugin initializes, you receive:

```typescript
{
  client: OpencodeClient,    // Full SDK client for OpenCode APIs
  project: Project,           // Current project metadata
  directory: string,          // Working directory path
  worktree: string,          // Git worktree root
  $: BunShell                // Bun shell for executing commands
}
```

---

## Core Plugin Hooks

### 1. `event` Hook - System Event Monitoring

Monitor all system events in real-time:

```typescript
async event({ event }) {
  // Available event types:
  
  if (event.type === "session.created") {
    const session = event.properties.info
    console.log(`New session: ${session.id}`)
  }
  
  if (event.type === "session.updated") {
    // Session metadata changed
  }
  
  if (event.type === "session.deleted") {
    // Clean up tracking state
  }
  
  if (event.type === "message.updated") {
    const msg = event.properties.info
    console.log(`Message tokens: ${msg.tokens.input}`)
  }
  
  if (event.type === "message.removed") {
    // Message was deleted
  }
  
  if (event.type === "session.compacted") {
    // Session context was compacted
  }
  
  if (event.type === "session.diff") {
    // File changes detected
  }
  
  if (event.type === "session.error") {
    // Error occurred
  }
}
```

**Key Events:**
- `session.*` - Session lifecycle
- `message.*` - Message lifecycle
- `message.part.*` - Message part updates
- `session.compacted` - Context compaction
- `session.diff` - File changes
- `session.error` - Errors

---

### 2. `chat.message` Hook - Message Interception

Intercept user messages before they're sent to the agent:

```typescript
async "chat.message"(input, output) {
  // input: { message: UserMessage }
  // output: { message: UserMessage, parts: MessagePart[] }
  
  // Example: Add metadata to messages
  output.message.metadata = {
    timestamp: Date.now(),
    source: "plugin"
  }
  
  // Example: Modify message parts
  output.parts.forEach(part => {
    if (part.type === "text") {
      // Transform text content
    }
  })
  
  // Example: Validate before sending
  if (output.message.content.length > 10000) {
    console.warn("Large message detected")
  }
}
```

---

### 3. `chat.params` Hook - LLM Parameter Modification

Modify LLM parameters dynamically:

```typescript
async "chat.params"(input, output) {
  // input.model = Model being used
  // input.provider = Provider info
  // input.message = Current message
  
  // output.temperature = 0-1
  // output.topP = 0-1
  // output.options = Record<string, any>
  
  // Example: Adjust temperature based on task
  if (input.message.content.includes("creative")) {
    output.temperature = 0.8
  } else {
    output.temperature = 0.3
  }
  
  // Example: Add custom model parameters
  output.options = {
    top_k: 40,
    repetition_penalty: 1.1
  }
  
  // Example: Model-specific settings
  if (input.model.id.includes("claude")) {
    output.options.thinking = {
      type: "enabled",
      budget_tokens: 2000
    }
  }
}
```

---

### 4. `tool` Hook - Custom Tool Creation

Add custom tools that agents can use:

```typescript
import { tool } from "@opencode-ai/plugin"

export const MyPlugin: Plugin = async (ctx) => {
  return {
    tool: {
      // Simple tool with no arguments
      get_timestamp: tool({
        description: "Get current timestamp",
        args: {},
        async execute() {
          return new Date().toISOString()
        }
      }),
      
      // Tool with arguments
      search_database: tool({
        description: "Search the project database",
        args: {
          query: {
            type: "string",
            description: "Search query"
          },
          limit: {
            type: "number",
            description: "Maximum results",
            default: 10
          }
        },
        async execute({ query, limit }) {
          const results = await searchDB(query, limit)
          return JSON.stringify(results, null, 2)
        }
      }),
      
      // Tool with access to context
      analyze_project: tool({
        description: "Analyze current project structure",
        args: {},
        async execute() {
          // Access plugin context
          const files = await ctx.$`find ${ctx.worktree} -type f`.text()
          return `Project has ${files.split('\n').length} files`
        }
      })
    }
  }
}
```

**Tool Best Practices:**
- Clear, descriptive names
- Detailed descriptions (agent uses these to decide when to call)
- Type-safe arguments with descriptions
- Return strings or JSON-serializable data
- Handle errors gracefully

---

### 5. `tool.execute.before` / `tool.execute.after` - Tool Execution Hooks

Hook into tool execution to track or modify behavior:

```typescript
async "tool.execute.before"(input, output) {
  // input.tool = Tool name
  // input.sessionID = Current session
  // input.callID = Unique call ID
  // output.args = Tool arguments (mutable)
  
  console.log(`Executing tool: ${input.tool}`)
  
  // Example: Modify arguments
  if (input.tool === "bash" && output.args.command.includes("rm -rf")) {
    throw new Error("Dangerous command blocked")
  }
  
  // Example: Track usage
  trackToolUsage(input.tool, input.sessionID)
}

async "tool.execute.after"(input, output) {
  // output.title = Tool result title
  // output.output = Tool result output
  // output.metadata = Tool metadata
  
  console.log(`Tool ${input.tool} completed`)
  
  // Example: Log results
  if (output.output.length > 5000) {
    console.warn(`Tool ${input.tool} returned large output`)
  }
  
  // Example: Track performance
  const duration = output.metadata?.duration
  if (duration > 5000) {
    console.warn(`Tool ${input.tool} took ${duration}ms`)
  }
}
```

---

### 6. `config` Hook - Configuration Loading

Load plugin configuration from `opencode.json`:

```typescript
async config(config) {
  // Access user's opencode.json config
  const mySettings = config.myPlugin || {}
  
  // Example: Load settings with defaults
  const settings = {
    enabled: mySettings.enabled ?? true,
    threshold: mySettings.threshold ?? 100,
    apiKey: mySettings.apiKey || process.env.MY_API_KEY
  }
  
  console.log("Plugin configured:", settings)
  
  return settings
}
```

**In `opencode.json`:**
```json
{
  "plugin": ["file://./my-plugin.ts"],
  "myPlugin": {
    "enabled": true,
    "threshold": 150,
    "apiKey": "secret"
  }
}
```

---

### 7. `permission.ask` Hook - Permission Control

Control what the agent can do:

```typescript
async "permission.ask"(input, output) {
  // input = Permission request details
  // output.status = "ask" | "deny" | "allow"
  
  // Example: Auto-approve safe operations
  if (input.tool === "read" || input.tool === "list") {
    output.status = "allow"
    return
  }
  
  // Example: Block dangerous operations
  if (input.tool === "bash" && input.args?.command?.includes("rm -rf /")) {
    output.status = "deny"
    return
  }
  
  // Example: Conditional approval
  if (input.tool === "write") {
    const path = input.args?.filePath
    if (path?.startsWith("/tmp/")) {
      output.status = "allow"
    } else {
      output.status = "ask"  // Prompt user
    }
  }
}
```

---

## SDK Client Methods

Available via `ctx.client`:

### Session Management

```typescript
// Get session info
const session = await ctx.client.session.get({
  path: { id: sessionID }
})

// List all sessions
const sessions = await ctx.client.session.list()

// Get session messages
const messages = await ctx.client.session.messages.list({
  path: { id: sessionID }
})

// Fork session (preserve context)
const newSession = await ctx.client.session.fork({
  path: { id: sessionID }
})

// Delete session
await ctx.client.session.delete({
  path: { id: sessionID }
})

// Execute command in session
await ctx.client.session.command({
  path: { id: sessionID },
  body: {
    command: "compact",
    arguments: "",
    agent: "build",
    model: "anthropic/claude-3.5-sonnet"
  }
})
```

### Event Publishing

```typescript
// Publish UI events (toasts)
await ctx.client.events.publish({
  body: {
    type: "tui.toast.show",
    properties: {
      title: "Alert",
      message: "Something happened",
      variant: "info" | "warning" | "error" | "success",
      duration: 5000
    }
  }
})
```

### Shell Commands

```typescript
// Execute shell commands via Bun
const output = await ctx.$`ls -la ${ctx.worktree}`.text()

// With error handling
try {
  const result = await ctx.$`git status`.text()
  console.log(result)
} catch (error) {
  console.error("Command failed:", error)
}
```

---

## Best Practices

### Error Handling

Always handle errors gracefully - never let exceptions crash OpenCode:

```typescript
async event({ event }) {
  try {
    // Your logic here
    await processEvent(event)
  } catch (error) {
    console.error("Plugin error:", error)
    // Log but don't throw - let OpenCode continue
  }
}
```

### State Management

Use Maps for efficient state tracking:

```typescript
const MyPlugin: Plugin = async (ctx) => {
  // State persists across hook calls
  const sessionState = new Map<string, {
    created: number
    messageCount: number
  }>()
  
  return {
    async event({ event }) {
      if (event.type === "session.created") {
        sessionState.set(event.properties.info.id, {
          created: Date.now(),
          messageCount: 0
        })
      }
      
      if (event.type === "session.deleted") {
        // Always clean up!
        sessionState.delete(event.properties.info.id)
      }
    }
  }
}
```

### Performance Considerations

Keep hooks fast and non-blocking:

```typescript
async event({ event }) {
  // ✅ Good: Fast checks first
  if (event.type !== "message.updated") return
  if (!shouldProcess(event)) return
  
  // ✅ Good: Async operations don't block
  processEventAsync(event).catch(console.error)
  
  // ❌ Bad: Heavy computation blocks event loop
  // await expensiveAnalysis()  // Don't do this
}
```

### Cleanup Patterns

Always clean up resources:

```typescript
const MyPlugin: Plugin = async (ctx) => {
  const resources = new Map()
  
  return {
    async event({ event }) {
      if (event.type === "session.created") {
        resources.set(event.properties.info.id, createResource())
      }
      
      if (event.type === "session.deleted") {
        const resource = resources.get(event.properties.info.id)
        if (resource) {
          await resource.cleanup()
          resources.delete(event.properties.info.id)
        }
      }
    }
  }
}
```

---

## Context-Aware Plugins

Context-aware plugins monitor and manage the agent's context window to optimize token usage and prevent context overflow.

### Understanding Context Data

#### Token Tracking

From `message.updated` events:

```typescript
msg.tokens = {
  input: number,        // Context window tokens
  output: number,       // Generated tokens
  reasoning: number,    // Reasoning tokens (if applicable)
  cache: {
    read: number,       // Prompt cache hits
    write: number       // Prompt cache writes
  }
}
```

**Key calculation:**
```typescript
// Actual context window usage
const contextSize = msg.tokens.input + msg.tokens.cache.read
```

#### Message Parts

Track different types of content:

```typescript
part.type =
  | "text"           // Text content
  | "file"           // File attachments
  | "tool"           // Tool calls & results
  | "step-start"     // Agent thinking step
  | "step-finish"    // Step completion with token usage
  | "snapshot"       // Code snapshot
  | "patch"          // Code changes
  | "reasoning"      // Model reasoning (if enabled)
```

**Tool results can be large:**
```typescript
if (part.type === "tool" && part.state.status === "completed") {
  const outputSize = estimateTokens(part.state.output)
  // Track this for context management
}
```

---

### Example: Context Monitor Plugin

A complete plugin that monitors context usage and warns when approaching limits:

```typescript
import { Plugin } from "@opencode-ai/plugin"

export const ContextMonitor: Plugin = async (ctx) => {
  // Track state per session
  const sessionWarnings = new Map<string, {
    warned80k: boolean
    warned100k: boolean
    lastTokenCount: number
    history: Array<{ timestamp: number, tokens: number }>
  }>()
  
  // Configuration
  const config = {
    warn80k: 80_000,
    warn100k: 100_000,
    autoCompact: false
  }
  
  return {
    async config(userConfig) {
      // Load user settings
      Object.assign(config, userConfig.contextMonitor || {})
    },
    
    async event({ event }) {
      // Monitor message updates for token usage
      if (event.type === "message.updated") {
        const msg = event.properties.info
        
        // Only process assistant messages with token data
        if (msg.role === "assistant" && msg.tokens) {
          const totalTokens = msg.tokens.input + msg.tokens.cache.read
          const sessionID = msg.sessionID
          
          // Initialize tracking if needed
          if (!sessionWarnings.has(sessionID)) {
            sessionWarnings.set(sessionID, {
              warned80k: false,
              warned100k: false,
              lastTokenCount: 0,
              history: []
            })
          }
          
          const state = sessionWarnings.get(sessionID)!
          
          // Track history
          state.history.push({
            timestamp: Date.now(),
            tokens: totalTokens
          })
          
          // Keep only last 10 entries
          if (state.history.length > 10) {
            state.history.shift()
          }
          
          // Calculate growth rate
          const growthRate = calculateGrowthRate(state.history)
          
          // Warning at 80k tokens
          if (totalTokens >= config.warn80k && !state.warned80k) {
            state.warned80k = true
            
            await ctx.client.events.publish({
              body: {
                type: "tui.toast.show",
                properties: {
                  title: "Context Warning",
                  message: `Context at ${totalTokens.toLocaleString()} tokens (${Math.round(totalTokens / 2000)}% of 200k limit)`,
                  variant: "warning",
                  duration: 8000
                }
              }
            })
            
            console.log(`⚠️  Context at ${totalTokens} tokens - consider compacting soon`)
          }
          
          // Critical warning at 100k tokens
          if (totalTokens >= config.warn100k && !state.warned100k) {
            state.warned100k = true
            
            await ctx.client.events.publish({
              body: {
                type: "tui.toast.show",
                properties: {
                  title: "Context Critical",
                  message: `Context at ${totalTokens.toLocaleString()} tokens - compact recommended`,
                  variant: "error",
                  duration: 10000
                }
              }
            })
            
            console.log(`🚨 Context at ${totalTokens} tokens - compact now!`)
            
            // Auto-compact if enabled
            if (config.autoCompact) {
              await ctx.client.session.command({
                path: { id: sessionID },
                body: {
                  command: "compact",
                  arguments: "",
                  agent: "build",
                  model: msg.model
                }
              })
              console.log("✅ Auto-compaction triggered")
            }
          }
          
          // Log growth rate if concerning
          if (growthRate > 10000) {
            console.log(`📈 Rapid context growth: ${growthRate} tokens/min`)
          }
          
          state.lastTokenCount = totalTokens
        }
      }
      
      // Reset warnings after compaction
      if (event.type === "session.compacted") {
        const sessionID = event.properties.info.id
        const state = sessionWarnings.get(sessionID)
        if (state) {
          state.warned80k = false
          state.warned100k = false
          console.log("✅ Context compacted - warnings reset")
        }
      }
      
      // Clean up when session deleted
      if (event.type === "session.deleted") {
        sessionWarnings.delete(event.properties.info.id)
      }
    },
    
    // Add custom tool for checking context
    tool: {
      check_context: tool({
        description: "Check current session context size and health",
        args: {},
        async execute() {
          // Get current session (would need session ID in real implementation)
          const sessions = await ctx.client.session.list()
          const currentSession = sessions[0] // Simplified
          
          if (!currentSession) {
            return "No active session"
          }
          
          const state = sessionWarnings.get(currentSession.id)
          if (!state) {
            return "No context data available yet"
          }
          
          const tokens = state.lastTokenCount
          const percentage = Math.round((tokens / 200000) * 100)
          const growthRate = calculateGrowthRate(state.history)
          
          return `Context Health Report:
- Current tokens: ${tokens.toLocaleString()}
- Percentage of 200k limit: ${percentage}%
- Growth rate: ${growthRate.toLocaleString()} tokens/min
- Status: ${tokens < 80000 ? "✅ Healthy" : tokens < 100000 ? "⚠️  Warning" : "🚨 Critical"}
${tokens >= 80000 ? "\nRecommendation: Consider compacting context" : ""}`
        }
      })
    }
  }
}

// Helper function to calculate growth rate
function calculateGrowthRate(history: Array<{ timestamp: number, tokens: number }>): number {
  if (history.length < 2) return 0
  
  const first = history[0]
  const last = history[history.length - 1]
  
  const tokenDiff = last.tokens - first.tokens
  const timeDiff = (last.timestamp - first.timestamp) / 1000 / 60 // minutes
  
  if (timeDiff === 0) return 0
  
  return Math.round(tokenDiff / timeDiff)
}

// Helper function for token estimation
function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4)
}
```

**Configuration in `opencode.json`:**
```json
{
  "plugin": ["file://./context-monitor.ts"],
  "contextMonitor": {
    "warn80k": 80000,
    "warn100k": 100000,
    "autoCompact": false
  }
}
```

---

### Context Optimization Strategies

#### 1. Monitor Context Growth Rate

Track how fast context is growing to predict when compaction will be needed:

```typescript
const history: Array<{ timestamp: number, tokens: number }> = []

async event({ event }) {
  if (event.type === "message.updated" && event.properties.info.tokens) {
    const tokens = event.properties.info.tokens.input + 
                   event.properties.info.tokens.cache.read
    
    history.push({ timestamp: Date.now(), tokens })
    
    // Keep last 10 measurements
    if (history.length > 10) history.shift()
    
    // Calculate tokens per minute
    const rate = calculateGrowthRate(history)
    
    if (rate > 10000) {
      console.warn(`⚠️  Rapid context growth: ${rate} tokens/min`)
    }
  }
}
```

#### 2. Smart Compaction Triggers

Don't just check total tokens - check token efficiency:

```typescript
const efficiency = outputTokens / inputTokens

if (efficiency < 0.01 && inputTokens > 100_000) {
  // Too much input for little output = should compact
  console.warn("Low token efficiency - compaction recommended")
}
```

#### 3. Predictive Warnings

Warn before hitting the limit:

```typescript
async "chat.params"(input, output) {
  const model = input.model
  const modelLimit = model.limit.context
  const currentTokens = await getCurrentContextSize(input.message.sessionID)
  
  // Estimate next turn will add ~5k tokens
  const projectedGrowth = 5000
  
  if (currentTokens + projectedGrowth > modelLimit * 0.9) {
    console.warn("⚠️  Will exceed limit soon - compact before next turn!")
  }
}
```

#### 4. Model-Specific Context Limits

Adjust behavior based on model limits:

```typescript
async "chat.params"(input, output) {
  const model = input.model
  
  // model.limit.context = Total context window
  // model.limit.output = Max output tokens
  
  const available = model.limit.context - model.limit.output
  const used = await getCurrentContextSize(input.message.sessionID)
  const remaining = available - used
  
  if (remaining < 10_000) {
    console.warn(`⚠️  Only ${remaining} tokens remaining!`)
    
    // Reduce temperature for more focused responses
    output.temperature = 0.2
  }
}
```

#### 5. Adaptive Context Configuration

Adjust agent behavior based on context size:

```typescript
async "chat.params"(input, output) {
  const contextTokens = await getContextSize(input.message.sessionID)
  
  if (contextTokens > 100_000) {
    // High context - optimize for focus
    output.temperature = 0.3
    output.topP = 0.9
    
    console.log("High context mode: reduced temperature for focus")
  } else {
    // Normal context - allow creativity
    output.temperature = 0.7
    output.topP = 0.95
  }
}
```

#### 6. Track Tool Impact on Context

Monitor which tools add the most context:

```typescript
const toolImpact = new Map<string, number>()

async "tool.execute.after"(input, output) {
  const tokensAdded = estimateTokens(output.output)
  
  const current = toolImpact.get(input.tool) || 0
  toolImpact.set(input.tool, current + tokensAdded)
  
  // Log top offenders
  if (tokensAdded > 5000) {
    console.log(`Tool ${input.tool} added ${tokensAdded} tokens`)
  }
}
```

---

### Understanding Compaction

#### How Compaction Works

OpenCode automatically compacts when:

```typescript
// System checks if overflow
SessionCompaction.isOverflow({
  tokens: msg.tokens,
  model: currentModel
})

// Returns true when:
// (input + cache.read + output) > (context_limit - output_limit)
```

**Key constants:**
- `PRUNE_MINIMUM = 20_000` - Minimum tokens to prune
- `PRUNE_PROTECT = 40_000` - Protect recent 40k tokens

#### Compaction Process

1. Keeps last 2 user turns fully
2. Summarizes older messages
3. Prunes old tool call outputs (marks as `compacted`)
4. Emits `session.compacted` event

#### Detecting Compacted State

```typescript
async event({ event }) {
  if (event.type === "session.compacted") {
    console.log("✅ Context was compacted")
    // Reset your warnings/tracking
  }
}

// Check if session has been compacted
const messages = await ctx.client.session.messages.list({
  path: { id: sessionID }
})

const hasCompacted = messages.some(m => 
  m.info.role === "assistant" && m.info.summary === true
)
```

---

### Complete Context-Aware Plugin Example

Here's a production-ready context monitoring plugin with all optimizations:

```typescript
import { Plugin, tool } from "@opencode-ai/plugin"

interface SessionState {
  warned80k: boolean
  warned100k: boolean
  warned150k: boolean
  lastTokenCount: number
  history: Array<{ timestamp: number, tokens: number }>
  toolImpact: Map<string, number>
  compactionCount: number
}

export const AdvancedContextMonitor: Plugin = async (ctx) => {
  const sessions = new Map<string, SessionState>()
  
  const config = {
    warn80k: 80_000,
    warn100k: 100_000,
    warn150k: 150_000,
    autoCompact: false,
    adaptiveTemperature: true,
    trackToolImpact: true
  }
  
  function getOrCreateState(sessionID: string): SessionState {
    if (!sessions.has(sessionID)) {
      sessions.set(sessionID, {
        warned80k: false,
        warned100k: false,
        warned150k: false,
        lastTokenCount: 0,
        history: [],
        toolImpact: new Map(),
        compactionCount: 0
      })
    }
    return sessions.get(sessionID)!
  }
  
  function calculateGrowthRate(history: Array<{ timestamp: number, tokens: number }>): number {
    if (history.length < 2) return 0
    const first = history[0]
    const last = history[history.length - 1]
    const tokenDiff = last.tokens - first.tokens
    const timeDiff = (last.timestamp - first.timestamp) / 1000 / 60
    return timeDiff === 0 ? 0 : Math.round(tokenDiff / timeDiff)
  }
  
  function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }
  
  return {
    async config(userConfig) {
      Object.assign(config, userConfig.advancedContextMonitor || {})
      console.log("Advanced Context Monitor configured:", config)
    },
    
    async event({ event }) {
      try {
        // Track message updates
        if (event.type === "message.updated") {
          const msg = event.properties.info
          
          if (msg.role === "assistant" && msg.tokens) {
            const totalTokens = msg.tokens.input + msg.tokens.cache.read
            const state = getOrCreateState(msg.sessionID)
            
            // Update history
            state.history.push({ timestamp: Date.now(), tokens: totalTokens })
            if (state.history.length > 10) state.history.shift()
            
            const growthRate = calculateGrowthRate(state.history)
            
            // Progressive warnings
            if (totalTokens >= config.warn80k && !state.warned80k) {
              state.warned80k = true
              await ctx.client.events.publish({
                body: {
                  type: "tui.toast.show",
                  properties: {
                    title: "Context Notice",
                    message: `${totalTokens.toLocaleString()} tokens (${Math.round(totalTokens/2000)}%)`,
                    variant: "info",
                    duration: 5000
                  }
                }
              })
            }
            
            if (totalTokens >= config.warn100k && !state.warned100k) {
              state.warned100k = true
              await ctx.client.events.publish({
                body: {
                  type: "tui.toast.show",
                  properties: {
                    title: "Context Warning",
                    message: `${totalTokens.toLocaleString()} tokens - consider compacting`,
                    variant: "warning",
                    duration: 8000
                  }
                }
              })
            }
            
            if (totalTokens >= config.warn150k && !state.warned150k) {
              state.warned150k = true
              await ctx.client.events.publish({
                body: {
                  type: "tui.toast.show",
                  properties: {
                    title: "Context Critical",
                    message: `${totalTokens.toLocaleString()} tokens - compact now!`,
                    variant: "error",
                    duration: 10000
                  }
                }
              })
              
              if (config.autoCompact) {
                await ctx.client.session.command({
                  path: { id: msg.sessionID },
                  body: {
                    command: "compact",
                    arguments: "",
                    agent: "build",
                    model: msg.model
                  }
                })
                console.log("✅ Auto-compaction triggered")
              }
            }
            
            state.lastTokenCount = totalTokens
          }
        }
        
        // Track compaction
        if (event.type === "session.compacted") {
          const state = sessions.get(event.properties.info.id)
          if (state) {
            state.warned80k = false
            state.warned100k = false
            state.warned150k = false
            state.compactionCount++
            console.log(`✅ Compaction #${state.compactionCount} completed`)
          }
        }
        
        // Cleanup
        if (event.type === "session.deleted") {
          sessions.delete(event.properties.info.id)
        }
      } catch (error) {
        console.error("Context monitor error:", error)
      }
    },
    
    async "tool.execute.after"(input, output) {
      if (!config.trackToolImpact) return
      
      try {
        const tokensAdded = estimateTokens(output.output || "")
        const state = getOrCreateState(input.sessionID)
        
        const current = state.toolImpact.get(input.tool) || 0
        state.toolImpact.set(input.tool, current + tokensAdded)
        
        if (tokensAdded > 5000) {
          console.log(`📊 Tool ${input.tool} added ${tokensAdded.toLocaleString()} tokens`)
        }
      } catch (error) {
        console.error("Tool tracking error:", error)
      }
    },
    
    async "chat.params"(input, output) {
      if (!config.adaptiveTemperature) return
      
      try {
        const msg = input.message
        const state = sessions.get(msg.sessionID)
        
        if (state && state.lastTokenCount > 100_000) {
          // High context - reduce temperature for focus
          output.temperature = 0.3
          console.log("🎯 Adaptive mode: reduced temperature (high context)")
        }
      } catch (error) {
        console.error("Adaptive params error:", error)
      }
    },
    
    tool: {
      context_health: tool({
        description: "Get detailed context health report for current session",
        args: {},
        async execute() {
          try {
            const sessions_list = await ctx.client.session.list()
            if (!sessions_list.length) return "No active sessions"
            
            const currentSession = sessions_list[0]
            const state = sessions.get(currentSession.id)
            
            if (!state) return "No context data available yet"
            
            const tokens = state.lastTokenCount
            const percentage = Math.round((tokens / 200000) * 100)
            const growthRate = calculateGrowthRate(state.history)
            
            let report = `📊 Context Health Report\n\n`
            report += `Current tokens: ${tokens.toLocaleString()}\n`
            report += `Percentage of 200k limit: ${percentage}%\n`
            report += `Growth rate: ${growthRate.toLocaleString()} tokens/min\n`
            report += `Compactions: ${state.compactionCount}\n`
            report += `Status: ${tokens < 80000 ? "✅ Healthy" : tokens < 100000 ? "⚠️  Warning" : "🚨 Critical"}\n`
            
            if (config.trackToolImpact && state.toolImpact.size > 0) {
              report += `\n📈 Top Tools by Token Impact:\n`
              const sorted = Array.from(state.toolImpact.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
              
              sorted.forEach(([tool, tokens]) => {
                report += `  - ${tool}: ${tokens.toLocaleString()} tokens\n`
              })
            }
            
            if (tokens >= 80000) {
              report += `\n💡 Recommendation: Consider compacting context`
            }
            
            return report
          } catch (error) {
            return `Error: ${error}`
          }
        }
      })
    }
  }
}
```

---

## Key Takeaways

### For All Plugins:
1. **Always handle errors** - Never crash OpenCode
2. **Clean up state** - Delete tracking data when sessions end
3. **Keep hooks fast** - Don't block the event loop
4. **Use TypeScript** - Type safety prevents bugs
5. **Test thoroughly** - Plugins run in production

### For Context-Aware Plugins:
1. **Monitor `message.updated` events** for token tracking
2. **Calculate context as** `input + cache.read` tokens
3. **Warn at 80-100k tokens** even if model supports more
4. **Track `session.compacted` events** to reset warnings
5. **Use adaptive strategies** - adjust behavior based on context size
6. **Track tool impact** - identify which tools add most context
7. **Provide tools** - let agents check their own context health
8. **Test with real sessions** - generate lots of context to verify

The plugin system provides complete visibility and control over OpenCode's behavior, enabling sophisticated context management and optimization strategies.
