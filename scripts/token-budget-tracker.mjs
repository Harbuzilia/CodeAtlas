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

let totalInput = 0;
let totalOutput = 0;

console.log('📊 Token Consumption Breakdown by Agent:\n');
for (const [agent, data] of Object.entries(stats)) {
  const total = data.input + data.output;
  totalInput += data.input;
  totalOutput += data.output;
  console.log(`   - ${agent.padEnd(14)}: ${total.toString().padStart(6)} tokens (In: ${data.input} | Out: ${data.output})`);
}

const totalTokens = totalInput + totalOutput;

// Pricing estimates: Input ~$1.25/M, Output ~$5.00/M (Gemini 2.5 Pro approximate).
const estimatedCostUSD = (totalInput / 1_000_000 * 1.25) + (totalOutput / 1_000_000 * 5.00);
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