import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {day} from '../lib/domain.mjs';
await mkdir('outputs/qa', { recursive: true });
const browser = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const proc = spawn(
  browser,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=9229',
    `--user-data-dir=${path.resolve('outputs/qa/browser-profile')}`,
    'about:blank',
  ],
  { windowsHide: true, stdio: 'ignore' },
);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
try {
  let targets;
  for (let n = 0; n < 50; n++) {
    try {
      targets = await (await fetch('http://127.0.0.1:9229/json')).json();
      break;
    } catch {
      await pause(100);
    }
  }
  ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let seq = 0;
  const pending = new Map(),
    errors = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id) {
      const cb = pending.get(m.id);
      pending.delete(m.id);
      m.error ? cb.reject(Error(m.error.message)) : cb.resolve(m.result);
    }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails) throw Error(r.exceptionDetails.text);
    return r.result.value;
  };
  const wait = async (expression) => {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(expression)) return;
      await pause(100);
    }
    throw Error(
      'Timed out: ' + expression + '; ' + (await evaluate('document.body.innerText.slice(0,1000)')),
    );
  };
  const click = async (text) => {
    assert(
      await evaluate(
        `(()=>{const els=[...document.querySelectorAll('button,a')];const e=els.find(e=>e.textContent.trim()===${JSON.stringify(text)})||els.find(e=>e.textContent.trim().startsWith(${JSON.stringify(text)}));if(!e)return false;e.click();return true;})()`,
      ),
      'Button not found: ' + text,
    );
  };
  const screenshot = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile('outputs/qa/' + name + '.png', Buffer.from(r.data, 'base64'));
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.clearBrowserCookies');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Page.navigate', { url: 'http://127.0.0.1:4173' });
  await wait("document.querySelector('h1')?.textContent.includes('Some places')");
  await pause(800);
  await screenshot('01-home-desktop');
  await click('Our stays');
  await wait("document.querySelectorAll('.result-card').length===3");
  const setInput=async(selector,value)=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await setInput('input[aria-label="Check-in date"]',day(Number(process.env.UI_STAY_OFFSET||40)));
  await setInput('input[aria-label="Check-out date"]',day(Number(process.env.UI_STAY_OFFSET||40)+2));
  await click('Find your stay');
  await wait("document.querySelectorAll('.result-card').length===3&&!document.querySelector('.search-button').disabled");
  await evaluate("(()=>{const e=document.querySelector('select[aria-label=\"Rate plan\"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,'full-board');e.dispatchEvent(new Event('change',{bubbles:true}));})()");
  await wait("!document.querySelector('.search-button').disabled&&document.querySelector('.result-card .amenities').textContent.includes('Full board')");
  await setInput('input[aria-label="Promo code"]','MORA10');
  await click('Apply code');
  await wait("!!document.querySelector('.promo-savings')&&!document.querySelector('.search-button').disabled");
  await screenshot('02-availability');
  await click('Explore & book');
  await wait("!!document.querySelector('.detail-image')");
  await click('Reserve your stay');
  await wait("!!document.querySelector('[role=dialog]')");
  await click('New here? Create an account');
  // Fill with native setters so React receives the same input events as typing.
  const fill = async (selector, value) =>
    evaluate(
      `(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`,
    );
  await fill('input[autocomplete=name]', 'Browser Demo');
  await fill('input[type=email]', `browser-${Date.now()}@example.test`);
  await fill('input[type=password]', 'BrowserDemo2026!');
  await click('Create guest account');
  await wait("!!document.querySelector('.checkout-page')");
  await screenshot('03-checkout');
  await evaluate("document.querySelector('input[type=checkbox]').click()");
  await evaluate("document.querySelector('.checkout-pay').click()");
  await wait("!!document.querySelector('.confirmation-card')");
  await screenshot('04-confirmation');
  assert(await evaluate("document.querySelector('.confirmation-card').textContent.includes('Full board')&&document.querySelector('.confirmation-card').textContent.includes('MORA10')"));
  await click('My bookings');
  await wait("!!document.querySelector('.booking-record')");
  await click('Sign out');
  await click('Staff sign in');
  await click('Use staff account');
  await click('Sign in');
  await wait("!!document.querySelector('.inbox-panel')");
  if (
    await evaluate(
      "document.querySelector('.ai-status-banner strong')?.textContent==='Gemini is configured'",
    )
  ) {
    await evaluate(
      "[...document.querySelectorAll('.enquiry-row')].find(e=>e.innerText.includes('ENQ-4410')).click()",
    );
    await wait("document.querySelector('.reader-header')?.textContent.includes('ENQ-4410')");
    await click('Regenerate draft with Gemini');
    assert(
      await evaluate("document.querySelector('.draft-editor').disabled"),
      'Draft editing must pause during regeneration.',
    );
    await wait(
      "!document.querySelector('.ai-rerun').disabled && document.querySelector('.routing-heading .badge')?.textContent.trim()==='Gemini'",
    );
    assert(await evaluate("document.querySelector('.draft-editor').value.length>10"));
    console.log('PASS: staff regenerated a persisted draft through the live Gemini API.');
  }
  await screenshot('05-inbox-desktop');
  await click('Rates & allotment');
  await wait("document.querySelectorAll('.rate-card').length===3");
  await screenshot('06-rates-desktop');
  await click('Plans & promos');
  await wait("document.querySelectorAll('.offer-card').length>=3");
  await screenshot('10-plans-promos');
  await click('Bookings');
  await wait("!!document.querySelector('.daily-exports')");
  await click('Prepare daily CSV');
  await wait("!!document.querySelector('.export-list a')");
  await screenshot('11-daily-exports');
  await click('Enquiry inbox');
  await wait("!!document.querySelector('.inbox-panel')");
  await click('Needs review');
  assert(await evaluate("document.querySelectorAll('.enquiry-row').length>0"));
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await screenshot('07-inbox-mobile');
  assert(
    await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),
    'Staff view overflows on mobile',
  );
  await evaluate('document.querySelector(\'[aria-label="Mora Estate home"]\').click()');
  await wait("!!document.querySelector('.hero')");
  await screenshot('08-home-mobile');
  assert(
    await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),
    'Homepage overflows on mobile',
  );
  await click('Find your stay');
  await wait("document.querySelectorAll('.result-card').length===3");
  await screenshot('09-stays-mobile');
  assert(
    await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),
    'Availability overflows on mobile',
  );
  assert.deepEqual(errors, []);
  await click('Sign out');
  await click('Staff sign in');
  await click('Use GM account');
  await click('Sign in');
  await wait("!!document.querySelector('.inbox-panel')");
  await click('GM attention');
  await wait("document.querySelector('h1')?.textContent.includes('details that need you')");
  const unresolved=await evaluate("[...document.querySelectorAll('.enquiry-row')].find(e=>e.textContent.includes('Rohan Demo'))!==undefined");
  if(unresolved){await evaluate("[...document.querySelectorAll('.enquiry-row')].find(e=>e.textContent.includes('Rohan Demo')).click()");await wait("!!document.querySelector('.gm-ack')");if(await evaluate("!document.querySelector('.gm-ack').disabled")){await click('Acknowledge as GM');await wait("document.querySelector('.gm-ack')?.disabled");}}
  await screenshot('12-gm-mobile');
  assert(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),'GM view overflows on mobile');
  console.log(
    'PASS: Chrome desktop/mobile, guest registration, booking, confirmation, bookings, staff inbox and rates; no JS exceptions or mobile overflow.',
  );
} finally {
  ws?.close();
  proc.kill();
}
