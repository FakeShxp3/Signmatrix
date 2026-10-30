import test from 'node:test';
import assert from 'node:assert/strict';
import { FONT_COVERAGE } from '../src/data/fontCoverage.js';
import { preparePunctuation } from '../src/utils/punctuation.js';
import { buildApiUrl } from '../src/utils/signUtils.js';
import { PRESETS } from '../src/data/presets.js';

// Independent reader for the backend's four-bit column protocol (Layout.kt).
// A hair space resets Y; consecutive custom chunks stack vertically, not horizontally.
function readColumns(encoded, height) {
    const points = [];
    let x = 0;
    let y = 0;
    for (let i = 0; i < encoded.length; i++) {
        assert.equal(encoded[i], '\\', 'fallback must contain only supported escapes');
        const code = encoded[++i];
        if (code === 'g') {
            const bits = parseInt(encoded[++i], 16);
            assert.ok(Number.isInteger(bits));
            for (let bit = 0; bit < 4; bit++) {
                if (bits & (1 << bit)) {
                    assert.ok(y + bit < height, 'no lit pixels clipped below font baseline');
                    points.push([x, y + bit]);
                }
            }
            y += 4;
        } else if (code === '1') {
            x++;
            y = 0;
        } else if (code === '~') {
            x--;
        } else assert.fail(`unexpected escape: ${code}`);
    }
    return points;
}

test('every catalogued missing punctuation glyph produces visible, in-bounds columns', () => {
    let count = 0;
    for (const [name, font] of Object.entries(FONT_COVERAGE)) {
        for (const char of font.missing) {
            const input = char === '\\' ? '\\\\' : char;
            const output = preparePunctuation(input, name);
            assert.notEqual(output.text, input, `${name}: ${char} must have a fallback`);
            assert.ok(readColumns(output.text, font.height).length > 0, `${name}: ${char} must light LEDs`);
            count++;
        }
    }
    assert.ok(count > 250);
});

test('native punctuation is unchanged in every font, including supported 16t period', () => {
    for (const [name, font] of Object.entries(FONT_COVERAGE)) {
        for (const char of '.,:;!?\'"()-/&') {
            if (!font.missing.includes(char)) {
                assert.deepEqual(preparePunctuation(char, name, '3'), { text: char, spacing: '3' });
            }
        }
    }
    assert.equal(preparePunctuation('A.B', '16t').text, 'A.B');
    assert.match(preparePunctuation('A,B', '16t').text, /^A\\g/);
});

test('periods sit on the baseline and commas have a distinct descending tail', () => {
    assert.deepEqual(readColumns(preparePunctuation('.', 'balios7').text, 7), [[0, 6]]);
    assert.deepEqual(readColumns(preparePunctuation(',', 'balios7').text, 7), [[0, 6], [1, 5]]);
    for (const name of ['balios8', 'balios10', 'balios12', 'balios14', 'balios16']) {
        const height = FONT_COVERAGE[name].height;
        const points = readColumns(preparePunctuation('.', name).text, height);
        assert.equal(Math.max(...points.map(([, y]) => y)), height - 1);
    }
});

test('letter spacing moves whole punctuation glyphs without breaking their columns', () => {
    const a = readColumns(preparePunctuation('..', 'balios16', '0').text, 16);
    for (const amount of [-1, 2, 5, 101]) {
        const output = preparePunctuation('..', 'balios16', String(amount));
        assert.equal(output.spacing, '0');
        const b = readColumns(output.text, 16);
        assert.equal(a.length, b.length);
        const half = a.length / 2;
        assert.deepEqual(b.slice(0, half), a.slice(0, half));
        assert.deepEqual(b.slice(half), a.slice(half).map(([x, y]) => [x + amount, y]));
    }
});

