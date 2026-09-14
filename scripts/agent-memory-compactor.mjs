import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const memPath = path.join(root, '.opencode', 'shared_memory.json');

console.log('====================================================');
console.log('     🧠 OPENCODE LONG-TERM MEMORY COMPACTOR         ');
console.log('====================================================\n');

if (!fs.existsSync(memPath)) {
  console.log('No shared memory slate found to compact.');
  process.exit(0);
}

const raw = fs.readFileSync(memPath, 'utf8');
const initialBytes = Buffer.byteLength(raw, 'utf8');

const mem = JSON.parse(raw);

// Defensive access: tolerate a partially-initialized slate.
const facts = Array.isArray(mem.discovered_facts) ? mem.discovered_facts : [];
const phases = Array.isArray(mem.completed_phases) ? mem.completed_phases : [];
const hypotheses = Array.isArray(mem.rejected_hypotheses) ? mem.rejected_hypotheses : [];
const invariants = Array.isArray(mem.architectural_invariants) ? mem.architectural_invariants : [];
const blockers = Array.isArray(mem.remaining_blockers) ? mem.remaining_blockers : [];

console.log(`1. 📦 Initial Working Memory: ${initialBytes} bytes across ${facts.length} facts and ${phases.length} phases.`);

// 2. Deduplicate facts
const uniqueFacts = [...new Set(facts.map(f => f.trim()))];
const uniquePhases = [...new Set(phases.map(p => p.trim()))];
const uniqueHypotheses = [...new Set(hypotheses.map(h => h.trim()))];
const uniqueInvariants = [...new Set(invariants.map(i => i.trim()))];

const compacted = {
  active_goal: mem.active_goal,
  discovered_facts: uniqueFacts,
  rejected_hypotheses: uniqueHypotheses,
  architectural_invariants: uniqueInvariants,
  completed_phases: uniquePhases,
  remaining_blockers: blockers,
  last_compacted_at: new Date().toISOString()
};

const compactedJson = JSON.stringify(compacted, null, 2);
fs.writeFileSync(memPath, compactedJson, 'utf8');
const finalBytes = Buffer.byteLength(compactedJson, 'utf8');

console.log('2. ⚡ Memory Compaction & Deduplication Applied:');
console.log(`   - Deduplicated facts: ${uniqueFacts.length}`);
console.log(`   - Synthesized phases: ${uniquePhases.length}`);
console.log(`   - Verified invariants: ${uniqueInvariants.length}`);
console.log(`   - Size: ${initialBytes} -> ${finalBytes} bytes`);

console.log('\n----------------------------------------------------');
console.log('🎉 Long-Term Working Memory compacted successfully.');
console.log('====================================================\n');
