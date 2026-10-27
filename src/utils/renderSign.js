import { parseGIF, decompressFrame } from 'gifuct-js';
import * as gifenc from 'gifenc';
// gifenc publishes different ESM (Vite) and CommonJS (Node tests) entry points.
const { GIFEncoder, quantize, applyPalette } = gifenc.default?.GIFEncoder ? gifenc.default : gifenc;
import { renderDisplay } from './displayEffects.js';

function validateSize(width, height, frames = 1) {
    if (width < 1 || height < 1 || width * height > 4000000 || width * height * frames > 150000000) {
        throw new Error('This sign is too large to process. Reduce the LED size, sign dimensions or animation length.');
    }
}

export async function renderSign(blob, options, onProgress = () => {}) {
    if (options.ledShape === 'square' && !options.glowAmount && (!options.noiseAmount || !options.noiseCoverage)) return blob;
    const buffer = await blob.arrayBuffer();
    const signature = new TextDecoder().decode(buffer.slice(0, 6));
    if (!signature.startsWith('GIF8')) {
        const bitmap = await createImageBitmap(blob);
        try {
            validateSize(bitmap.width, bitmap.height);
            const source = new OffscreenCanvas(bitmap.width, bitmap.height);
            source.getContext('2d').drawImage(bitmap, 0, 0);
            return await renderDisplay(source, options).convertToBlob({ type: 'image/png' });
        } finally {
            bitmap.close();
        }
    }

    const parsed = parseGIF(buffer);
    const frames = parsed.frames.filter(frame => frame.image);
    const { width, height } = parsed.lsd;
    validateSize(width, height, frames.length);
    if (!frames.length) throw new Error('The sign service returned an empty animation.');
    const source = new OffscreenCanvas(width, height);
    const context = source.getContext('2d', { willReadFrequently: true });
    const background = parsed.gct?.[parsed.lsd.backgroundColorIndex] || [0, 0, 0];
    context.fillStyle = `rgb(${background.join(',')})`;
    context.fillRect(0, 0, width, height);
    const encoder = GIFEncoder();
    const loop = parsed.frames.find(frame => frame.application?.id === 'NETSCAPE2.0')?.application?.blocks;
    const repeat = loop?.[0] === 1 ? loop[1] | (loop[2] << 8) : -1;

    for (let index = 0; index < frames.length; index++) {
        const frame = decompressFrame(frames[index], parsed.gct, true);
        const { left, top, width: patchWidth, height: patchHeight } = frame.dims;
        const previous = frame.disposalType === 3 ? context.getImageData(0, 0, width, height) : null;
        const patch = new OffscreenCanvas(patchWidth, patchHeight);
        patch.getContext('2d').putImageData(new ImageData(frame.patch, patchWidth, patchHeight), 0, 0);
        context.drawImage(patch, left, top);
        const result = renderDisplay(source, options, index);
        const pixels = result.getContext('2d').getImageData(0, 0, width, height).data;
        const palette = quantize(pixels, 256);
        encoder.writeFrame(applyPalette(pixels, palette), width, height, {
            palette,
            // Read the original GCE: gifuct-js normalizes zero delays to 100ms.
            delay: (frames[index].gce?.delay ?? 10) * 10,
            repeat,
            dispose: 1,
        });
        if (frame.disposalType === 2) context.fillRect(left, top, patchWidth, patchHeight);
        else if (previous) context.putImageData(previous, 0, 0);
        onProgress(Math.round((index + 1) / frames.length * 100));
    }
    encoder.finish();
    return new Blob([encoder.bytes()], { type: 'image/gif' });
}
