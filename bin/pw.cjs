#!/usr/bin/env node
/**
 * pw — тонкий CLI над Playwright. Замена `ab`/agent-browser.
 *
 * Принципы (почему не висит):
 *  - НЕТ демона. Каждая команда — свой процесс node + свой браузер, который гарантированно закрывается.
 *  - НЕТ общего состояния/логов/сокетов — нечего блокировать и нечего «заклинивать».
 *  - У каждой операции ЖЁСТКИЙ таймаут (по умолчанию 20 с), у всего запуска — дедлайн (60 с),
 *    после которого процесс принудительно завершается с кодом 1.
 *  - Навигация по умолчанию ждёт `domcontentloaded`, а не `load/networkidle` — поэтому живые
 *    приложения с HMR/SSE/долгими соединениями (vite dev-сервер) не подвешивают команду.
 *  - Логины переносятся между запусками через storageState-файл (`--state`), а не через живой браузер.
 *
 * Использование (JSON в stdout по умолчанию, человекочитаемо с --pretty):
 *   pw open <url> [--wait domcontentloaded|load|networkidle] [--timeout ms] [--state f] [--headed]
 *   pw shot <url> <file> [--full] [--state f]
 *   pw snap <url> [--state f] [--limit n]        # outline страницы: роли/имена/селекторы
 *   pw text <url> <selector> [--state f]
 *   pw click <url> <selector> [--state f]
 *   pw fill <url> <selector> <text> [--state f]
 *   pw press <url> <key> [--state f]
 *   pw eval <url> <js> [--state f]
 *   pw console <url> [--state f]                 # console + pageerror + requestfailed + http>=400
 *   pw ax <url> [--state f] [--tags wcag2a,wcag2aa]
 *   pw vitals <url> [--state f]                  # LCP/CLS/TTFB/FCP/INP
 *   pw state <url> <file>                        # headed: залогинься руками → сохранить storageState
 *   pw exec <steps.json> [--state f]             # пакет шагов в одном браузере (см. skills/playwright-cli)
 *   pw version
 */
const fs = require('fs');
const path = require('path');

const D = { timeout: 20000, deadline: 60000, wait: 'domcontentloaded', limit: 120 };

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--full') out.full = true;
    else if (a === '--headed') out.headed = true;
    else if (a === '--pretty') out.pretty = true;
    else if (a === '--json') out.json = true;
    else if (a.startsWith('--')) out[a.slice(2)] = argv[++i];
    else out._.push(a);
  }
  return out;
}
const A = parseArgs(process.argv.slice(2));
const cmd = A._[0];
const emit = (obj, code = 0) => {
  process.stdout.write(JSON.stringify(obj, null, A.pretty ? 2 : 0) + '\n');
  process.exit(code);
};
const fail = (msg, extra = {}) => emit({ ok: false, error: msg, ...extra }, 1);
const num = (v, d) => (v === undefined ? d : Number(v));

// --- гарантированный выход по дедлайну: даже если что-то внутри зависло ---
const killer = setTimeout(() => {
  emit({ ok: false, error: `deadline ${D.deadline}ms exceeded — команда принудительно прервана` }, 1);
}, num(A.deadline, D.deadline));
killer.unref?.();

let chromium;
try {
  chromium = require('playwright').chromium;
} catch (e) {
  fail(`Playwright недоступен: ${e.message}. Проверь NODE_PATH=%APPDATA%\\npm\\node_modules и 'npm i -g playwright@1.62.1'`);
}

const axePath = (() => {
  try { return require.resolve('axe-core/axe.min.js'); } catch { return null; }
})();

async function withBrowser(fn, { collect = false } = {}) {
  const timeout = num(A.timeout, D.timeout);
  const browser = await chromium.launch({ headless: !A.headed, timeout });
  const ctxOpts = { viewport: { width: 1440, height: 900 } };
  if (A.viewport && /^\d+x\d+$/.test(A.viewport)) {
    const [w, h] = A.viewport.split('x').map(Number);
    ctxOpts.viewport = { width: w, height: h };
    ctxOpts.isMobile = w <= 480;              // мобильный прогон: touch + mobile UA метаданные
    ctxOpts.hasTouch = w <= 480;
  }
  if (A.theme === 'dark' || A.theme === 'light') ctxOpts.colorScheme = A.theme;
  if (A.state) ctxOpts.storageState = A.state;
  const context = await browser.newContext(ctxOpts);
  context.setDefaultTimeout(timeout);
  context.setDefaultNavigationTimeout(timeout);
  const page = await context.newPage();
  const logs = [];
  if (collect) {
    page.on('console', (m) => logs.push({ kind: 'console', type: m.type(), text: m.text().slice(0, 400) }));
    page.on('pageerror', (e) => logs.push({ kind: 'pageerror', text: String(e).slice(0, 400) }));
    page.on('requestfailed', (r) => logs.push({ kind: 'requestfailed', url: r.url(), error: r.failure()?.errorText }));
    page.on('response', (r) => { if (r.status() >= 400) logs.push({ kind: 'http', status: r.status(), url: r.url() }); });
  }
  try {
    return await fn(page, context, logs);
  } finally {
    await browser.close().catch(() => {});
  }
}

