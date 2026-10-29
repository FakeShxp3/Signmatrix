import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas, ImageData, loadImage } from '@napi-rs/canvas';
import gifenc from 'gifenc';
const { GIFEncoder } = gifenc;
import { parseGIF, decompressFrames } from 'gifuct-js';
import { DEFAULT_EFFECTS, REFERENCE_EFFECTS, normalizeEffects, renderDisplay } from '../src/utils/displayEffects.js';
import { renderSign } from '../src/utils/renderSign.js';
import { buildApiUrl, chooseBackgroundKey } from '../src/utils/signUtils.js';
import { PRESETS } from '../src/data/presets.js';

// Exercise the real render pipeline with a native Canvas implementation.
// Browser-only worker orchestration is kept out of these pixel/codec tests.
globalThis.OffscreenCanvas = class {
    constructor(width, height) {
        const canvas = createCanvas(width, height);
        canvas.convertToBlob = async () => new Blob([await canvas.encode('png')], { type: 'image/png' });
        return canvas;
    }
};
globalThis.ImageData = ImageData;
globalThis.createImageBitmap = async blob => {
    const image = await loadImage(Buffer.from(await blob.arrayBuffer()));
    image.close = () => {};
    return image;
};

const options = overrides => normalizeEffects({ ledSize: '6', ledGap: '2', offColor: '#404040', ...overrides });
const sample = () => {
    const canvas = createCanvas(30, 22);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 30, 22);
    for (let y = 4; y < 18; y += 8) {
        for (let x = 4; x < 26; x += 8) {
            ctx.fillStyle = x === 12 ? '#ff9000' : '#404040';
            ctx.fillRect(x, y, 6, 6);
        }
    }
    return canvas;
};
const pixels = canvas => canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
const pixel = (canvas, x, y) => Array.from(canvas.getContext('2d').getImageData(x, y, 1, 1).data);

test('effect inputs clamp malformed URL values and cap the palette', () => {
    const value = options({ noiseAmount: '1000', noiseCoverage: 'bad', glowRadius: '-4', noiseColors: 'red,#123abc,garbage,#ff0000' });
    assert.equal(value.noiseAmount, 100);
    assert.equal(value.noiseCoverage, 35);
    assert.equal(value.glowRadius, 1);
    assert.deepEqual(value.noiseColors, ['#123abc', '#ff0000']);
});

test('LED colour noise is reproducible, changes whole cells and leaves the gaps black', () => {
    const noise = options({ ledShape: 'square', noiseAmount: '80', noiseCoverage: '100', noiseColors: '#ff0000,#0000ff' });
    const result = renderDisplay(sample(), noise);
    assert.deepEqual(pixels(result), pixels(renderDisplay(sample(), noise)));
    assert.notDeepEqual(pixels(result), pixels(sample()));
    assert.notDeepEqual(pixels(result), pixels(renderDisplay(sample(), { ...noise, noiseSeed: 2 })));
    assert.deepEqual(pixel(result, 13, 5), pixel(result, 16, 8));
    assert.deepEqual(pixel(result, 11, 7), [0, 0, 0, 255]);
    assert.deepEqual(pixel(result, 0, 0), [0, 0, 0, 255]);
    assert.deepEqual(pixels(renderDisplay(sample(), { ...noise, noiseCoverage: 0 })), pixels(sample()));
    assert.deepEqual(pixels(renderDisplay(sample(), { ...noise, noiseAmount: 0 })), pixels(sample()));
});

test('round LEDs remove corners while retaining lit centres and dimensions', () => {
    const result = renderDisplay(sample(), options());
    assert.equal(result.width, 30);
    assert.equal(result.height, 22);
    assert.deepEqual(pixel(result, 15, 7), [255, 144, 0, 255]);
    assert.ok(pixel(result, 12, 4)[0] < 100);
    assert.deepEqual(pixel(result, 0, 0), [0, 0, 0, 255]);
});

test('legacy square shape with zero effects preserves the image', () => {
    const source = sample();
    assert.deepEqual(pixels(renderDisplay(source, options({ ledShape: 'square' }))), pixels(source));
});

test('glow spreads coloured light into gaps but leaves an all-unlit display unchanged', () => {
    const plain = renderDisplay(sample(), options());
    const glow = renderDisplay(sample(), options({ glowAmount: '100', glowRadius: '3' }));
    assert.ok(pixel(glow, 11, 7)[0] > pixel(plain, 11, 7)[0]);
    assert.equal(pixel(glow, 11, 7)[2], 0);
    const dark = sample();
    const ctx = dark.getContext('2d');
    ctx.fillStyle = '#404040';
    ctx.fillRect(12, 4, 6, 6);
    ctx.fillRect(12, 12, 6, 6);
    assert.deepEqual(pixels(renderDisplay(dark, options({ glowAmount: '100' }))), pixels(renderDisplay(dark, options())));
});

