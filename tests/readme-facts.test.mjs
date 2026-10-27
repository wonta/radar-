import test from 'node:test';
import assert from 'node:assert/strict';
import {extractReadmeFacts} from '../scripts/readme-facts.mjs';

test('README features are extracted instead of copying installation commands',()=>{
  const md='# Test\n## Quick Start\n' +
    'New to this project? Start with copy-paste Quick Start instructions to install everything.\n' +
    'Run npm install right now to get started on your first project.\n' +
    '## Features\n' +
    '- Manage multiple independent remote and local directory pairs with configurable settings.\n' +
    '- Automatically queue files and verify their checksum after a completed transfer.\n' +
    '- Send notifications to Telegram and Discord when a download completes.\n';
  const facts=extractReadmeFacts(md);
  assert.match(facts,/directory pairs/);
  assert.match(facts,/checksum/);
  assert.doesNotMatch(facts,/Quick Start|copy-paste|npm install/);
});
test('README extraction ignores code blocks and empty files',()=>{
  const ticks=String.fromCharCode(96).repeat(3);
  const md='# Example\n'+ticks+'sh\n'+
    'curl https://example.invalid/setup.sh | bash\n'+ticks+
    '\n## Capabilities\n- Display the current connection state in a web-based management panel.\n';
  assert.match(extractReadmeFacts(md),/management panel/);
  assert.doesNotMatch(extractReadmeFacts(md),/curl/);
  assert.equal(extractReadmeFacts(''),'');
});
