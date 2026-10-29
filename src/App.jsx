import {useState, useCallback} from 'react';
import useDebounce from './hooks/useDebounce';
import LivePreview from './components/LivePreview';

import logo from './assets/Signmatrix.png';
import FrameView from "./components/FrameView.jsx";
import Footer from "./components/Footer.jsx";
import CheatSheetModal from "./components/CheatSheetModal.jsx";
import UpdateModal from "./components/UpdateModal.jsx";
import HardwarePanel from "./components/HardwarePanel.jsx";
import PreviewControls from "./components/PreviewControls.jsx";
import GlobalRoutePanel from "./components/GlobalRoutePanel.jsx";
import useFrames from "./hooks/useFrames.js";
import {downloadSign, getInitialState} from './utils/signUtils';
import useUrlSync from "./hooks/useUrlSync.js";
import useUndo from "./hooks/useUndo.js";
import {PRESETS} from "./data/presets.js";
import PresetsPanel from "./components/PresetsPanel.jsx";
import SuggestionBox from "./components/SuggestionBox.jsx";

import EffectsPanel from './components/EffectsPanel.jsx';
import useRenderedSign from './hooks/useRenderedSign.js';
import { DEFAULT_EFFECTS, normalizeEffects } from './utils/displayEffects.js';

const CURRENT_UPDATE_VERSION = "v1.11";


