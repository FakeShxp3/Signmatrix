import { useEffect, useRef, useState } from 'react';
import { buildApiUrl } from '../utils/signUtils.js';
import { normalizeEffects } from '../utils/displayEffects.js';

export default function useRenderedSign(state) {
    const apiUrl = buildApiUrl(state);
    const effects = normalizeEffects(state);
    const options = JSON.stringify({
        ...effects,
        ...(effects.transparentBackground ? { sourceOffColor: new URL(apiUrl).searchParams.get('offColor') } : {}),
    });
    const [attempt, setAttempt] = useState(0);
    const key = `${apiUrl}|${options}|${attempt}`;
    const cache = useRef(null);
    const [result, setResult] = useState({ key: '', url: '', blob: null, error: '', progress: 0 });

    useEffect(() => {
        const controller = new AbortController();
        let worker;
        let objectUrl;
        let cancelled = false;
        const fail = error => {
            if (!cancelled) setResult({ key, url: '', blob: null, error: error.message, progress: 0 });
        };
        const render = async () => {
            try {
                let blob = cache.current?.url === apiUrl ? cache.current.blob : null;
                if (!blob) {
                    const response = await fetch(apiUrl, { signal: controller.signal });
                    if (!response.ok) throw new Error(`Sign service returned ${response.status}. Please try again.`);
                    blob = await response.blob();
                    if (!blob.type.startsWith('image/')) throw new Error('The sign service did not return an image. Check your text and font settings.');
                    cache.current = { url: apiUrl, blob };
                }
                if (cancelled) return;
                worker = new Worker(new URL('../utils/renderSign.worker.js', import.meta.url), { type: 'module' });
                worker.onmessage = ({ data }) => {
                    if (cancelled) return;
                    if (data.error) {
                        fail(new Error(data.error));
                        worker.terminate();
                    } else if (data.blob) {
                        objectUrl = URL.createObjectURL(data.blob);
                        setResult({ key, url: objectUrl, blob: data.blob, error: '', progress: 100 });
                        worker.terminate();
                    } else setResult({ key, url: '', blob: null, error: '', progress: data.progress });
                };
                worker.onerror = () => {
                    fail(new Error('Display rendering failed. Try a smaller sign or a browser with OffscreenCanvas support.'));
                    worker.terminate();
                };
                worker.postMessage({ blob, options: JSON.parse(options) });
            } catch (error) {
                fail(error);
            }
        };
        render();
        return () => {
            cancelled = true;
            controller.abort();
            worker?.terminate();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [apiUrl, options, key]);

    const current = result.key === key;
    return {
        url: current ? result.url : '',
        blob: current ? result.blob : null,
        error: current ? result.error : '',
        progress: current ? result.progress : 0,
        retry: () => setAttempt(value => value + 1),
        loading: !current || (!result.blob && !result.error),
    };
}
