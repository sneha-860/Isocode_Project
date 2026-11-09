import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import assert from 'node:assert/strict';
import { analyzeEnquiry, hasGeminiKey, DEFAULT_GEMINI_MODEL } from '../lib/gemini.mjs';
let local = {};
try {
  local = parseEnv(await readFile('.dev.vars', 'utf8'));
} catch {}
const apiKey = process.env.GEMINI_API_KEY || local.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || local.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
await mkdir('outputs', { recursive: true });
if (!hasGeminiKey(apiKey)) {
  await writeFile(
    'outputs/gemini-live-check.json',
    JSON.stringify({ verified: false, reason: 'No usable GEMINI_API_KEY configured.' }, null, 2),
  );
  console.log(
    'SKIPPED: add your key to .dev.vars, then rerun npm run test:gemini:live. No live Gemini call has been verified.',
  );
} else {
  const fixtures = [
    ['Wedding', "Venue for my sister's wedding in Feb 2027, about 250 guests, 2 nights"],
    ['Room booking', 'Is a villa free 14-16 Nov for 2 adults and a child?'],
    ['Corporate offsite', 'Team of 45 wants a January offsite with a conference hall'],
  ];
  const results = [];
  try {
    for (const [category, message] of fixtures) {
      const a = await analyzeEnquiry({ name: 'Synthetic Demo', message }, { apiKey, model });
      results.push({
        expected: category,
        category: a.category,
        provider: a.provider,
        extracted: a.extracted,
        state: a.state,
        confidence: a.confidence,
      });
      assert.equal(a.provider, 'gemini', `Gemini unavailable: ${a.reason}`);
      assert.equal(
        a.category,
        category,
        `Expected ${category}; received ${a.category}: ${JSON.stringify({ extracted: a.extracted, reason: a.reason, confidence: a.confidence })}`,
      );
    }
    await writeFile(
      'outputs/gemini-live-check.json',
      JSON.stringify(
        { verified: true, model, verifiedAt: new Date().toISOString(), results },
        null,
        2,
      ),
    );
    console.log(
      `PASS: 3 live synthetic enquiries classified with ${model}. API key is never printed.`,
    );
  } catch (error) {
    await writeFile(
      'outputs/gemini-live-check.json',
      JSON.stringify(
        { verified: false, model, reason: 'Live fixture verification failed.', results },
        null,
        2,
      ),
    );
    console.error(error.message);
    process.exitCode = 1;
  }
}
