#!/usr/bin/env node
/**
 * Regenerates `assets/ladder.png`, the animated image the root `README.md` opens with.
 *
 * It is the Specimen's ladder, shot once per step with the dropdown beside it open and assembled into a looping
 * APNG. The README needs a picture because npm renders no live page; everything else is shown live, on the
 * Specimen itself.
 *
 * Needs the portal served (`npm start`) and a local Chrome. It drives Chrome over the DevTools protocol with
 * Node's own `WebSocket`, so it adds no dependency. `PORTAL_URL` and `CHROME` override the two defaults.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32 } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = join(root, 'assets/ladder.png');
const portalUrl = process.env.PORTAL_URL ?? 'http://localhost:4200/';
const chromePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const LADDER = '[data-shot="ladder"]';
const STEPS = '#ladder .steps .chip';
const DROPDOWN = `${LADDER} formidable-dropdown-field input`;

/** How long each frame is held: the defaults and the finished theme longer than the steps between. */
const HOLD_MS = { first: 1600, step: 1200, last: 3200 };

/** Clears everything behind the ladder, so its rounded corners are transparent on a light and a dark README. */
const TRANSPARENT_CSS = `
  html, body, portal-specimen-page, .content, .scope { background: transparent !important; }
  ${DROPDOWN} { caret-color: transparent; }
`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function launchChrome() {
  const profile = mkdtempSync(join(tmpdir(), 'formidable-shots-'));
  const chrome = spawn(
    chromePath,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--hide-scrollbars',
      '--force-color-profile=srgb',
      'about:blank'
    ],
    { stdio: 'ignore' }
  );

  for (let attempt = 0; attempt < 100; attempt++) {
    await sleep(100);
    try {
      const [port] = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n');
      const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();

      return { chrome, profile, target };
    } catch {
      // Not listening yet.
    }
  }
  chrome.kill();
  throw new Error(`Chrome did not start from ${chromePath}. Set CHROME to its executable.`);
}

async function connect(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  let nextId = 0;

  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve);
    socket.addEventListener('error', reject);
  });
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);

    pending.get(message.id)?.(message);
    pending.delete(message.id);
  });

  const send = (method, params = {}) =>
    Promise.race([
      new Promise((resolve, reject) => {
        const id = ++nextId;

        pending.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
        socket.send(JSON.stringify({ id, method, params }));
      }),
      sleep(15000).then(() => {
        throw new Error(`${method} timed out`);
      })
    ]);

  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });

    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  };

  return { send, evaluate, close: () => socket.close() };
}

/** A real click, so the field sees the same mousedown, mouseup and focus a visitor's would. */
async function click(page, selector) {
  const { x, y } = await page.evaluate(`(() => {
    const box = document.querySelector('${selector}').getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  })()`);

  for (const type of ['mousePressed', 'mouseReleased']) {
    await page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  }
  await sleep(300);
}

/** Polls from Node rather than in the page, because a reload — the dev server's, too — kills an in-page wait. */
async function waitFor(page, selector) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if (await page.evaluate(`!!document.querySelector('${selector}')`)) {
        await page.evaluate(`document.fonts.ready.then(() => true)`);
        return;
      }
    } catch {
      // The document was replaced mid-call.
    }
    await sleep(100);
  }
  throw new Error(`Nothing on the page matched ${selector}.`);
}

/** Steps the ladder from the defaults to the last declaration, one frame per step. */
async function shootLadder(page) {
  await page.send('Page.navigate', { url: new URL('#/specimen', portalUrl).href });
  await waitFor(page, STEPS);
  await page.evaluate(`(() => {
    const style = document.createElement('style');
    style.textContent = ${JSON.stringify(TRANSPARENT_CSS)};
    document.head.append(style);
    document.querySelector('${LADDER}').scrollIntoView({ block: 'center' });
  })()`);
  await page.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  await sleep(300);

  const steps = await page.evaluate(`document.querySelectorAll('${STEPS}').length`);
  const frames = [];

  for (let step = 0; step < steps; step++) {
    await page.evaluate(`document.querySelectorAll('${STEPS}')[${step}].click()`);
    await sleep(300);
    // Choosing a step is a click outside the dropdown, which closes it.
    if ((await page.evaluate(`document.querySelector('${DROPDOWN}').getAttribute('aria-expanded')`)) !== 'true') {
      await click(page, DROPDOWN);
    }
    await sleep(300);

    // Measured per frame, since opening the panel can scroll the page. Its size is fixed, so every frame is the
    // same size, which an APNG requires.
    const clip = await page.evaluate(`(() => {
      const { x, y, width, height } = document.querySelector('${LADDER}').getBoundingClientRect();
      return { x, y, width, height, scale: 1 };
    })()`);
    const { data } = await page.send('Page.captureScreenshot', { format: 'png', clip });

    frames.push({
      png: Buffer.from(data, 'base64'),
      holdMs: step === 0 ? HOLD_MS.first : step === steps - 1 ? HOLD_MS.last : HOLD_MS.step
    });
  }
  return frames;
}