test('PNG export contains the actual rendered effects', async () => {
    const source = new Blob([await sample().encode('png')], { type: 'image/png' });
    const settings = options({ noiseAmount: '45', glowAmount: '50' });
    const blob = await renderSign(source, settings);
    assert.equal(blob.type, 'image/png');
    const bitmap = await createImageBitmap(blob);
    const canvas = createCanvas(bitmap.width, bitmap.height);
    canvas.getContext('2d').drawImage(bitmap, 0, 0);
    assert.deepEqual(pixels(canvas), pixels(renderDisplay(sample(), settings)));
});

test('animated export retains frame count, delays, looping and independent frames', async () => {
    const encoder = GIFEncoder();
    const palette = [[0, 0, 0], [255, 144, 0], [64, 64, 64], [255, 0, 0]];
    const first = new Uint8Array(30 * 22);
    const second = first.slice();
    for (let y = 4; y < 10; y++) for (let x = 12; x < 18; x++) {
        first[y * 30 + x] = 1;
        second[y * 30 + x] = 3;
    }
    encoder.writeFrame(first, 30, 22, { palette, delay: 120, repeat: 3 });
    encoder.writeFrame(second, 30, 22, { palette, delay: 360 });
    encoder.finish();
    const progress = [];
    const output = await renderSign(new Blob([encoder.bytes()], { type: 'image/gif' }), options({ noiseAmount: '10', glowAmount: '40' }), value => progress.push(value));
    assert.equal(output.type, 'image/gif');
    const parsed = parseGIF(await output.arrayBuffer());
    const frames = decompressFrames(parsed, true);
    assert.equal(frames.length, 2);
    assert.deepEqual(frames.map(frame => frame.delay), [120, 360]);
    assert.deepEqual(progress, [50, 100]);
    assert.equal(parsed.frames.find(frame => frame.application)?.application.blocks[1], 3);
    assert.notDeepEqual(frames[0].patch, frames[1].patch);
});

test('invalid images fail rather than exporting a broken file', async () => {
    await assert.rejects(() => renderSign(new Blob(['backend error'], { type: 'image/png' }), options()));
});

test('GIF transparent patches honour restore-to-background and restore-to-previous disposal', async () => {
    for (const disposal of [2, 3]) {
        const encoder = GIFEncoder();
        const palette = [[0, 0, 0], [255, 144, 0], [255, 0, 0], [0, 0, 255]];
        for (let frame = 0; frame < 3; frame++) {
            const data = new Uint8Array(30 * 22);
            const left = 4 + frame * 8;
            for (let y = 4; y < 10; y++) for (let x = left; x < left + 6; x++) data[y * 30 + x] = frame + 1;
            encoder.writeFrame(data, 30, 22, { palette, delay: 100, repeat: 0, transparent: frame > 0, transparentIndex: 0, dispose: frame === 1 ? disposal : 1 });
        }
        encoder.finish();
        const output = await renderSign(new Blob([encoder.bytes()], { type: 'image/gif' }), options());
        const frames = decompressFrames(parseGIF(await output.arrayBuffer()), true);
        const at = x => Array.from(frames[2].patch.slice((7 * 30 + x) * 4, (7 * 30 + x) * 4 + 3));
        assert.deepEqual(at(7), disposal === 3 ? [255, 144, 0] : [0, 0, 0]);
        assert.deepEqual(at(15), [0, 0, 0]);
        assert.deepEqual(at(23), [0, 0, 255]);
    }
});

test('square display without effects returns the source file byte-for-byte', async () => {
    const original = new Blob([await sample().encode('png')], { type: 'image/png' });
    assert.equal(await renderSign(original, options({ ledShape: 'square' })), original);
});

test('transparency flags are explicit and the reference preset does not change output mode', () => {
    assert.equal(options({ transparentBackground: 'false' }).transparentBackground, false);
    assert.equal(options({ transparentBackground: 'true' }).transparentBackground, true);
    assert.equal(options({ transparentBackground: 'yes' }).transparentBackground, false);
    const saved = { ...DEFAULT_EFFECTS, ...REFERENCE_EFFECTS, transparentBackground: 'true' };
    const restored = options(Object.fromEntries(new URLSearchParams(saved)));
    assert.equal(restored.transparentBackground, true);
    assert.equal(restored.cameraSoftness, Number(REFERENCE_EFFECTS.cameraSoftness));
    assert.equal(restored.noiseAmount, Number(REFERENCE_EFFECTS.noiseAmount));
    assert.equal(REFERENCE_EFFECTS.transparentBackground, undefined);
    assert.equal(options({ cameraSoftness: 30 }).cameraSoftness, 1.5);
});

test('text-only output removes border, gaps and unlit LEDs for both shapes', () => {
    for (const ledShape of ['square', 'round']) {
        const result = renderDisplay(sample(), options({ ledShape, transparentBackground: 'true', noiseAmount: '60', noiseCoverage: '100' }));
        assert.equal(result.width, 30);
        assert.equal(result.height, 22);
        assert.equal(pixel(result, 0, 0)[3], 0);
        assert.equal(pixel(result, 7, 7)[3], 0);
        assert.equal(pixel(result, 11, 7)[3], 0);
        assert.equal(pixel(result, 15, 7)[3], 255);
    }
});

