import { renderSign } from './renderSign.js';

self.onmessage = async ({ data: { blob, options } }) => {
    try {
        const rendered = await renderSign(blob, options, progress => self.postMessage({ progress }));
        self.postMessage({ blob: rendered });
    } catch (error) {
        self.postMessage({ error: error.message || 'Unable to render this sign.' });
    }
};
