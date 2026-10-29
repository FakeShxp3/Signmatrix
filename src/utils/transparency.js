import * as gifenc from 'gifenc';
const { quantize, applyPalette } = gifenc.default?.GIFEncoder ? gifenc.default : gifenc;

export function encodeGifPixels(pixels, transparent) {
    if (!transparent) {
        const palette = quantize(pixels, 256);
        return { palette, index: applyPalette(pixels, palette), transparent: false, dispose: 1 };
    }
    // GIF supports binary alpha. Reserve a dedicated transparent index so opaque black
    // text is never mistaken for the background, and exclude hidden RGB from quantization.
    const visible = new Uint8ClampedArray(pixels.length);
    let length = 0;
    for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] < 128) continue;
        visible.set(pixels.subarray(i, i + 4), length);
        visible[length + 3] = 255;
        length += 4;
    }
    const colors = length ? quantize(visible.subarray(0, length), 255) : [[0, 0, 0]];
    const mapped = length ? applyPalette(visible.subarray(0, length), colors) : [];
    const index = new Uint8Array(pixels.length / 4);
    for (let pixel = 0, visiblePixel = 0; pixel < index.length; pixel++) {
        if (pixels[pixel * 4 + 3] >= 128) index[pixel] = mapped[visiblePixel++] + 1;
    }
    return { palette: [[0, 0, 0], ...colors], index, transparent: true, transparentIndex: 0, dispose: 2 };
}
