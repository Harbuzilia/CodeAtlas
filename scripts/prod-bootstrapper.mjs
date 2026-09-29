import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

console.log('====================================================');
console.log('     🚢 OPENCODE PRODUCTION BOOTSTRAPPER            ');
console.log('====================================================\n');

// ---------------------------------------------------------------------------
// 1. Detect the actual stack so generated templates match the project.
// ---------------------------------------------------------------------------

function detectStack() {
  const hints = [];

  if (fs.existsSync(path.join(root, 'package.json'))) {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const all = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    hints.push(`Node.js (package.json, ${Object.keys(all).length} deps)`);
    if (all.next || all['@remix-run/react']) hints.push('Next.js/Remix frontend detected');
    if (all.express || all.fastify || all.hono || all.koa) hints.push('Node HTTP framework detected');
    if (all.prisma || all.sequelize || all.typeorm) hints.push('ORM detected');
  }
  if (fs.existsSync(path.join(root, 'requirements.txt'))) hints.push('Python (requirements.txt)');
  if (fs.existsSync(path.join(root, 'pyproject.toml'))) hints.push('Python (pyproject.toml)');
  if (fs.existsSync(path.join(root, 'go.mod'))) hints.push('Go (go.mod)');
  if (fs.existsSync(path.join(root, '*.sln')) || fs.existsSync(path.join(root, '*.csproj'))) hints.push('.NET');

  return hints.length > 0 ? hints.join('; ') : 'unknown (no manifest detected)';
}

const stack = detectStack();
console.log(`1. 🔍 Detected stack: ${stack}\n`);

// ---------------------------------------------------------------------------
// 2. Generate Dockerfile + compose with env-var placeholders and healthchecks.
//    No hardcoded credentials — DATABASE_URL etc. come from the environment.
// ---------------------------------------------------------------------------

const dockerfileContent = `# Multi-stage secure production Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build --if-present

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S appuser
COPY --from=builder --chown=appuser:nodejs /app ./
USER appuser
EXPOSE 3000
CMD ["npm", "start"]
`;

const composeContent = `services:
  app:
    build: .
    ports:
      - "\${APP_PORT:-3000}:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=\${DATABASE_URL:?DATABASE_URL is required}
      - REDIS_URL=\${REDIS_URL:-redis://redis:6379}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: \${POSTGRES_USER:?POSTGRES_USER is required}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
      POSTGRES_DB: \${POSTGRES_DB:-appdb}
    ports:
      - "\${POSTGRES_PORT:-5432}:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER} -d \${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "\${REDIS_PORT:-6379}:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
  redisdata:
`;

const envExample = `# Copy to .env and fill in real values. NEVER commit .env.
APP_PORT=3000
DATABASE_URL=postgresql://user:password@postgres:5432/appdb
POSTGRES_USER=appuser
POSTGRES_PASSWORD=change-me
POSTGRES_DB=appdb
REDIS_URL=redis://redis:6379
`;

const infraDir = path.join(root, '.opencode', 'bootstrap_templates');
fs.mkdirSync(infraDir, { recursive: true });
fs.writeFileSync(path.join(infraDir, 'Dockerfile'), dockerfileContent, 'utf8');
fs.writeFileSync(path.join(infraDir, 'docker-compose.yml'), composeContent, 'utf8');
fs.writeFileSync(path.join(infraDir, '.env.example'), envExample, 'utf8');

console.log('2. ⚡ Generated Production Infrastructure Blueprints:');
console.log('   ✅ Multi-stage Dockerfile (non-root user, node:22-alpine)');
console.log('   ✅ Docker Compose (app + Postgres + Redis, healthchecks, volumes)');
console.log('   ✅ .env.example — credentials via environment variables only');

console.log('\n----------------------------------------------------');
console.log('🎉 Production manifests written to `.opencode/bootstrap_templates/`.');
console.log('⚠️  Note: templates are generic starting points — review before deploy.');
console.log('====================================================\n');
