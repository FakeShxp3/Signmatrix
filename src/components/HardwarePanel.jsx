import InputGroup from "./InputGroup.jsx";

function HardwarePanel({
    width, setWidth,
    height, setHeight,
    color, setColor,
    offColor, setOffColor,
    ledShape, setLedShape,
    ledSize, setLedSize,
    ledGap, setLedGap,
    speed, setSpeed,
    onReset
}) {
    return (
        <div className="bg-zinc-900 p-5 rounded-lg border border-neutral-700">
            <div className="flex justify-between items-center mb-3 border-b border-neutral-600 pb-2">
                <h2 className="text-lg font-semibold text-white">Hardware</h2>
                <button
                    onClick={onReset}
                    title="Reset to defaults"
                    className="flex items-center gap-1 text-xs font-semibold text-neutral-400 hover:text-white transition-colors px-2 py-1 bg-neutral-800 hover:bg-neutral-700 rounded"
                >
                    Reset to defaults
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InputGroup label="Width (px)" type="number" value={width} onChange={setWidth}/>
                <InputGroup label="Height (px)" type="number" value={height} onChange={setHeight}/>

                <div className="flex flex-col h-full">
                    <label className="text-sm text-neutral-400 mb-1">Lit Colour</label>
                    <input
                        type="color"
                        value={color}
                        onChange={e => setColor(e.target.value)}
                        className="w-full h-full p-1 bg-neutral-700 border border-neutral-600 rounded cursor-pointer"
                    />
                </div>

                <div className="flex flex-col h-full">
                    <label className="text-sm text-neutral-400 mb-1">Unlit Colour</label>
                    <input
                        type="color"
                        value={offColor}
                        onChange={e => setOffColor(e.target.value)}
                        className="w-full h-full p-1 bg-neutral-700 border border-neutral-600 rounded cursor-pointer"
                    />
                </div>

                <div className="flex flex-col h-full">
                    <label htmlFor="led-shape" className="text-sm text-neutral-400 mb-1">LED Shape</label>
                    <select
                        id="led-shape"
                        value={ledShape}
                        onChange={(e) => setLedShape(e.target.value)}
                        className="w-full h-full px-3 rounded bg-neutral-700 border border-neutral-600 text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                    >
                        <option value="square">Square</option>
                        <option value="round">Round</option>
                    </select>
                </div>

                <InputGroup label="LED Size (px)" type="number" min="1" max="20" value={ledSize} onChange={setLedSize}/>
                <InputGroup label="LED Gap (px)" type="number" min="0" max="20" value={ledGap} onChange={setLedGap}/>
                <InputGroup label="Flash Speed (ms)" type="number" min="500" step="100" value={speed} onChange={setSpeed}/>
            </div>
        </div>
    );
}

export default HardwarePanel;