test('mixed font segments keep their boundaries and tracking on unchanged segments', () => {
    const output = preparePunctuation('A.B^C,D^E.F', '7d^balios7^16d', '2');
    const parts = output.text.split('^');
    assert.equal(parts.length, 3);
    assert.equal(parts[0], 'A\\1\\1.\\1\\1B');
    assert.match(parts[1], /^C\\1\\1\\g/);
    assert.equal(parts[2], 'E\\1\\1.\\1\\1F');
    assert.equal(output.spacing, '0');
    assert.equal(preparePunctuation('.^.', 'balios7^', '0', '15d').text.split('^')[1], '.');
    assert.match(preparePunctuation('.^.', 'balios7').text.split('^')[1], /^\\g/);
});

test('smart quotes, dashes and ellipses convert to printable equivalents', () => {
    assert.equal(preparePunctuation('“ST. JOHN’S”—WAIT…', '7d').text, '"ST. JOHN\'S"-WAIT...');
    const output = preparePunctuation('…', 'balios7', '1');
    assert.equal(readColumns(output.text, 7).length, 3);
});

test('manual spacing, escaped punctuation and custom artwork remain usable', () => {
    const raw = 'A\\1B\\~C\\g1\\g2\\1D\\sE\\\\F\\!';
    assert.deepEqual(preparePunctuation(raw, '7d', '0'), { text: raw, spacing: '0' });
    const modified = preparePunctuation(raw + '.', 'balios7', '0').text;
    assert.ok(modified.startsWith('A\\1B\\~C\\g1\\g2\\1D\\sE'));
    assert.match(modified, /\\g/);
    assert.ok(!modified.endsWith('.'));
    assert.equal(preparePunctuation('A\\1.B', 'balios7', '2').text.startsWith('A\\1\\g'), true);
});

const frame = (text, font) => ({
    ...PRESETS[0].frames[0], line1: text, line1Font: font, line1Spacing: '2',
    line2: 'ST.,', line2Font: 'init8', line2Spacing: '1',
    line1Color: 'ff0000^00ff00', animation: 'SCROLL', delay: '1200',
});
const state = () => ({
    ...PRESETS[0], previewMode: 'all', route: '1,2', routeFont: 'balios16',
    routeSuffix: '.', routeSuffixFont: 'init8',
    frames: [frame('ST.,^RD.', 'balios7^7d'), frame('RD.', '7d')],
    prFrames: [frame('HELLO!', 'balios7')],
});

test('API integration fixes all text fields and preserves frames, colours and animation', () => {
    const input = state();
    const before = structuredClone(input);
    const query = new URL(buildApiUrl(input)).searchParams;
    for (const key of ['route', 'routeSuffix', 'line1', 'line2', 'prLine1', 'prLine2']) {
        assert.match(query.get(key), /\\g/, key);
    }
    assert.equal(query.get('line1').split('|').length, 2);
    assert.equal(query.get('line1').split('|')[1], 'RD.');
    assert.equal(query.get('line1Spacing'), '0|2');
    assert.equal(query.get('line1Font'), 'balios7^7d|7d');
    assert.equal(query.get('line1Color'), 'ff0000^00ff00|ff0000^00ff00');
    assert.equal(query.get('animation'), 'SCROLL|SCROLL');
    assert.equal(query.get('delay'), '1200|1200');
    assert.deepEqual(input, before, 'editable state and shared links keep original text');
});

test('single-frame and PR previews get the same fallback treatment as the full sign', () => {
    const input = state();
    const all = new URL(buildApiUrl(input)).searchParams;
    const single = new URL(buildApiUrl({ ...input, previewMode: '0' })).searchParams;
    assert.equal(single.get('line1'), all.get('line1').split('|')[0]);
    const pr = new URL(buildApiUrl({ ...input, previewMode: 'pr-0' })).searchParams;
    assert.equal(pr.get('line1'), all.get('prLine1'));
    assert.equal(pr.get('route'), null);
    assert.equal(pr.get('prLine1'), null);
});