async function goto(page, url) {
  const t0 = Date.now();
  const resp = await page.goto(url, { waitUntil: A.wait || D.wait, timeout: num(A.timeout, D.timeout) });
  const base = { url: page.url(), title: await page.title().catch(() => ''), status: resp ? resp.status() : null, ms: Date.now() - t0 };
  // детерминированное ожидание рендера SPA: конкретный селектор или фиксированная пауза (обе — в пределах таймаута)
  if (A.waitfor) {
    const w0 = Date.now();
    await page.waitForSelector(A.waitfor, { timeout: num(A.timeout, D.timeout) });
    base.waitedFor = { selector: A.waitfor, ms: Date.now() - w0 };
  } else if (A.settle) {
    await page.waitForTimeout(Math.min(num(A.settle, 0), num(A.deadline, D.deadline)));
    base.settledMs = num(A.settle, 0);
  }
  return base;
}

const VITALS_INIT = `
  window.__pwVitals = {};
  new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (e.name === 'largest-contentful-paint') window.__pwVitals.LCP = e.startTime; } }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (e.entryType === 'layout-shift' && !e.hadRecentInput) window.__pwVitals.CLS = (window.__pwVitals.CLS || 0) + e.value; } }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (!window.__pwVitals.INP && e.duration > 40) window.__pwVitals.INP = e.duration; } }).observe({ type: 'event', buffered: true, durationThreshold: 40 });
`;

async function snapOutline(page, limit) {
  const items = await page.evaluate((lim) => {
    const out = [];
    const role = (el) => {
      const t = el.tagName.toLowerCase();
      const r = el.getAttribute('role');
      if (r) return r;
      if (t === 'a') return 'link'; if (t === 'button') return 'button'; if (t === 'input') return el.type === 'submit' ? 'button' : 'textbox';
      if (/^h[1-6]$/.test(t)) return 'heading'; if (t === 'select') return 'combobox'; if (t === 'textarea') return 'textbox';
      if (t === 'img') return 'img'; if (t === 'form') return 'form'; if (t === 'nav') return 'navigation'; if (t === 'main') return 'main';
      return t === 'div' || t === 'span' ? null : t;
    };
    const name = (el) => (el.getAttribute('aria-label') || el.innerText || el.value || el.getAttribute('placeholder') || el.getAttribute('alt') || '').trim().replace(/\s+/g, ' ').slice(0, 70);
    const sel = (el) => {
      if (el.id) return '#' + el.id;
      const dt = el.getAttribute('data-testid');
      if (dt) return `[data-testid="${dt}"]`;
      const nm = el.getAttribute('name');
      if (nm) return `${el.tagName.toLowerCase()}[name="${nm}"]`;
      return null;
    };
    for (const el of document.querySelectorAll('a,button,input,select,textarea,[role],[data-testid],h1,h2,h3,form,img')) {
      const r = role(el); if (!r) continue;
      const n = name(el); const s = sel(el);
      if (!n && !s) continue;
      out.push({ role: r, name: n, sel: s, tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || undefined, disabled: el.disabled || undefined });
      if (out.length >= lim) break;
    }
    return out;
  }, limit);
  return items;
}