// #region Animated PNG

function readChunks(png) {
  const chunks = [];

  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);

    chunks.push({
      type: png.toString('latin1', offset + 4, offset + 8),
      data: png.subarray(offset + 8, offset + 8 + length)
    });
    offset += 12 + length;
  }
  return chunks;
}

function writeChunk(type, data) {
  const chunk = Buffer.alloc(12 + data.length);

  chunk.writeUInt32BE(data.length, 0);
  chunk.write(type, 4, 'latin1');
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, 8 + data.length)), 8 + data.length);
  return chunk;
}

/**
 * Joins same-sized PNGs into one looping APNG without re-encoding a pixel: every frame keeps its own compressed
 * image data, and only the framing around it is added. The first frame is also the still image a viewer
 * without APNG support shows.
 */
function animate(frames) {
  const decoded = frames.map((frame) => ({ ...frame, chunks: readChunks(frame.png) }));
  const [first] = decoded;
  const header = first.chunks.find((chunk) => chunk.type === 'IHDR').data;

  if (decoded.some(({ chunks }) => !chunks.find((chunk) => chunk.type === 'IHDR').data.equals(header))) {
    throw new Error('The ladder frames differ in size or format, so they cannot share one APNG.');
  }

  const u32 = (...values) =>
    Buffer.concat(
      values.map((value) => Buffer.from([value >>> 24, value >>> 16, value >>> 8, value].map((b) => b & 255)))
    );
  const u16 = (...values) => Buffer.concat(values.map((value) => Buffer.from([(value >>> 8) & 255, value & 255])));
  const beforeImage = first.chunks.slice(
    1,
    first.chunks.findIndex((chunk) => chunk.type === 'IDAT')
  );
  let sequence = 0;

  const body = decoded.flatMap(({ chunks, holdMs }, index) => {
    const control = writeChunk(
      'fcTL',
      Buffer.concat([
        u32(sequence++, header.readUInt32BE(0), header.readUInt32BE(4), 0, 0),
        u16(holdMs, 1000),
        Buffer.from([0, 0])
      ])
    );
    const images = chunks
      .filter((chunk) => chunk.type === 'IDAT')
      .map((chunk) =>
        index === 0 ? writeChunk('IDAT', chunk.data) : writeChunk('fdAT', Buffer.concat([u32(sequence++), chunk.data]))
      );

    return [control, ...images];
  });

  return Buffer.concat([
    first.png.subarray(0, 8),
    writeChunk('IHDR', header),
    writeChunk('acTL', u32(decoded.length, 0)),
    ...beforeImage.map((chunk) => writeChunk(chunk.type, chunk.data)),
    ...body,
    writeChunk('IEND', Buffer.alloc(0))
  ]);
}

// #endregion

async function main() {
  try {
    await fetch(portalUrl);
  } catch {
    throw new Error(`The portal is not being served at ${portalUrl}. Run \`npm start\`, or set PORTAL_URL.`);
  }

  const { chrome, profile, target } = await launchChrome();
  const page = await connect(target.webSocketDebuggerUrl);

  try {
    await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 1400,
      deviceScaleFactor: 2,
      mobile: false
    });

    const frames = await shootLadder(page);

    writeFileSync(outFile, animate(frames));
    console.log(`assets/ladder.png  ${frames.length} frames`);
  } finally {
    page.close();
    chrome.kill();
    await sleep(200);
    rmSync(profile, { recursive: true, force: true });
  }
}

await main();
