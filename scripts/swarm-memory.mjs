import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const memPath = path.join(root, '.opencode', 'shared_memory.json');

console.log('====================================================');
console.log('     👑 OPENCODE SWARM SHARED WORKING MEMORY        ');
console.log('====================================================\n');

if (!fs.existsSync(memPath)) {
  console.log('Shared memory slate not found. Initializing empty slate...');
  const init = {
    active_goal: 'None',
    discovered_facts: [],
    rejected_hypotheses: [],
    architectural_invariants: [],
    completed_phases: [],
    remaining_blockers: []
  };
  fs.writeFileSync(memPath, JSON.stringify(init, null, 2), 'utf8');
}

const mem = JSON.parse(fs.readFileSync(memPath, 'utf8'));

console.log(`🎯 Active Goal: ${mem.active_goal}\n`);

console.log('💡 Discovered Project Facts:');
mem.discovered_facts.forEach(f => console.log(`   - ${f}`));

console.log('\n🚫 Rejected Hypotheses & Dead Ends:');
mem.rejected_hypotheses.forEach(h => console.log(`   - ${h}`));

console.log('\n🛡️  Architectural Invariants:');
mem.architectural_invariants.forEach(i => console.log(`   - ${i}`));

console.log('\n🚧 Remaining Blockers:');
if (mem.remaining_blockers && mem.remaining_blockers.length > 0) {
  mem.remaining_blockers.forEach(b => console.log(`   - ${b}`));
} else {
  console.log('   (none)');
}

console.log('\n====================================================\n');

console.log('\n====================================================\n');
