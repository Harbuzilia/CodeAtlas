import { createOpencodeClient } from '@opencode-ai/sdk';

const client = createOpencodeClient({
  baseUrl: 'http://localhost:3721'
});

const sessionId = process.argv[2];

if (!sessionId) {
  console.error('Usage: node check-agent.mjs <session-id>');
  process.exit(1);
}

try {
  const messages = await client.session.messages({
    path: { id: sessionId }
  });
  
  console.log(`\nSession: ${sessionId}`);
  console.log(`Messages: ${messages.data?.length || 0}\n`);
  
  if (messages.data && messages.data.length > 0) {
    messages.data.forEach((msg, i) => {
      console.log(`Message ${i + 1}:`);
      console.log(`  Role: ${msg.info.role}`);
      console.log(`  Agent: ${msg.info.agent || 'N/A'}`);
      console.log(`  Parts: ${msg.parts.length}`);
      console.log('');
    });
  }
} catch (error) {
  console.error('Error:', error.message);
}