test('keyed background removal preserves black text and text matching the original off colour', () => {
    const source = sample();
    const ctx = source.getContext('2d');
    ctx.fillStyle = '#0000ff';
    for (let y = 4; y < 18; y += 8) for (let x = 4; x < 26; x += 8) ctx.fillRect(x, y, 6, 6);
    ctx.fillStyle = '#000000'; ctx.fillRect(12, 4, 6, 6);
    ctx.fillStyle = '#404040'; ctx.fillRect(12, 12, 6, 6);
    const settings = { ...options({ transparentBackground: true }), sourceOffColor: '0000ff' };
    const output = renderDisplay(source, settings);
    assert.deepEqual(pixel(output, 15, 7), [0, 0, 0, 255]);
    assert.deepEqual(pixel(output, 15, 15), [64, 64, 64, 255]);
    assert.equal(pixel(output, 7, 7)[3], 0);
});

test('transparent PNG export retains soft alpha, glow and no black matte', async () => {
    const source = new Blob([await sample().encode('png')], { type: 'image/png' });
    const blob = await renderSign(source, options({ ledShape: 'square', transparentBackground: true, glowAmount: '80', glowRadius: '2', cameraSoftness: '0.4' }));
    assert.equal(blob.type, 'image/png');
    const bitmap = await createImageBitmap(blob);
    const result = createCanvas(bitmap.width, bitmap.height);
    result.getContext('2d').drawImage(bitmap, 0, 0);
    assert.equal(pixel(result, 0, 0)[3], 0);
    const edge = pixel(result, 11, 7);
    assert.ok(edge[3] > 0 && edge[3] < 255, 'soft halo has partial alpha');
    assert.ok(edge[0] > 200 && edge[1] > 80, 'halo retains its amber colour, not a black matte');
    assert.ok(pixel(result, 15, 7)[3] > 240);
});

test('transparent animated GIF clears old text, exports empty frames and preserves timing', async () => {
    const encoder = GIFEncoder();
    const palette = [[0, 0, 255], [255, 144, 0], [0, 0, 0]];
    for (let frame = 0; frame < 3; frame++) {
        const data = new Uint8Array(30 * 22);
        if (frame < 2) {
            const left = 4 + frame * 8;
            for (let y = 4; y < 10; y++) for (let x = left; x < left + 6; x++) data[y * 30 + x] = frame + 1;
        }
        encoder.writeFrame(data, 30, 22, { palette, delay: (frame + 1) * 110, repeat: 2 });
    }
    encoder.finish();
    const settings = { ...options({ ledShape: 'square', transparentBackground: true }), sourceOffColor: '0000ff' };
    const result = await renderSign(new Blob([encoder.bytes()], { type: 'image/gif' }), settings);
    const parsed = parseGIF(await result.arrayBuffer());
    const frames = decompressFrames(parsed, true);
    assert.deepEqual(frames.map(frame => frame.delay), [110, 220, 330]);
    assert.equal(parsed.frames.find(frame => frame.application)?.application.blocks[1], 2);
    assert.ok(frames.every(frame => frame.transparentIndex === 0 && frame.disposalType === 2));
    assert.equal(frames[0].patch[(7 * 30 + 7) * 4 + 3], 255);
    assert.equal(frames[1].patch[(7 * 30 + 7) * 4 + 3], 0, 'previous text is cleared');
    assert.deepEqual(Array.from(frames[1].patch.slice((7 * 30 + 15) * 4, (7 * 30 + 15) * 4 + 4)), [0, 0, 0, 255], 'black text remains opaque');
    assert.ok(frames[2].patch.every((value, index) => index % 4 !== 3 || value === 0), 'blank animation frame is transparent');
});

test('background key avoids every active text colour, including inline and PR colours', () => {
    const state = {
        ...PRESETS[0], previewMode: 'all', transparentBackground: 'true',
        routeColor: '#0000ff', routeSuffixColor: '#ff00ff',
        frames: [{ ...PRESETS[0].frames[0], line1Color: '#00ff00^#ffff00', line2Color: '#00ffff' }],
        prFrames: [{ ...PRESETS[0].frames[0], line1Color: '#ffffff', line2Color: '#ff0000' }],
    };
    const opaque = new URL(buildApiUrl({ ...state, transparentBackground: 'false' })).searchParams;
    const transparent = new URL(buildApiUrl(state)).searchParams;
    assert.equal(opaque.get('offColor'), '404040');
    assert.equal(transparent.get('offColor'), chooseBackgroundKey(opaque));
    assert.ok(!['000000', '0000ff', 'ff00ff', '00ff00', 'ffff00', '00ffff', 'ffffff', 'ff0000', 'ff9000'].includes(transparent.get('offColor')));
    for (const [key, value] of opaque) if (key !== 'offColor') assert.equal(transparent.get(key), value);
});
