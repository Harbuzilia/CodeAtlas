import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

console.log('====================================================');
console.log('      💰 OPENCODE TOKEN & COST BUDGET TRACKER       ');
console.log('====================================================\n');

// ---------------------------------------------------------------------------
// 1. Try to read real session data from .opencode/history
//    If unavailable, report honestly instead of showing fake data.
// ---------------------------------------------------------------------------

const historyDir = path.join(root, '.opencode', 'history');
const stats = {};
let hasRealData = false;

if (fs.existsSync(historyDir) && fs.readdirSync(historyDir).length > 0) {
  // Scan session history for usage data.
  const sessions = fs.readdirSync(historyDir);
  for (const session of sessions) {
    const sessionDir = path.join(historyDir, session);
    if (!fs.statSync(sessionDir).isDirectory()) continue;
    const entries = fs.readdirSync(sessionDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const filePath = path.join(sessionDir, entry.name);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        // OpenCode session files may store usage per agent.
        if (data.agent && data.input_tokens != null && data.output_tokens != null) {
          const agent = data.agent;
          if (!stats[agent]) stats[agent] = { input: 0, output: 0 };
          stats[agent].input += data.input_tokens;
          stats[agent].output += data.output_tokens;
          hasRealData = true;
        }
      } catch {}
    }
  }
}

if (!hasRealData) {
  console.log('📊 No telemetry data available in .opencode/history/');
  console.log('   Token budget tracking requires active session history.');
  console.log('   Run agent tasks first, then check /budget.');
  console.log('\n----------------------------------------------------');
  console.log('📈 Token Budget: N/A (no data)');
  console.log('💵 Estimated Cost: N/A');
  console.log('🛡️ Budget Guard Status: ⚠️ INSUFFICIENT DATA');
  console.log('====================================================\n');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// 2. Compute and display real stats.
// ---------------------------------------------------------------------------

// Price each agent by ITS model (from the active preset in agent frontmatter),
// not by a single global guess. Rates are public-list estimates per 1M tokens;
// a `cost: {input, output}` field on a model in opencode.json overrides them.
const DEFAULT_RATES = { input: 1.25, output: 5.0 };
const MODEL_RATES_USD = {
  'antigravity-gemini-3-pro': { input: 2.0, output: 12.0 },
  'antigravity-gemini-3-flash': { input: 0.3, output: 2.5 },
  'antigravity-claude-sonnet-4-5': { input: 3.0, output: 15.0 },
  'antigravity-claude-sonnet-4-5-thinking': { input: 3.0, output: 15.0 },
  'antigravity-claude-opus-4-5-thinking': { input: 5.0, output: 25.0 },
  'antigravity-gpt-oss-120b': { input: 0.1, output: 0.6 },
};

function rateForModel(modelId) {
  if (!modelId) return DEFAULT_RATES;
  const id = modelId.replace(/^([^/]+)\//, '').replace(/:[^:]*$/, ''); // strip provider/ and :variant
  return MODEL_RATES_USD[id] ?? DEFAULT_RATES;
}

/** The model an agent runs on: frontmatter model: (preset-written), else the global default. */
function agentModel(agent) {
  const agentFile = path.join(root, 'agents', `${agent}.md`);
  if (fs.existsSync(agentFile)) {
    const fm = fs.readFileSync(agentFile, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const model = fm ? fm[1].match(/^model:\s*(.+)$/m) : null;
    if (model) return model[1].trim().replace(/^["'](.*)["']$/, '$1');
  }
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'opencode.json'), 'utf8')).model || null;
  } catch {
    return null;
  }
}

let totalInput = 0;
let totalOutput = 0;
let estimatedCostUSD = 0;

console.log('📊 Token Consumption Breakdown by Agent:\n');
for (const [agent, data] of Object.entries(stats)) {
  const total = data.input + data.output;
  totalInput += data.input;
  totalOutput += data.output;
  const model = agentModel(agent);
  const rates = rateForModel(model);
  estimatedCostUSD += (data.input / 1_000_000) * rates.input + (data.output / 1_000_000) * rates.output;
  console.log(
    `   - ${agent.padEnd(14)}: ${total.toString().padStart(6)} tokens (In: ${data.input} | Out: ${data.output})` +
      `${model ? `  [${model}]` : ''}`,
  );
}

const totalTokens = totalInput + totalOutput;
const budgetLimit = 250_000;
const pctUsed = ((totalTokens / budgetLimit) * 100).toFixed(1);

console.log('\n----------------------------------------------------');
console.log(`📈 Total Tokens Consumed : ${totalTokens.toLocaleString()} tokens`);
console.log(`   - Total Input Tokens  : ${totalInput.toLocaleString()} tokens`);
console.log(`   - Total Output Tokens : ${totalOutput.toLocaleString()} tokens`);
console.log(`💵 Estimated Session Cost: ~$${estimatedCostUSD.toFixed(4)} USD`);
console.log(`📊 Budget Usage          : ${pctUsed}% of ${budgetLimit.toLocaleString()} limit`);
console.log(`🛡️ Budget Guard Status   : ${totalTokens < budgetLimit ? '✅ WITHIN SAFETY LIMIT' : '❌ OVER BUDGET LIMIT'}`);
console.log('====================================================\n');