export default function App() {
    const [showUpdateLog, setShowUpdateLog] = useState(() => localStorage.getItem("signmatrix_update_seen") !== CURRENT_UPDATE_VERSION);
    const [showCheatSheet, setShowCheatSheet] = useState(false);
    const [previewMode, setPreviewMode] = useState("all");

    const {
        frames,
        setFrames,
        prFrames,
        setPrFrames,
        addFrame,
        removeFrame,
        updateFrame,
        addPrFrame,
        removePrFrame,
        updatePrFrame
    } = useFrames(setPreviewMode);

    const applyPreset = (presetId) => {
        const preset = PRESETS.find(p => p.id === presetId);
        if (!preset) return;

        setRoute(preset.route);
        setRouteFont(preset.routeFont);
        setRouteSuffix(preset.routeSuffix);
        setRouteSuffixFont(preset.routeSuffixFont);
        setRouteAlign(preset.routeAlign);
        setWidth(preset.width);
        setHeight(preset.height);
        setColor(preset.color);
        setOffColor(preset.offColor);
        setLedShape(preset.ledShape);
        setLedSize(preset.ledSize);
        setLedGap(preset.ledGap);
        setSpeed(preset.speed);

        setFrames(preset.frames.map((f, i) => ({...f, id: Date.now() + i})));
        setPrFrames(preset.prFrames.map((f, i) => ({...f, id: Date.now() + 100 + i})));
        setPreviewMode("all");
    };

    const [color, setColor] = useState(() => getInitialState("color", "#FF9000"));
    const [width, setWidth] = useState(() => getInitialState("width", "200"));
    const [height, setHeight] = useState(() => getInitialState("height", "24"));
    const [speed, setSpeed] = useState(() => getInitialState("speed", "2500"));
    const [isDownloading, setIsDownloading] = useState(false);
    const [route, setRoute] = useState(() => getInitialState("route", "R5").split('|')[0]);
    const [routeFont, setRouteFont] = useState(() => getInitialState("routeFont", "24q").split('|')[0]);
    const [routeColor, setRouteColor] = useState(getInitialState("routeColor", ""));
    const [routeSuffixColor, setRouteSuffixColor] = useState(getInitialState("routeSuffixColor", ""));
    const [routeSuffix, setRouteSuffix] = useState(() => getInitialState("routeSuffix", ""));
    const [routeSuffixFont, setRouteSuffixFont] = useState(() => getInitialState("routeSuffixFont", "16d"));
    const [routeAlign, setRouteAlign] = useState(() => getInitialState("routeAlign", "LEFT"));
    const [ledShape, setLedShape] = useState(() => getInitialState("ledShape", "round"));
    const [ledSize, setLedSize] = useState(() => getInitialState("ledSize", "4"));
    const [ledGap, setLedGap] = useState(() => getInitialState("ledGap", "1"));
    const [offColor, setOffColor] = useState(() => getInitialState("offColor", "#404040"));

    const [effects, setEffects] = useState(() => {
        const saved = Object.fromEntries(Object.entries(DEFAULT_EFFECTS).map(([key, fallback]) => [key, getInitialState(key, fallback)]));
        const normalized = normalizeEffects(saved);
        return Object.fromEntries(Object.keys(DEFAULT_EFFECTS).map(key => [key,
            key === 'noiseColors' ? normalized[key].join(',') : String(normalized[key])
        ]));
    });

    const currentState = {
        frames,
        prFrames,
        color,
        width,
        height,
        speed,
        previewMode,
        route,
        routeFont,
        routeColor,
        routeSuffix,
        routeSuffixFont,
        routeSuffixColor,
        routeAlign,
        ledShape,
        ledSize,
        ledGap,
        offColor,
        ...effects,
    };
    const debouncedState = useDebounce(currentState, 300);
    const rendered = useRenderedSign(debouncedState);
    const isPending = JSON.stringify(currentState) !== JSON.stringify(debouncedState);

    const restoreState = useCallback((saved) => {
        setFrames(saved.frames);
        setPrFrames(saved.prFrames);
        setColor(saved.color);
        setWidth(saved.width);
        setHeight(saved.height);
        setSpeed(saved.speed);
        setPreviewMode(saved.previewMode);
        setRoute(saved.route);
        setRouteFont(saved.routeFont);
        setRouteColor(saved.routeColor);
        setRouteSuffix(saved.routeSuffix);
        setRouteSuffixFont(saved.routeSuffixFont);
        setRouteSuffixColor(saved.routeSuffixColor);
        setRouteAlign(saved.routeAlign);
        setLedShape(saved.ledShape);
        setLedSize(saved.ledSize);
        setLedGap(saved.ledGap);
        setOffColor(saved.offColor);
        setEffects(Object.fromEntries(Object.entries(DEFAULT_EFFECTS).map(([key, fallback]) => [key, saved[key] ?? fallback])));
    }, [setFrames, setPrFrames]);

    const { undo, redo, canUndo, canRedo } = useUndo(debouncedState, restoreState);

    useUrlSync(debouncedState);

    const handleCloseUpdateLog = () => {
        localStorage.setItem("signmatrix_update_seen", CURRENT_UPDATE_VERSION);
        setShowUpdateLog(false);
    };

    const handleDownload = () => {
        if (!isPending && !rendered.loading && rendered.blob) downloadSign(debouncedState, setIsDownloading, rendered.blob);
    };

    const resetHardwareSettings = () => {
        setWidth("200");
        setHeight("24");
        setColor("#FF9000");
        setOffColor("#404040");
        setLedShape("round");
        setLedSize("4");
        setLedGap("1");
        setSpeed("1800");
    };

    return (<div className="max-w-4xl mx-auto p-6 w-full space-y-4">
        <UpdateModal version={CURRENT_UPDATE_VERSION} onClose={handleCloseUpdateLog} isOpen={showUpdateLog}/>
        <CheatSheetModal isOpen={showCheatSheet} onClose={() => setShowCheatSheet(false)}/>

        <header className="flex justify-between items-center mb-6 relative">
            <div className="w-24"></div>
            <img src={logo} alt="Signmatrix" className="h-16 object-contain"/>
            <div className="flex gap-1 w-24 justify-end">
                <button
                    onClick={undo}
                    disabled={!canUndo}
                    title="Undo (Ctrl+Z)"
                    className="flex items-center justify-center w-8 h-8 rounded bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"/></svg>
                </button>
                <button
                    onClick={redo}
                    disabled={!canRedo}
                    title="Redo (Ctrl+Y)"
                    className="flex items-center justify-center w-8 h-8 rounded bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/></svg>
                </button>
            </div>
        </header>

        <LivePreview url={rendered.url} loading={rendered.loading || isPending} error={rendered.error} progress={rendered.progress} onRetry={rendered.retry} transparent={debouncedState.transparentBackground === "true"}/>

        <PreviewControls previewMode={previewMode} setPreviewMode={setPreviewMode} frames={frames} prFrames={prFrames}
                         downloadSign={handleDownload} isDownloading={isDownloading} disabled={isPending || rendered.loading || !rendered.blob}/>

        <div className="w-full">
            <PresetsPanel onApplyPreset={applyPreset} />
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlobalRoutePanel route={route} setRoute={setRoute} routeAlign={routeAlign} setRouteAlign={setRouteAlign}
                              routeFont={routeFont} setRouteFont={setRouteFont} routeSuffix={routeSuffix}
                              setRouteSuffix={setRouteSuffix} routeSuffixFont={routeSuffixFont}
                              setRouteSuffixFont={setRouteSuffixFont} setShowCheatSheet={setShowCheatSheet} routeColor={routeColor} routeSuffixColor={routeSuffixColor} setRouteColor={setRouteColor} setRouteSuffixColor={setRouteSuffixColor}/>

            <HardwarePanel speed={speed} color={color} height={height} width={width} ledGap={ledGap} ledShape={ledShape}
                           ledSize={ledSize} setColor={setColor} offColor={offColor} setHeight={setHeight}
                           setLedGap={setLedGap} setSpeed={setSpeed} setLedSize={setLedSize} setLedShape={setLedShape}
                           setOffColor={setOffColor} setWidth={setWidth} onReset={resetHardwareSettings}/>
            <EffectsPanel effects={effects} setEffects={setEffects} />
            {frames.map((frame, index) => (
                <FrameView key={frame.id} removeFrame={removeFrame} updateFrame={updateFrame} index={index}
                           frame={frame} frames={frames}/>
            ))}

            <button
                onClick={addFrame}
                className="md:col-span-2 w-full py-4 bg-zinc-900 border border-neutral-600 rounded-lg text-neutral-400 hover:text-white hover:border-neutral-500 transition-colors"
            >
                + Add Frame
            </button>

            <div className="md:col-span-2 mt-8 mb-2">
                <h2 className="text-2xl font-bold text-white pb-2">PR Messages</h2>
            </div>

            {prFrames.map((frame, index) => (
                <FrameView
                    key={frame.id}
                    removeFrame={removePrFrame}
                    updateFrame={updatePrFrame}
                    index={index}
                    frame={frame}
                    frames={prFrames}
                />
            ))}

            <button
                onClick={addPrFrame}
                className="md:col-span-2 w-full py-4 bg-zinc-900 border border-neutral-600 rounded-lg text-neutral-400 hover:text-white hover:border-neutral-500 transition-colors mb-8"
            >
                + Add PR Frame
            </button>
        </section>
        <SuggestionBox />
        <Footer version={CURRENT_UPDATE_VERSION}/>
    </div>);
}