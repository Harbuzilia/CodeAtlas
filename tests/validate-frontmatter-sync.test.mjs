import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(import.meta.dirname, '..');
const scriptPath = path.join(repoRoot, 'scripts', 'validate-frontmatter-sync.mjs');

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

test('validate-frontmatter-sync fails when registry-managed frontmatter id is missing', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'frontmatter-sync-'));

  writeFile(
    path.join(fixtureRoot, 'registry.json'),
    JSON.stringify(
      {
        components: {
          agents: [
            {
              id: 'openagent',
              path: 'agents/openagent.md'
            }
          ],
          subagents: []
        }
      },
      null,
      2
    )
  );

  writeFile(
    path.join(fixtureRoot, 'opencode.json'),
    JSON.stringify(
      {
        default_agent: 'openagent',
        agent: {
          openagent: {
            path: 'agents/openagent.md'
          }
        }
      },
      null,
      2
    )
  );

  writeFile(
    path.join(fixtureRoot, 'agents', 'openagent.md'),
    ['---', 'description: test agent', '---', '', '# OpenAgent'].join('\n')
  );

  const result = spawnSync('node', [scriptPath], {
    cwd: fixtureRoot,
    encoding: 'utf8'
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /frontmatter id missing/i);
});