(async () => {
  const url = A._[1];

  if (cmd === 'version') return emit({ ok: true, pw: require('playwright/package.json').version, axe: axePath ? 'yes' : 'no' });

  if (cmd === 'exec') {
    // пакет шагов в одном браузере: [{cmd,url,selector,text,key,file,js,timeout}]
    const src = fs.readFileSync(url, 'utf8');
    const steps = JSON.parse(src);
    return withBrowser(async (page, context, logs) => {
      const report = [];
      for (const [i, s] of steps.entries()) {
        const t0 = Date.now();
        try {
          if (s.cmd === 'open' || s.cmd === 'goto') report.push({ i, cmd: s.cmd, ...(await goto(page, s.url)) });
          else if (s.cmd === 'click') { await page.click(s.selector, { timeout: num(s.timeout, num(A.timeout, D.timeout)) }); report.push({ i, cmd: 'click', selector: s.selector, ms: Date.now() - t0 }); }
          else if (s.cmd === 'fill') { await page.fill(s.selector, s.text ?? ''); report.push({ i, cmd: 'fill', selector: s.selector, ms: Date.now() - t0 }); }
          else if (s.cmd === 'press') { await page.press(s.selector || 'body', s.key || 'Enter'); report.push({ i, cmd: 'press', key: s.key, ms: Date.now() - t0 }); }
          else if (s.cmd === 'wait') { await page.waitForTimeout(num(s.ms, 500)); report.push({ i, cmd: 'wait', ms: s.ms }); }
          else if (s.cmd === 'shot') { await page.screenshot({ path: s.file, fullPage: !!s.full }); report.push({ i, cmd: 'shot', file: s.file, ms: Date.now() - t0 }); }
          else if (s.cmd === 'text') report.push({ i, cmd: 'text', value: await page.textContent(s.selector) });
          else if (s.cmd === 'eval') report.push({ i, cmd: 'eval', value: await page.evaluate(s.js) });
          else if (s.cmd === 'snap') report.push({ i, cmd: 'snap', items: await snapOutline(page, num(s.limit, num(A.limit, D.limit))) });
          else if (s.cmd === 'ax' && axePath) {
            await page.addScriptTag({ path: axePath });
            report.push({ i, cmd: 'ax', result: await page.evaluate(async (tags) => {
              const r = await window.axe.run(document, tags ? { runOnly: { type: 'tag', values: tags } } : {});
              return { violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help, target: v.nodes[0]?.target })) };
            }, (s.tags || 'wcag2a,wcag2aa').split(',')) });
          } else report.push({ i, cmd: s.cmd, error: 'неизвестный шаг' });
        } catch (e) {
          report.push({ i, cmd: s.cmd, error: String(e.message).split('\n')[0].slice(0, 300) });
          if (!s.continueOnError) break;
        }
      }
      return emit({ ok: true, steps: report, logs: logs.slice(0, 200) });
    }, { collect: true });
  }

  if (!cmd || !url) return fail('использование: pw <open|shot|snap|text|click|fill|press|eval|console|ax|vitals|state|exec|version> …');

  if (cmd === 'state') {
    // интерактивный логин: headed-браузер, ждём Enter в консоли, сохраняем storageState
    const file = A._[2] || 'state.json';
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    process.stdout.write(`Залогинься в открытом окне, затем нажми Enter здесь…\n`);
    await new Promise((r) => process.stdin.once('data', r));
    await context.storageState({ path: file });
    await browser.close();
    return emit({ ok: true, saved: path.resolve(file) });
  }

  return withBrowser(async (page, context, logs) => {
    if (cmd === 'vitals') await page.addInitScript(VITALS_INIT);
    const nav = await goto(page, url);

    switch (cmd) {
      case 'open':
        return emit({ ok: true, ...nav });
      case 'shot':
        await page.screenshot({ path: A._[2] || 'shot.png', fullPage: !!A.full });
        return emit({ ok: true, ...nav, file: path.resolve(A._[2] || 'shot.png') });
      case 'snap':
        return emit({ ok: true, ...nav, items: await snapOutline(page, num(A.limit, D.limit)) });
      case 'text':
        return emit({ ok: true, ...nav, value: await page.textContent(A._[2]) });
      case 'click':
        await page.click(A._[2]);
        return emit({ ok: true, ...nav, clicked: A._[2] });
      case 'fill':
        await page.fill(A._[2], A._[3] ?? '');
        return emit({ ok: true, ...nav, filled: A._[2] });
      case 'press':
        await page.press(A._[2] || 'body', A._[3] || 'Enter');
        return emit({ ok: true, ...nav, pressed: A._[3] || 'Enter' });
      case 'eval':
        return emit({ ok: true, ...nav, value: await page.evaluate(A._[2]) });
      case 'console':
        await page.waitForTimeout(1500);
        return emit({ ok: true, ...nav, logs: logs.slice(0, 200), counts: logs.reduce((a, l) => ((a[l.kind] = (a[l.kind] || 0) + 1), a), {}) });
      case 'ax': {
        if (!axePath) return fail('axe-core не найден (npm i -g axe-core)');
        await page.addScriptTag({ path: axePath });
        const tags = (A.tags || 'wcag2a,wcag2aa').split(',');
        const res = await page.evaluate(async (t) => {
          const r = await window.axe.run(document, { runOnly: { type: 'tag', values: t } });
          return { violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help, target: v.nodes[0]?.target })), passes: r.passes.length };
        }, tags);
        return emit({ ok: true, ...nav, ...res });
      }
      case 'vitals': {
        await page.waitForTimeout(2500);
        const v = await page.evaluate(() => {
          const n = performance.getEntriesByType('navigation')[0] || {};
          return {
            LCP: window.__pwVitals?.LCP ?? null, CLS: window.__pwVitals?.CLS ?? null, INP: window.__pwVitals?.INP ?? null,
            TTFB: n.responseStart || null, FCP: (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime ?? null,
            DOMContentLoaded: n.domContentLoadedEventEnd || null, Load: n.loadEventEnd || null,
          };
        });
        return emit({ ok: true, ...nav, vitals: v });
      }
      default:
        return fail(`неизвестная команда: ${cmd}`);
    }
  }, { collect: true });
})().catch((e) => fail(String(e && e.message ? e.message : e).split('\n')[0].slice(0, 400)));
