import { useEffect } from 'react';
import { DEFAULT_EFFECTS } from '../utils/displayEffects.js';

function useUrlSync(debouncedState) {
    useEffect(() => {
        const params = new URLSearchParams();

        const add = (key, value, defaultVal) => {
            if (value !== defaultVal) params.set(key, value);
        };

        const compress = (arr) => {
            if (arr.every(v => v === arr[0])) return arr[0];
            return arr.join("|");
        };

        add("route", debouncedState.route, "R5");
        add("routeFont", debouncedState.routeFont, "24q");
        add("routeColor", (debouncedState.routeColor || "").replace("#", ""), "");

        add("routeSuffix", debouncedState.routeSuffix, "");
        add("routeSuffixFont", debouncedState.routeSuffixFont, "16d");
        add("routeSuffixColor", (debouncedState.routeSuffixColor || "").replace("#", ""), "");
        add("routeAlign", debouncedState.routeAlign, "LEFT");

        add("color", debouncedState.color, "#FF9000");
        add("offColor", debouncedState.offColor.replace("#", ""), "404040");
        add("width", debouncedState.width, "200");
        add("height", debouncedState.height, "24");
        add("speed", debouncedState.speed, "2500");
        add("ledShape", debouncedState.ledShape, "round");
        add("ledSize", debouncedState.ledSize, "4");
        add("ledGap", debouncedState.ledGap, "1");
        for (const [key, fallback] of Object.entries(DEFAULT_EFFECTS)) {
            add(key, debouncedState[key] ?? fallback, fallback);
        }

        add("line1", compress(debouncedState.frames.map(f => f.line1)), "HASTINGS  ST");
        add("line1Font", compress(debouncedState.frames.map(f => f.line1Font)), "12d");
        add("line1Color", compress(debouncedState.frames.map(f => f.line1Color)), "");
        add("line1Spacing", compress(debouncedState.frames.map(f => f.line1Spacing)), "6");

        add("line2", compress(debouncedState.frames.map(f => f.line2)), "TO KOOTENAY LOOP");
        add("line2Font", compress(debouncedState.frames.map(f => f.line2Font)), "9");
        add("line2Color", compress(debouncedState.frames.map(f => f.line2Color)), "");
        add("line2Spacing", compress(debouncedState.frames.map(f => f.line2Spacing)), "0");

        add("animation", compress(debouncedState.frames.map(f => f.animation)), "NONE");
        add("animSpeed", compress(debouncedState.frames.map(f => f.animSpeed)), "0.25");
        add("delay", compress(debouncedState.frames.map(f => f.delay || "")), "");
        add("line1Align", compress(debouncedState.frames.map(f => f.line1Align)), "CENTRE");
        add("line2Align", compress(debouncedState.frames.map(f => f.line2Align)), "CENTRE");
        add("verticalSpacing", compress(debouncedState.frames.map(f => f.verticalSpacing)), "FLUSH");

        const hasPrText = debouncedState.prFrames.some(f => f.line1.trim() !== "" || f.line2.trim() !== "");
        if (hasPrText) {
            add("prLine1", compress(debouncedState.prFrames.map(f => f.line1)), "");
            add("prLine1Font", compress(debouncedState.prFrames.map(f => f.line1Font)), "12d");
            add("prLine1Color", compress(debouncedState.prFrames.map(f => f.line1Color)), "");
            add("prLine1Spacing", compress(debouncedState.prFrames.map(f => f.line1Spacing)), "6");

            add("prLine2", compress(debouncedState.prFrames.map(f => f.line2)), "");
            add("prLine2Font", compress(debouncedState.prFrames.map(f => f.line2Font)), "9");
            add("prLine2Color", compress(debouncedState.prFrames.map(f => f.line2Color)), "");
            add("prLine2Spacing", compress(debouncedState.prFrames.map(f => f.line2Spacing)), "0");

            add("prAnimation", compress(debouncedState.prFrames.map(f => f.animation)), "NONE");
            add("prAnimSpeed", compress(debouncedState.prFrames.map(f => f.animSpeed)), "0.25");
            add("prDelay", compress(debouncedState.prFrames.map(f => f.delay || "")), "");
            add("prLine1Align", compress(debouncedState.prFrames.map(f => f.line1Align)), "CENTRE");
            add("prLine2Align", compress(debouncedState.prFrames.map(f => f.line2Align)), "CENTRE");
            add("prVerticalSpacing", compress(debouncedState.prFrames.map(f => f.verticalSpacing)), "FLUSH");
        }

        const paramString = params.toString();
        const newUrl = paramString ? `${window.location.pathname}?${paramString}` : window.location.pathname;
        window.history.replaceState({}, '', newUrl);

    }, [debouncedState]);
}

export default useUrlSync;