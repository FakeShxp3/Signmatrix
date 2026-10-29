export const DEFAULT_EFFECTS = Object.freeze({
    noiseAmount: '0',
    noiseCoverage: '35',
    noiseColors: '#ff9000,#ff3050,#4080ff',
    noiseSeed: '1',
    glowAmount: '0',
    glowRadius: '5',
    cameraSoftness: '0',
    transparentBackground: 'false',
});

// Only photographic settings: preserve the user's LED shape, text and background choice.
export const REFERENCE_EFFECTS = Object.freeze({
    noiseAmount: '65',
    noiseCoverage: '85',
    noiseColors: '#ffd06a,#e05c38,#586fc4,#619967',
    glowAmount: '20',
    glowRadius: '2',
    cameraSoftness: '0.6',
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
    noiseSeed: Math.round(clampNumber(state.noiseSeed, 1, 2147483647, 1)),
    glowAmount: clampNumber(state.glowAmount, 0, 100, 0),
    glowRadius: clampNumber(state.glowRadius, 1, 20, 5),
    cameraSoftness: clampNumber(state.cameraSoftness, 0, 1.5, 0),
    transparentBackground: state.transparentBackground === true || state.transparentBackground === 'true',
    ledShape: state.ledShape === 'square' ? 'square' : 'round',
    ledSize: Math.round(clampNumber(state.ledSize, 1, 20, 4)),
    ledGap: Math.round(clampNumber(state.ledGap, 0, 20, 1)),
    offColor: /^#?[\da-f]{6}$/i.test(state.offColor) ? state.offColor.replace('#', '') : '404040',
});

const rgb = (hex) => [0, 2, 4].map(offset => parseInt(hex.replace('#', '').slice(offset, offset + 2), 16));

// One colour/brightness variation per physical LED, never random pixels in the gaps.
// The spatial pattern stays fixed across animation frames, as in a photographed panel.
function createLedNoise(options) {
    const palette = options.noiseColors.map(rgb);
    const amount = options.noiseAmount / 100;
    return (color, isLit, column, row) => {
        if (!amount || !options.noiseCoverage) return color;
        let seed = (Math.imul(column + 1, 374761393) ^ Math.imul(row + 1, 668265263) ^ options.noiseSeed) >>> 0;
        const random = () => {
            seed ^= seed << 13;
            seed ^= seed >>> 17;
            seed ^= seed << 5;
            return (seed >>> 0) / 4294967296;
        };
        if (random() >= options.noiseCoverage / 100) return color;
        const tint = palette[Math.floor(random() * palette.length)];
        const brightness = 1 + (random() - 0.5) * amount * (isLit ? 1.15 : 0.8);
        const mix = amount * (0.12 + random() * (isLit ? 0.42 : 0.5));
        // Match the tint's luminance to each unlit LED: coloured sensor variation is
        // visible without turning the black gaps into a layer of multicoloured static.
        const luminance = values => values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
        const tintScale = isLit ? 1 : Math.min(1, luminance(color) / Math.max(1, luminance(tint)));
        return color.map((value, channel) => Math.round(Math.min(255, Math.max(0,
            (value * (1 - mix) + tint[channel] * tintScale * mix) * brightness
        ))));
    };
}

export function renderDisplay(source, options) {
    const { width, height } = source;
    const output = new OffscreenCanvas(width, height);
    const context = output.getContext('2d', { willReadFrequently: true });
    const light = options.glowAmount ? new OffscreenCanvas(width, height) : null;
    const lightContext = light?.getContext('2d');
    if (!options.transparentBackground) {
        context.fillStyle = '#000000';
        context.fillRect(0, 0, width, height);
    }

    const sourceData = source.getContext('2d').getImageData(0, 0, width, height).data;
    const off = rgb(options.sourceOffColor || options.offColor);
    // The temporary key is chosen far from every text colour; tolerate GIF quantization.
    const tolerance = options.sourceOffColor ? 24 : 3;
    const size = options.ledSize;
    const pitch = size + options.ledGap;
    const shade = createLedNoise(options);
    // The Signmatrix backend has a four-pixel border; sample one colour per LED.
    for (let y = 4, row = 0; y + size <= height - 4; y += pitch, row++) {
        for (let x = 4, column = 0; x + size <= width - 4; x += pitch, column++) {
            const index = (Math.floor(y + size / 2) * width + Math.floor(x + size / 2)) * 4;
            const sourceColor = Array.from(sourceData.slice(index, index + 3));
            const isLit = sourceData[index + 3] > 0
                && sourceColor.some((value, channel) => Math.abs(value - off[channel]) > tolerance)
                && (options.sourceOffColor || sourceColor.some(value => value > 0));
            if (options.transparentBackground && !isLit) continue;
            const color = shade(sourceColor, isLit, column, row);
            const drawDot = (ctx) => {
                ctx.fillStyle = `rgb(${color.join(',')})`;
                if (options.ledShape === 'round') {
                    ctx.beginPath();
                    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
                    ctx.fill();
                } else ctx.fillRect(x, y, size, size);
            };
            drawDot(context);
            if (lightContext && isLit) drawDot(lightContext);
        }
    }

    if (light) {
        // Screen compositing also preserves alpha: no opaque black matte behind the glow.
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

    if (options.cameraSoftness) {
        const softened = new OffscreenCanvas(width, height);
        const softContext = softened.getContext('2d');
        if (!options.transparentBackground) {
            softContext.fillStyle = '#000000';
            softContext.fillRect(0, 0, width, height);
        }
        softContext.filter = `blur(${options.cameraSoftness}px)`;
        softContext.drawImage(output, 0, 0);
        return softened;
    }
    return output;
}
