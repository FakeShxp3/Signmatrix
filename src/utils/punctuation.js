import { FONT_COVERAGE } from '../data/fontCoverage.js';

// Original fallback artwork on a seven-row grid. Native glyphs always take priority.
const PATTERNS = {
    '.': ['0', '0', '0', '0', '0', '0', '1'],
    ',': ['00', '00', '00', '00', '00', '01', '10'],
    ':': ['0', '0', '1', '0', '0', '1', '0'],
    ';': ['00', '00', '01', '00', '00', '01', '10'],
    '!': ['1', '1', '1', '1', '1', '0', '1'],
    '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
    "'": ['1', '1', '0', '0', '0', '0', '0'],
    '"': ['101', '101', '000', '000', '000', '000', '000'],
    '(': ['01', '10', '10', '10', '10', '10', '01'],
    ')': ['10', '01', '01', '01', '01', '01', '10'],
    '-': ['000', '000', '000', '111', '000', '000', '000'],
    '/': ['00001', '00001', '00010', '00100', '01000', '10000', '10000'],
    '\\': ['10000', '10000', '01000', '00100', '00010', '00001', '00001'],
    '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
    '+': ['000', '000', '010', '111', '010', '000', '000'],
    '=': ['000', '000', '111', '000', '111', '000', '000'],
    '_': ['000', '000', '000', '000', '000', '000', '111'],
    '[': ['11', '10', '10', '10', '10', '10', '11'],
    ']': ['11', '01', '01', '01', '01', '01', '11'],
    '{': ['001', '010', '010', '100', '010', '010', '001'],
    '}': ['100', '010', '010', '001', '010', '010', '100'],
    '<': ['001', '010', '100', '100', '100', '010', '001'],
    '>': ['100', '010', '001', '001', '001', '010', '100'],
    '*': ['00000', '10101', '01110', '11111', '01110', '10101', '00000'],
    '#': ['01010', '01010', '11111', '01010', '11111', '01010', '01010'],
    '%': ['11001', '11001', '00010', '00100', '01000', '10011', '10011'],
    '$': ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
    '@': ['01110', '10001', '10111', '10101', '10111', '10000', '01110'],
    '`': ['10', '01', '00', '00', '00', '00', '00'],
    '~': ['00000', '00000', '01001', '10110', '00000', '00000', '00000'],
};

const ALIASES = {
    '‘': "'", '’': "'", '‚': ',', '“': '"', '”': '"', '„': '"',
    '‐': '-', '‑': '-', '–': '-', '—': '-', '−': '-', '…': '...',
};

// Axion 7 comma: two dots on each of the bottom three rows, tail shifted left.
const FONT_PATTERNS = {
    balios7: { ',': ['000', '000', '000', '000', '011', '011', '110'] },
};

// Keep the backend's escape language intact, including user-authored custom columns.
function tokenize(text) {
    return Array.from(text.matchAll(/\\g[\da-fA-F]|\\[\s\S]|[\s\S]/g), ([raw]) => {
        const escaped = { '\\s': ' ', '\\1': '\u200a', '\\~': '\u0015', '\\\\': '\\', '\\!': '!' };
        return { raw, char: escaped[raw] ?? (raw.startsWith('\\g') ? String.fromCharCode(0xe000 + parseInt(raw[2], 16)) : raw) };
    });
}

function encodeGlyph(char, font, fontName) {
    const rows = FONT_PATTERNS[fontName]?.[char] ?? PATTERNS[char];
    const scale = Math.max(1, Math.floor(font.height / 7));
    const width = rows[0].length * scale;
    let encoded = '';
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < font.height; y += 4) {
            let bits = 0;
            for (let bit = 0; bit < 4 && y + bit < font.height; bit++) {
                const row = Math.round((y + bit) * 6 / (font.height - 1));
                if (rows[row][Math.floor(x / scale)] === '1') bits |= 1 << bit;
            }
            encoded += `\\g${bits.toString(16)}`;
        }
        // Hair space advances the column and resets the backend's custom Y cursor.
        encoded += '\\1';
    }
    return encoded + '\\1'.repeat(font.advance);
}

function prepareSegment(text, fontName) {
    const font = FONT_COVERAGE[fontName];
    let changed = false;
    const tokens = tokenize(text).flatMap(token => {
        const alias = ALIASES[token.char];
        if (alias) changed = true;
        // Unknown escape sequences belong to the backend; do not reinterpret them.
        if (!alias && Array.from(token.char).length !== 1) return [token];
        return Array.from(alias || token.char).map(char => {
            let raw = alias ? char : token.raw;
            if (font?.missing.includes(char) && PATTERNS[char]) {
                raw = encodeGlyph(char, font, fontName);
                changed = true;
            }
            return { char, raw };
        });
    });
    return { tokens, changed };
}

function spacedText(tokens, spacing) {
    const spacer = (spacing > 0 ? '\\1' : '\\~').repeat(Math.abs(spacing));
    let previousWasText = false;
    return tokens.map(({ char, raw }) => {
        const manual = char === '\u200a' || char === '\u0015';
        const prefix = previousWasText && char !== ' ' && !manual ? spacer : '';
        previousWasText = char !== ' ' && !manual;
        return prefix + raw;
    }).join('');
}

export function preparePunctuation(text = '', fontName = '', spacing = '0', defaultFont = '16d', inline = true) {
    const segments = inline ? text.split('^') : [text];
    const fonts = inline ? fontName.split('^') : [fontName];
    const prepared = segments.map((segment, i) => {
        const requested = (fonts[i] ?? fonts.at(-1)) || defaultFont;
        return prepareSegment(segment, FONT_COVERAGE[requested] ? requested : defaultFont);
    });
    if (!prepared.some(segment => segment.changed)) return { text, spacing };
    // Apply tracking once per original character, never between a fallback's column chunks.
    const amount = /^[+-]?\d+$/.test(String(spacing)) ? Number(spacing) : 0;
    const backendAmount = Number.isInteger(amount) && amount >= -2147483648 && amount <= 2147483647 ? amount : 0;
    return { text: prepared.map(segment => spacedText(segment.tokens, backendAmount)).join('^'), spacing: '0' };
}

export function prepareFramePunctuation(frame) {
    const line1 = preparePunctuation(frame.line1, frame.line1Font, frame.line1Spacing, frame.line2 ? '8d' : '15d');
    const line2 = preparePunctuation(frame.line2, frame.line2Font, frame.line2Spacing);
    return { ...frame, line1: line1.text, line1Spacing: line1.spacing, line2: line2.text, line2Spacing: line2.spacing };
}
