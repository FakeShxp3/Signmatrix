import {track} from '@vercel/analytics'
import { normalizeEffects } from './displayEffects.js';

export const getInitialState = (key, defaultVal) => {
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.has(key)) return params.get(key);
        return defaultVal;
    }
    return defaultVal;
};

// Ask the backend for a distinct unlit colour, rather than deleting the user's actual
// text colour if it happens to match the panel. This needs no second render request.
export function chooseBackgroundKey(query) {
    const used = [[0, 0, 0]];
    for (const [key, value] of query) {
        if (!/color$/i.test(key) || key === 'offColor') continue;
        for (const segment of value.split(/[|^]/)) {
            const hex = segment.trim().replace(/^#/, '');
            if (/^[\da-f]{1,6}$/i.test(hex)) {
                const padded = hex.padStart(6, '0');
                used.push([0, 2, 4].map(offset => parseInt(padded.slice(offset, offset + 2), 16)));
            }
        }
    }
    let best = 'ff00ff';
    let bestDistance = -1;
    for (const r of [0, 85, 170, 255]) for (const g of [0, 85, 170, 255]) for (const b of [0, 85, 170, 255]) {
        const candidate = [r, g, b];
        const distance = Math.min(...used.map(color => Math.max(...color.map((v, i) => Math.abs(v - candidate[i])))));
        if (distance > bestDistance) {
            bestDistance = distance;
            best = candidate.map(value => value.toString(16).padStart(2, '0')).join('');
        }
    }
    return best;
}

export const buildApiUrl = (debouncedState) => {
    const query = new URLSearchParams();
    const hardware = normalizeEffects(debouncedState);

    let targetFrames = debouncedState.frames;
    let targetPrFrames = debouncedState.prFrames;
    let activeRoute = debouncedState.route;
    let activeRouteSuffix = debouncedState.routeSuffix;

    if (debouncedState.previewMode !== "all") {
        if (debouncedState.previewMode.startsWith("pr-")) {
            const prIndex = parseInt(debouncedState.previewMode.split("-")[1], 10);
            if (targetPrFrames[prIndex]) {
                targetFrames = [targetPrFrames[prIndex]];
            }
            targetPrFrames = [];
            activeRoute = "";
            activeRouteSuffix = "";
        } else {
            const frameIndex = parseInt(debouncedState.previewMode, 10);
            if (targetFrames[frameIndex]) {
                targetFrames = [targetFrames[frameIndex]];
            }
            targetPrFrames = [];
        }
    }

    if (activeRoute) query.append("route", activeRoute);
    query.append("routeFont", debouncedState.routeFont);
    query.append("routeColor", (debouncedState.routeColor || "").replace("#", ""));

    query.append("line1", targetFrames.map(f => f.line1).join("|"));
    query.append("line1Font", targetFrames.map(f => f.line1Font).join("|"));
    query.append("line1Color", targetFrames.map(f => f.line1Color || "").join("|"));
    query.append("line1Spacing", targetFrames.map(f => f.line1Spacing).join("|"));

    query.append("line2", targetFrames.map(f => f.line2).join("|"));
    query.append("line2Font", targetFrames.map(f => f.line2Font).join("|"));
    query.append("line2Color", targetFrames.map(f => f.line2Color || "").join("|"));
    query.append("line2Spacing", targetFrames.map(f => f.line2Spacing).join("|"));

    query.append("animation", targetFrames.map(f => f.animation).join("|"));
    query.append("animSpeed", targetFrames.map(f => f.animSpeed).join("|"));
    query.append("delay", targetFrames.map(f => f.delay || "").join("|"));
    if (debouncedState.routeAlign !== "LEFT") query.append("routeAlign", debouncedState.routeAlign);
    query.append("line1Align", targetFrames.map(f => f.line1Align).join("|"));
    query.append("line2Align", targetFrames.map(f => f.line2Align).join("|"));
    query.append("verticalSpacing", targetFrames.map(f => f.verticalSpacing).join("|"));
    // Circular LEDs and camera effects are rendered locally for consistent PNG/GIF output.
    query.append("ledShape", "square");
    query.append("ledSize", hardware.ledSize);
    query.append("ledGap", hardware.ledGap);
    query.append("offColor", debouncedState.offColor.replace("#", ""));



    if (targetPrFrames.length > 0) {
        query.append("prLine1", targetPrFrames.map(f => f.line1).join("|"));
        query.append("prLine1Font", targetPrFrames.map(f => f.line1Font).join("|"));
        query.append("prLine1Color", targetPrFrames.map(f => f.line1Color || "").join("|"))
        query.append("prLine1Spacing", targetPrFrames.map(f => f.line1Spacing).join("|"));

        query.append("prLine2", targetPrFrames.map(f => f.line2).join("|"));
        query.append("prLine2Font", targetPrFrames.map(f => f.line2Font).join("|"));
        query.append("prLine2Color", targetPrFrames.map(f => f.line2Color || "").join("|"));
        query.append("prLine2Spacing", targetPrFrames.map(f => f.line2Spacing).join("|"));

        query.append("prAnimation", targetPrFrames.map(f => f.animation).join("|"));
        query.append("prAnimSpeed", targetPrFrames.map(f => f.animSpeed).join("|"));
        query.append("prDelay", targetPrFrames.map(f => f.delay || "").join("|"));
        query.append("prLine1Align", targetPrFrames.map(f => f.line1Align).join("|"));
        query.append("prLine2Align", targetPrFrames.map(f => f.line2Align).join("|"));
        query.append("prVerticalSpacing", targetPrFrames.map(f => f.verticalSpacing).join("|"));
    }

    query.append("color", debouncedState.color.replace("#", ""));
    query.append("width", debouncedState.width);
    query.append("height", debouncedState.height);
    query.append("speed", debouncedState.speed);
    if (activeRouteSuffix) query.append("routeSuffix", activeRouteSuffix);
    query.append("routeSuffixFont", debouncedState.routeSuffixFont);
    query.append("routeSuffixColor", (debouncedState.routeSuffixColor || "").replace("#", ""));

    if (hardware.transparentBackground) query.set('offColor', chooseBackgroundKey(query));

    //return `http://localhost:8080/api/sign?${query.toString()}`;
    return `https://signmatrix.pythonlmn.xyz/api/sign?${query.toString()}`;
};

export const downloadSign = async (state, setIsDownloading, blob) => {
    let objectUrl;
    try {
        setIsDownloading(true);
        if (!blob || !blob.type.startsWith('image/')) throw new Error('No rendered sign is ready.');
        objectUrl = window.URL.createObjectURL(blob);
        const extension = blob.type === 'image/gif' ? 'gif' : 'png';
        const routeName = (state.route || 'custom').replace(/[^a-z0-9_-]+/gi, '-');
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = `signmatrix-${routeName}.${extension}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        track('Downloaded Sign', { route: state.route, line1: state.frames[0]?.line1 });
    } catch (error) {
        console.error(error);
        alert('Unable to download the sign. Wait for the preview to finish and try again.');
    } finally {
        // Give browsers time to start consuming the object URL.
        if (objectUrl) setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
        setIsDownloading(false);
    }
};
