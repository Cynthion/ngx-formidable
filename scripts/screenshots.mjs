#!/usr/bin/env node
/**
 * Regenerates the images in `assets/`. The README needs pictures because npm renders no live page; everything
 * else is shown live, on the portal itself.
 *
 * - `ladder.png`: the Specimen's ladder, shot once per step with the dropdown beside it open, as a looping APNG.
 * - `studio.png`: a recording of the Studio, pointer and keys included: presets from the library's defaults on,
 *   keyboard focus, label positions and prefixes, a field opened from its chip, Zod catching an email, and the
 *   export, as a looping APNG.
 * - `social-preview.png`: the Studio on the library's defaults at the 1280×640 GitHub asks for, uploaded by hand
 *   under Settings > Social preview.
 *
 * Needs the portal served (`npm start`) and a local Chrome. It drives Chrome over the DevTools protocol with
 * Node's own `WebSocket`, so it adds no dependency. `PORTAL_URL` and `CHROME` override the two defaults.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync, inflateSync } from 'node:zlib';

const assets = join(dirname(fileURLToPath(import.meta.url)), '../assets');
const portalUrl = process.env.PORTAL_URL ?? 'http://localhost:4200/';
const chromePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const LADDER = '[data-shot="ladder"]';
const STEPS = '#ladder .steps .chip';
const DROPDOWN = `${LADDER} formidable-dropdown-field input`;

/**
 * How long each frame is held: the defaults and the finished theme longer than the steps between. The steps are
 * quick, because the image is the overview; the Specimen it links to is where one step is studied.
 */
const HOLD_MS = { first: 1600, step: 700, last: 3200 };

const PRESET_CARDS = '.gallery .card';
const TABS = '[role="tab"]';

/**
 * The library's defaults, then the looks furthest from it, in the gallery's order so the panel scrolls one way and
 * back. The last has a visible field border, so the labels the tour then moves onto it read as such.
 */
const TOUR_PRESETS = ['Enterprise', 'Editorial', 'Brutalist', 'Midnight', 'Consumer'];

/**
 * How long each frame is held. The pointer glides in short frames and rests where it clicks; what a click changed
 * is held long enough to read, and the last frame longest, before the loop starts again.
 */
const STUDIO_HOLD_MS = { glide: 40, rest: 120, open: 500, step: 350, preset: 600, result: 900, last: 3500 };

/**
 * What a screenshot cannot show on its own. A pointer and a key badge, each a popover so it paints over a select's
 * open list, which is in the top layer too. And the Studio's own selects drawn by the page rather than the system,
 * because a screenshot never shows the list a system select opens.
 */
const RECORDING_SETUP = `(() => {
  const style = document.createElement('style');
  style.textContent = \`
    .pc-select, .pc-select::picker(select) { appearance: base-select; }
    .pc-select::picker(select) { border: 1px solid #d0d5dd; border-radius: 8px; box-shadow: 0 8px 24px rgb(0 0 0 / 0.16); }
    .pc-select option { padding: 6px 10px; }
    .pc-select option:hover { background: #e0e7ff; }
    #shot-pointer, #shot-key { inset: auto; margin: 0; border: 0; padding: 0; background: none; overflow: visible; pointer-events: none; }
    #shot-pointer { left: 0; top: 0; width: 26px; height: 26px; }
    #shot-key { left: 430px; bottom: 96px; translate: -50% 0; padding: 8px 16px; border-radius: 8px; background: rgb(17 24 39 / 0.88); color: #fff; font: 600 16px system-ui, sans-serif; }
  \`;
  document.head.append(style);

  const pointer = Object.assign(document.createElement('div'), { id: 'shot-pointer', popover: 'manual' });
  pointer.innerHTML = '<svg width="26" height="26" viewBox="0 0 22 22"><path d="M2 1l6.5 19 2.4-7.4L18 10z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  const key = Object.assign(document.createElement('kbd'), { id: 'shot-key', popover: 'manual' });
  document.body.append(pointer, key);

  // Shown again on every move, so it is the last popover opened and paints over a list that opened after it.
  window.shot = {
    point(x, y) {
      pointer.style.translate = x + 'px ' + y + 'px';
      if (pointer.matches(':popover-open')) pointer.hidePopover();
      pointer.showPopover();
    },
    key(name) {
      key.textContent = name;
      if (key.matches(':popover-open')) key.hidePopover();
      if (name) key.showPopover();
    }
  };
})()`;

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
async function press(page, { x, y }) {
  for (const type of ['mousePressed', 'mouseReleased']) {
    await page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  }
  await sleep(300);
}

