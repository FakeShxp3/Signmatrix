import {track} from '@vercel/analytics'

export const getInitialState = (key, defaultVal) => {
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.has(key)) return params.get(key);
        return defaultVal;
    }
    return defaultVal;
};

export const buildApiUrl = (debouncedState) => {
    const query = new URLSearchParams();

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
    query.append("ledShape", debouncedState.ledShape);
    query.append("ledSize", debouncedState.ledSize);
    query.append("ledGap", debouncedState.ledGap);
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

    //return `http://localhost:8080/api/sign?${query.toString()}`;
    return `https://signmatrix.pythonlmn.xyz/api/sign?${query.toString()}`;
};

export const downloadSign = async (debouncedState, setIsDownloading, frames, prFrames, previewMode) => {
    try {
        setIsDownloading(true);
        const url = buildApiUrl(debouncedState);
        const response = await fetch(url);
        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);

        const hasActivePr = prFrames.some(f => f.line1.trim() !== "" || f.line2.trim() !== "");
        const isGif = previewMode === "all" && (frames.length > 1 || hasActivePr);

        const extension = isGif ? "gif" : "png";

        const routeName = frames[0].route ? frames[0].route.replace(/\s+/g, '-') : "custom";
        const fileName = `signmatrix-${routeName}.${extension}`;

        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        window.URL.revokeObjectURL(objectUrl);
        track('Downloaded Sign', {
            route: debouncedState.route,
            line1: debouncedState.frames[0]?.line1
        });
    } catch (error) {
        console.error(error);
        alert("Uh... something went wrong downloading your sign")
    } finally {
        setIsDownloading(false);
    }
}