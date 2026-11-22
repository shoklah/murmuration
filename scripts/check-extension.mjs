// Smoke-checks the built extension in dist/: loads it in Playwright's
// Chromium with a fresh profile and runs four checks. Run after `npm run build`.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const NO_MEET_TAB = 'Open the Meet call in this window, then press Start.';

class CheckFailed extends Error {}

function fail(seen) {
  throw new CheckFailed(seen);
}

async function check(name, run) {
  try {
    await run();
  } catch (error) {
    const seen = error instanceof CheckFailed ? error.message : error.message.split('\n')[0];
    console.log(`FAILED  ${name}: ${seen}`);
    throw new CheckFailed(seen);
  }
  console.log(`ok  ${name}`);
}

// Opens a page and collects its console errors and uncaught errors.
async function openPage(context, url) {
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  return { page, errors };
}

const profile = await mkdtemp(join(tmpdir(), 'murmuration-check-'));
let context;
let exitCode = 0;
try {
  context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
  });
  const outside = [];
  context.on('request', (request) => {
    if (!request.url().startsWith('chrome-extension://')) outside.push(request.url());
  });

  let id;
  await check('background registers', async () => {
    const isBackground = (worker) => worker.url().endsWith('/src/background.js');
    const worker = context.serviceWorkers().find(isBackground)
      ?? await context.waitForEvent('serviceworker', { predicate: isBackground, timeout: 10_000 })
        .catch(() => fail(`no /src/background.js service worker within 10 s; workers: ${context.serviceWorkers().map((w) => w.url()).join(', ') || 'none'}`));
    id = new URL(worker.url()).host;
  });

  let panel;
  await check('pages open', async () => {
    panel = await openPage(context, `chrome-extension://${id}/src/panel/panel.html`);
    await panel.page.getByRole('button', { name: 'Start', exact: true }).waitFor({ timeout: 5_000 })
      .catch(() => fail('the panel shows no button named Start'));
    const roster = await openPage(context, `chrome-extension://${id}/src/roster-page/roster-page.html`);
    await roster.page.getByRole('heading', { name: 'Roster', exact: true }).waitFor({ timeout: 5_000 })
      .catch(() => fail('the roster page shows no heading Roster'));
    const errors = [...panel.errors.map((e) => `panel: ${e}`), ...roster.errors.map((e) => `roster: ${e}`)];
    if (errors.length > 0) fail(errors.join('; '));
  });

  await check('Start without a Meet tab', async () => {
    await panel.page.getByRole('button', { name: 'Start', exact: true }).click();
    await panel.page.getByText(NO_MEET_TAB, { exact: true }).waitFor({ timeout: 5_000 })
      .catch(() => fail(`no text "${NO_MEET_TAB}" after pressing Start`));
  });

  await check('no request leaves the extension', async () => {
    if (outside.length > 0) fail(outside.join(', '));
  });
} catch (error) {
  if (!(error instanceof CheckFailed)) console.log(`FAILED  setup: ${error.message.split('\n')[0]}`);
  exitCode = 1;
} finally {
  await context?.close();
  await rm(profile, { recursive: true, force: true });
}
process.exit(exitCode);
