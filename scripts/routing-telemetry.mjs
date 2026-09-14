import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const journalPath = path.join(root, '.opencode', 'agent-journal.jsonl');

console.log('====================================================');
console.log('       📊 ROUTING TELEMETRY & DEAD-AGENT RADAR       ');
console.log('====================================================\n');

if (!fs.existsSync(journalPath)) {
  console.log('No journal yet: .opencode/agent-journal.jsonl not found.');
  console.log('The telemetry plugin (plugin/telemetry.js) records delegations');
  console.log('automatically as you work in OpenCode. Re-run after a few sessions.');
  process.exit(0);
}

const records = fs
  .readFileSync(journalPath, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  })
  .filter(Boolean);

if (records.length === 0) {
  console.log('Journal exists but is empty. Re-run after a few sessions.');
  process.exit(0);
}

// --- Registry: known subagents --------------------------------------------
const registry = JSON.parse(fs.readFileSync(path.join(root, 'registry.json'), 'utf8'));
const knownSubagents = (registry.components?.subagents || []).map((x) => x.id);

// --- Aggregations ----------------------------------------------------------
const delegations = records.filter((r) => r.type === 'delegate');
const perAgent = new Map();
const perTool = new Map();
const perDay = new Map();

for (const r of records) {
  const day = String(r.ts).slice(0, 10);
  perDay.set(day, (perDay.get(day) || 0) + 1);
  if (r.tool && r.type !== 'tool_error') perTool.set(r.tool, (perTool.get(r.tool) || 0) + 1);
  if (r.type === 'delegate') {
    const cur = perAgent.get(r.agent) || { count: 0, last: null };
    cur.count++;
    if (!cur.last || r.ts > cur.last) cur.last = r.ts;
    perAgent.set(r.agent, cur);
  }
}

const journalDays = new Set(records.map((r) => String(r.ts).slice(0, 10))).size;
const firstTs = records[0].ts;
const lastTs = records[records.length - 1].ts;

console.log(`Journal window: ${firstTs.slice(0, 10)} .. ${lastTs.slice(0, 10)} (${journalDays} active days, ${records.length} events)\n`);

// --- Delegation leaderboard -------------------------------------------------
console.log(`Delegations: ${delegations.length}`);
if (delegations.length > 0) {
  const sorted = [...perAgent.entries()].sort((a, b) => b[1].count - a[1].count);
  for (const [agent, s] of sorted) {
    console.log(`  ${agent.padEnd(16)} ${String(s.count).padStart(5)}x   last: ${String(s.last).slice(0, 16).replace('T', ' ')}`);
  }
}

// --- Dead-agent radar -------------------------------------------------------
console.log('\nDead-agent radar:');
const DEAD_DAYS = Number(process.env.TELEMETRY_DEAD_DAYS ?? 14);
const threshold = Date.now() - DEAD_DAYS * 24 * 3600 * 1000;
let dead = 0;
for (const id of knownSubagents) {
  const s = perAgent.get(id);
  if (!s) {
    if (journalDays >= 3) {
      console.log(`  ⚠️  ${id}: never delegated in ${journalDays} active days — check routing`);
      dead++;
    } else {
      console.log(`  ⏳ ${id}: no data yet (journal too young to judge)`);
    }
  } else if (Date.parse(s.last) < threshold) {
    console.log(`  ⚠️  ${id}: idle since ${String(s.last).slice(0, 10)} (> ${DEAD_DAYS}d)`);
    dead++;
  }
}
if (dead === 0) console.log('  ✅ No dead agents detected.');

// --- Tool usage --------------------------------------------------------------
console.log('\nTool usage:');
for (const [tool, count] of [...perTool.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`  ${tool.padEnd(16)} ${count}x`);
}

// --- Activity histogram (last 14 active days) --------------------------------
console.log('\nActivity (events/day):');
const days = [...perDay.entries()].sort().slice(-14);
const max = Math.max(...days.map(([, c]) => c), 1);
for (const [day, count] of days) {
  console.log(`  ${day} ${'█'.repeat(Math.max(1, Math.round((count / max) * 40)))} ${count}`);
}

// --- Token spend (dedup by message id) ---------------------------------------
const tokenMsgs = new Map();
for (const r of records) {
  if (r.type === 'tokens' && r.msg) tokenMsgs.set(r.msg, r);
}
if (tokenMsgs.size > 0) {
  let inSum = 0;
  let outSum = 0;
  let cacheSum = 0;
  const perDayTokens = new Map();
  const perSessionTokens = new Map();
  for (const r of tokenMsgs.values()) {
    inSum += r.input;
    outSum += r.output;
    cacheSum += r.cache;
    const day = String(r.ts).slice(0, 10);
    const d = perDayTokens.get(day) || { input: 0, output: 0 };
    d.input += r.input;
    d.output += r.output;
    perDayTokens.set(day, d);
    if (r.session) {
      perSessionTokens.set(r.session, (perSessionTokens.get(r.session) || 0) + r.input + r.output);
    }
  }
  console.log('\nToken spend (completed assistant messages):');
  console.log(`  input: ${inSum.toLocaleString()}  output: ${outSum.toLocaleString()}  cache: ${cacheSum.toLocaleString()}`);
  console.log('  per day (in/out):');
  for (const [day, t] of [...perDayTokens.entries()].sort().slice(-14)) {
    console.log(`    ${day}  ${t.input.toLocaleString()} / ${t.output.toLocaleString()}`);
  }
  const topSessions = [...perSessionTokens.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (topSessions.length > 0) {
    console.log('  top sessions (in+out):');
    for (const [s, t] of topSessions) console.log(`    ${s}  ${t.toLocaleString()}`);
  }
}

// --- Tool reliability (dedup by part id) -------------------------------------
const errorParts = new Map();
for (const r of records) {
  if (r.type === 'tool_error' && r.part) errorParts.set(r.part, r);
}
if (errorParts.size > 0) {
  const errorsPerTool = new Map();
  for (const r of errorParts.values()) {
    errorsPerTool.set(r.tool, (errorsPerTool.get(r.tool) || 0) + 1);
  }
  console.log('\nTool reliability (errors / executions):');
  const tools = new Set([...perTool.keys(), ...errorsPerTool.keys()]);
  for (const tool of [...tools].sort()) {
    const errs = errorsPerTool.get(tool) || 0;
    const runs = perTool.get(tool) || 0;
    if (errs > 0) console.log(`  ⚠️  ${tool.padEnd(16)} ${errs}/${runs} failed`);
  }
  const totalErrs = errorParts.size;
  const totalRuns = [...perTool.values()].reduce((a, b) => a + b, 0);
  console.log(`  total: ${totalErrs}/${totalRuns} tool executions failed (${((totalErrs / Math.max(totalRuns, 1)) * 100).toFixed(1)}%)`);
}

console.log('');