async function click(page, selector) {
  await press(
    page,
    await page.evaluate(`(() => {
      const box = document.querySelector('${selector}').getBoundingClientRect();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    })()`)
  );
}

async function pressKey(page, key, code, keyCode) {
  for (const type of ['rawKeyDown', 'keyUp']) {
    await page.send('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: keyCode });
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

async function setViewport(page, width, height, deviceScaleFactor) {
  await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor, mobile: false });
}

async function shootViewport(page) {
  const { data } = await page.send('Page.captureScreenshot', { format: 'png' });

  return Buffer.from(data, 'base64');
}

/** Opens the Studio as a first visit sees it: the Studio keeps its theme and sizes in local storage. */
async function openStudio(page) {
  await page.send('Page.navigate', { url: new URL('#/', portalUrl).href });
  await waitFor(page, TABS);
  await page.evaluate(`localStorage.clear()`);
  await page.send('Page.reload');
  await sleep(500);
  await waitFor(page, PRESET_CARDS);
  await sleep(300);
}

/** Where the first element matching `selector` whose text starts with `text` is, scrolled into view if it is not. */
async function locate(page, selector, text = '') {
  return page.evaluate(`(() => {
    const element = [...document.querySelectorAll(${JSON.stringify(selector)})].find((candidate) =>
      candidate.textContent.trim().startsWith(${JSON.stringify(text)})
    );
    // Clear of the bars pinned over either column, and with room for a list to open.
    const { top, bottom } = element.getBoundingClientRect();
    if (top < 150 || bottom > innerHeight - 120) element.scrollIntoView({ block: 'center' });
    const { x, y, width, height } = element.getBoundingClientRect();
    return { x: x + width / 2, y: y + height / 2 };
  })()`);
}

/**
 * Presets from the library's defaults to Consumer, keyboard focus through the first fields, edits to the form, a
 * field opened from its chip, the validator swapped and caught out, then the export. Every step is a real pointer
 * or key event, filmed as it happens.
 */
async function shootStudioTour(page) {
  const frames = [];
  let at = { x: 1060, y: 420 };
  const shoot = async (holdMs) => frames.push({ png: await shootViewport(page), holdMs });

  /** Glides the pointer there, firing the hover a visitor's would, one short frame per step. */
  const moveTo = async (selector, text) => {
    const to = await locate(page, selector, text);
    const steps = Math.min(8, Math.max(3, Math.round(Math.hypot(to.x - at.x, to.y - at.y) / 90)));

    for (let step = 1; step <= steps; step++) {
      const eased = 1 - (1 - step / steps) ** 2;
      const x = at.x + (to.x - at.x) * eased;
      const y = at.y + (to.y - at.y) * eased;

      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      await page.evaluate(`shot.point(${x}, ${y})`);
      await shoot(step === steps ? STUDIO_HOLD_MS.rest : STUDIO_HOLD_MS.glide);
    }
    at = to;
  };
  const clickOn = async (selector, text, holdMs) => {
    await moveTo(selector, text);
    await press(page, at);
    await sleep(300);
    await page.evaluate(`shot.point(${at.x}, ${at.y})`);
    await shoot(holdMs);
  };
  /** Opens a select's list, rests on the option, and picks it. */
  const pick = async (select, option, holdMs) => {
    await clickOn(select, '', STUDIO_HOLD_MS.open);
    await clickOn(`${select} option`, option, holdMs);
  };
  const tab = async (holdMs) => {
    await page.evaluate(`shot.key('Tab ⇥')`);
    await pressKey(page, 'Tab', 'Tab', 9);
    await shoot(holdMs);
    await page.evaluate(`shot.key('')`);
  };

  await openStudio(page);
  await page.evaluate(RECORDING_SETUP);
  await page.evaluate(
    `[...document.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith('Field Types')).click()`
  );
  await sleep(300);

  // Opens on the library's defaults rather than the Studio's own starting look.
  at = await locate(page, `${PRESET_CARDS} .card-name`, TOUR_PRESETS[0]);
  await press(page, at);
  await page.evaluate(`shot.point(${at.x}, ${at.y})`);
  await shoot(STUDIO_HOLD_MS.result);
  for (const preset of TOUR_PRESETS.slice(1)) {
    await clickOn(`${PRESET_CARDS} .card-name`, preset, STUDIO_HOLD_MS.preset);
  }

  await clickOn('formidable-dropdown-field .input-wrapper', '', STUDIO_HOLD_MS.result);
  for (const _ of ['Size', 'Crust', 'Sauce', 'Toppings']) await tab(STUDIO_HOLD_MS.step);
  await page.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: at.x, y: at.y, deltaX: 0, deltaY: -5000 });

  await clickOn(TABS, 'Form', STUDIO_HOLD_MS.step);
  await clickOn(TABS, 'Settings', STUDIO_HOLD_MS.step);
  await clickOn('button', 'App Defaults', STUDIO_HOLD_MS.step);
  await pick('#ad-labelPosition', 'Border', STUDIO_HOLD_MS.result);

  // A sample prefix shows only while the form's adornments are switched on.
  await clickOn('button', 'The Form', STUDIO_HOLD_MS.step);
  await clickOn('label', 'Adornments', STUDIO_HOLD_MS.step);
  await pick('#ae-prefix', 'Icon', STUDIO_HOLD_MS.result);

  await clickOn('button', 'Field Types', STUDIO_HOLD_MS.result);
  await clickOn('button.chip', 'Dropdown', STUDIO_HOLD_MS.result);
  await pick('#fe-label-position-pizza', 'Outside', STUDIO_HOLD_MS.result);

  await clickOn('button', 'The Form', STUDIO_HOLD_MS.step);
  await pick('#fs-validator', 'Zod', STUDIO_HOLD_MS.step);
  await clickOn('input[name$=".email"]', '', STUDIO_HOLD_MS.step);
  await page.evaluate(`document.querySelector('input[name$=".email"]').select()`);
  for (const text of ['alex.', 'moser@']) {
    await page.send('Input.insertText', { text });
    await sleep(200);
    await shoot(STUDIO_HOLD_MS.step);
  }
  await tab(STUDIO_HOLD_MS.result);

  await clickOn(TABS, 'Export & Import', STUDIO_HOLD_MS.result);
  await clickOn(TABS, 'Template', STUDIO_HOLD_MS.result);
  await clickOn(TABS, 'Schema', STUDIO_HOLD_MS.last);
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

