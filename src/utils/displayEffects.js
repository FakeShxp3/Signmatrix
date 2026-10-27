export const DEFAULT_EFFECTS = Object.freeze({
    noiseAmount: '0',
    noiseCoverage: '35',
    noiseColors: '#ff9000,#ff3050,#4080ff',
    noiseSeed: '1',
    glowAmount: '0',
    glowRadius: '5',
});

export const clampNumber = (value, min, max, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

export const parseNoiseColors = (value) => {
    const colors = String(value ?? '').split(',').filter(color => /^#[\da-f]{6}$/i.test(color)).slice(0, 6);
    return colors.length ? colors : ['#ff9000'];
};

export const normalizeEffects = (state) => ({
    noiseAmount: clampNumber(state.noiseAmount, 0, 100, 0),
    noiseCoverage: clampNumber(state.noiseCoverage, 0, 100, 35),
    noiseColors: parseNoiseColors(state.noiseColors),
    noiseSeed: clampNumber(state.noiseSeed, 1, 2147483647, 1),
    glowAmount: clampNumber(state.glowAmount, 0, 100, 0),
    glowRadius: clampNumber(state.glowRadius, 1, 20, 5),
    ledShape: state.ledShape === 'square' ? 'square' : 'round',
    ledSize: Math.round(clampNumber(state.ledSize, 1, 20, 4)),
    ledGap: Math.round(clampNumber(state.ledGap, 0, 20, 1)),
    offColor: /^#?[\da-f]{6}$/i.test(state.offColor) ? state.offColor.replace('#', '') : '404040',
});

const rgb = (hex) => [0, 2, 4].map(offset => parseInt(hex.replace('#', '').slice(offset, offset + 2), 16));

// A seeded pattern keeps preview/export identical and avoids flickering on unrelated edits.
export function addNoise(pixels, options, frameIndex = 0) {
    if (!options.noiseAmount || !options.noiseCoverage) return pixels;
    const colors = options.noiseColors.map(rgb);
    let seed = (options.noiseSeed + Math.imul(frameIndex, 104729)) >>> 0;
    const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
    };
    const amount = options.noiseAmount / 100;
    for (let i = 0; i < pixels.length; i += 4) {
        if (random() >= options.noiseCoverage / 100 || !pixels[i + 3]) continue;
        const color = colors[Math.floor(random() * colors.length)];
        const mix = amount * (0.15 + random() * 0.6);
        for (let channel = 0; channel < 3; channel++) {
            pixels[i + channel] = Math.round(pixels[i + channel] * (1 - mix) + color[channel] * mix);
        }
    }
    return pixels;
}

export function renderDisplay(source, options, frameIndex = 0) {
    const { width, height } = source;
    const output = new OffscreenCanvas(width, height);
    const context = output.getContext('2d', { willReadFrequently: true });
    const light = new OffscreenCanvas(width, height);
    const lightContext = light.getContext('2d');
    context.fillStyle = '#000000';
    context.fillRect(0, 0, width, height);
    if (options.ledShape === 'square') context.drawImage(source, 0, 0);

    const sourceData = source.getContext('2d').getImageData(0, 0, width, height).data;
    const off = rgb(options.offColor);
    const size = options.ledSize;
    const pitch = size + options.ledGap;
    // The Signmatrix backend has a four-pixel border; sample one colour per LED.
    for (let y = 4; y + size <= height - 4; y += pitch) {
        for (let x = 4; x + size <= width - 4; x += pitch) {
            const index = (Math.floor(y + size / 2) * width + Math.floor(x + size / 2)) * 4;
            const color = Array.from(sourceData.slice(index, index + 3));
            const isLit = color.some((value, channel) => Math.abs(value - off[channel]) > 3)
                && color.some(value => value > 0);
            const drawDot = (ctx) => {
                ctx.fillStyle = `rgb(${color.join(',')})`;
                if (options.ledShape === 'round') {
                    ctx.beginPath();
                    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
                    ctx.fill();
                } else ctx.fillRect(x, y, size, size);
            };
            if (options.ledShape === 'round') drawDot(context);
            if (options.glowAmount && isLit) drawDot(lightContext);
        }
    }

    if (options.glowAmount) {
        // Bloom only lit LEDs, preserving individual route/line colours.
        context.save();
        context.globalCompositeOperation = 'screen';
        context.globalAlpha = options.glowAmount / 100;
        context.filter = `blur(${options.glowRadius}px)`;
        context.drawImage(light, 0, 0);
        context.globalAlpha *= 0.6;
        context.filter = `blur(${Math.max(0.5, options.glowRadius / 3)}px)`;
        context.drawImage(light, 0, 0);
        context.restore();
    }

    if (options.noiseAmount) {
        const image = context.getImageData(0, 0, width, height);
        addNoise(image.data, options, frameIndex);
        context.putImageData(image, 0, 0);
    }
    return output;
}
