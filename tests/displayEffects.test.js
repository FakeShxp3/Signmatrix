import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas, ImageData, loadImage } from '@napi-rs/canvas';
import gifenc from 'gifenc';
const { GIFEncoder } = gifenc;
import { parseGIF, decompressFrames } from 'gifuct-js';
import { addNoise, normalizeEffects, renderDisplay } from '../src/utils/displayEffects.js';
import { renderSign } from '../src/utils/renderSign.js';

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

test('zero noise preserves every pixel; seeded colour noise is reproducible', () => {
    const original = pixels(sample());
    assert.deepEqual(addNoise(original.slice(), options()), original);
    const noise = options({ noiseAmount: '60', noiseCoverage: '80', noiseColors: '#ff0000,#0000ff' });
    const a = addNoise(original.slice(), noise);
    assert.deepEqual(a, addNoise(original.slice(), noise));
    assert.notDeepEqual(a, original);
    assert.notDeepEqual(a, addNoise(original.slice(), { ...noise, noiseSeed: 2 }));
    assert.notDeepEqual(a, addNoise(original.slice(), noise, 1));
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