/** The bytes of a non-interlaced 8-bit RGB or RGBA PNG, as Chrome writes one, row after row. */
function decode(png) {
  const chunks = readChunks(png);
  const header = chunks.find((chunk) => chunk.type === 'IHDR').data;
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const bpp = header[9] === 6 ? 4 : 3;
  const stride = width * bpp;
  const raw = inflateSync(Buffer.concat(chunks.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data)));
  const pixels = Buffer.alloc(stride * height);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = y * (stride + 1) + 1;
    const row = y * stride;

    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? pixels[row + i - bpp] : 0;
      const b = y > 0 ? pixels[row - stride + i] : 0;
      const c = i >= bpp && y > 0 ? pixels[row - stride + i - bpp] : 0;
      let predicted = 0;

      if (filter === 1) predicted = a;
      else if (filter === 2) predicted = b;
      else if (filter === 3) predicted = (a + b) >> 1;
      else if (filter === 4) {
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        predicted = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      pixels[row + i] = (raw[line + i] + predicted) & 255;
    }
  }
  return { width, height, bpp, pixels };
}

/** The smallest rectangle outside which two same-sized images are equal, or `null` when they are equal throughout. */
function changedBox(previous, next) {
  const stride = next.width * next.bpp;
  let top = -1;
  let bottom = -1;
  let left = stride;
  let right = -1;

  for (let y = 0; y < next.height; y++) {
    const start = y * stride;

    if (previous.pixels.subarray(start, start + stride).equals(next.pixels.subarray(start, start + stride))) continue;
    if (top < 0) top = y;
    bottom = y;
    for (let i = 0; i < stride; i++) {
      if (previous.pixels[start + i] !== next.pixels[start + i]) {
        left = Math.min(left, i);
        right = Math.max(right, i);
      }
    }
  }
  if (top < 0) return null;

  const x = Math.floor(left / next.bpp);
  return { x, y: top, width: Math.floor(right / next.bpp) - x + 1, height: bottom - top + 1 };
}

/** That rectangle of an image, compressed as PNG image data, every row unfiltered. */
function encodeBox({ width, bpp, pixels }, box) {
  const rowBytes = box.width * bpp;
  const raw = Buffer.alloc((rowBytes + 1) * box.height);

  for (let y = 0; y < box.height; y++) {
    const start = ((box.y + y) * width + box.x) * bpp;
    pixels.copy(raw, y * (rowBytes + 1) + 1, start, start + rowBytes);
  }
  return deflateSync(raw, { level: 9 });
}

/**
 * Joins same-sized PNGs into one looping APNG. The first frame keeps its own compressed image data, and is also
 * the still image a viewer without APNG support shows. Every later frame carries only the rectangle that changed,
 * painted over the one before, and a frame that changed nothing lengthens the one before instead.
 */
function animate(frames) {
  const [first] = frames;
  const firstChunks = readChunks(first.png);
  const header = firstChunks.find((chunk) => chunk.type === 'IHDR').data;

  if (
    frames.some(
      ({ png }) =>
        !readChunks(png)
          .find((chunk) => chunk.type === 'IHDR')
          .data.equals(header)
    )
  ) {
    throw new Error('The frames differ in size or format, so they cannot share one APNG.');
  }

  const u32 = (...values) =>
    Buffer.concat(
      values.map((value) => Buffer.from([value >>> 24, value >>> 16, value >>> 8, value].map((b) => b & 255)))
    );
  const u16 = (...values) => Buffer.concat(values.map((value) => Buffer.from([(value >>> 8) & 255, value & 255])));
  const full = { x: 0, y: 0, width: header.readUInt32BE(0), height: header.readUInt32BE(4) };
  const shown = [
    {
      box: full,
      data: firstChunks.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data),
      holdMs: first.holdMs
    }
  ];
  let previous = decode(first.png);

  for (const { png, holdMs } of frames.slice(1)) {
    const next = decode(png);
    const box = changedBox(previous, next);

    if (box) shown.push({ box, data: [encodeBox(next, box)], holdMs });
    else shown.at(-1).holdMs += holdMs;
    previous = next;
  }

  let sequence = 0;
  const body = shown.flatMap(({ box, data, holdMs }, index) => [
    // Disposed of by leaving it, and blended by replacing what it covers: the next rectangle paints over it.
    writeChunk(
      'fcTL',
      Buffer.concat([u32(sequence++, box.width, box.height, box.x, box.y), u16(holdMs, 1000), Buffer.from([0, 0])])
    ),
    ...data.map((bytes) =>
      index === 0 ? writeChunk('IDAT', bytes) : writeChunk('fdAT', Buffer.concat([u32(sequence++), bytes]))
    )
  ]);
  const beforeImage = firstChunks.slice(
    1,
    firstChunks.findIndex((chunk) => chunk.type === 'IDAT')
  );

  return Buffer.concat([
    first.png.subarray(0, 8),
    writeChunk('IHDR', header),
    writeChunk('acTL', u32(shown.length, 0)),
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

  const write = (name, png, note = '') => {
    writeFileSync(join(assets, name), png);
    console.log(`assets/${name}  ${note}`);
  };

  try {
    await page.send('Page.enable');

    await setViewport(page, 1440, 1400, 2);
    const ladder = await shootLadder(page);
    write('ladder.png', animate(ladder), `${ladder.length} frames`);

    // Light whatever the machine is set to, so a regenerated image does not depend on who ran the script.
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });

    // One device pixel per CSS pixel: the README shows the tour narrower than this anyway, and a frame a preset
    // repaints edge to edge compresses poorly.
    await setViewport(page, 1280, 800, 1);
    const tour = await shootStudioTour(page);
    write('studio.png', animate(tour), `${tour.length} frames`);

    await setViewport(page, 1280, 640, 1);
    await openStudio(page);
    await press(page, await locate(page, `${PRESET_CARDS} .card-name`, TOUR_PRESETS[0]));
    write('social-preview.png', await shootViewport(page));
  } finally {
    page.close();
    chrome.kill();
    await sleep(200);
    rmSync(profile, { recursive: true, force: true });
  }
}

await main();
