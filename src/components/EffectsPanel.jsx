import { DEFAULT_EFFECTS, REFERENCE_EFFECTS, parseNoiseColors } from '../utils/displayEffects.js';

function Slider({ label, value, onChange, min = 0, max = 100, step = 1, unit = '%' }) {
    return <label className="flex flex-col gap-2 text-sm text-neutral-300">
        <span className="flex justify-between gap-3">{label}<span className="text-orange-400 tabular-nums">{value}{unit}</span></span>
        <input aria-label={label} type="range" min={min} max={max} step={step} value={value}
               onChange={event => onChange(event.target.value)} className="w-full accent-orange-500" />
    </label>;
}

export default function EffectsPanel({ effects, setEffects }) {
    const update = (key, value) => setEffects(previous => ({ ...previous, [key]: value }));
    const colors = parseNoiseColors(effects.noiseColors);
    return <section className="md:col-span-2 bg-zinc-900 p-5 rounded-lg border border-neutral-700" aria-labelledby="effects-heading">
        <div className="flex justify-between items-center gap-4 mb-4 border-b border-neutral-600 pb-2">
            <h2 id="effects-heading" className="text-lg font-semibold text-white">Camera effects</h2>
            <div className="flex flex-wrap justify-end gap-2">
                <button onClick={() => setEffects(previous => ({ ...previous, ...REFERENCE_EFFECTS }))}
                        className="text-xs text-orange-300 bg-orange-950 hover:bg-orange-900 rounded px-3 py-2">Match reference</button>
                <button onClick={() => setEffects({ ...DEFAULT_EFFECTS })} className="text-xs text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded px-3 py-2">Reset effects</button>
            </div>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <h3 className="font-medium text-white">LED colour variation</h3>
                <p className="text-sm text-neutral-400">Uneven brightness and subtle colour shifts across the LED grid, like a photographed sign.</p>
                <Slider label="Noise strength" value={effects.noiseAmount} onChange={value => update('noiseAmount', value)} />
                <Slider label="LED coverage" value={effects.noiseCoverage} onChange={value => update('noiseCoverage', value)} />
                <div className="flex flex-wrap gap-3 items-center">
                    {colors.map((color, index) => <div key={index} className="flex items-center gap-1">
                        <input aria-label={`Noise colour ${index + 1}`} type="color" value={color}
                               onChange={event => update('noiseColors', colors.map((item, i) => i === index ? event.target.value : item).join(','))}
                               className="w-10 h-9 p-1 bg-neutral-700 rounded cursor-pointer" />
                        <button aria-label={`Remove noise colour ${index + 1}`} disabled={colors.length === 1}
                                onClick={() => update('noiseColors', colors.filter((_, i) => i !== index).join(','))}
                                className="text-neutral-400 hover:text-white disabled:opacity-30">×</button>
                    </div>)}
                    <button disabled={colors.length >= 6} onClick={() => update('noiseColors', [...colors, '#ffffff'].join(','))}
                            className="text-sm text-orange-400 hover:text-orange-300 disabled:opacity-30">+ Add colour</button>
                </div>
                <button onClick={() => update('noiseSeed', String((Number(effects.noiseSeed) % 2147483646) + 1))}
                        className="text-xs text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded px-3 py-2">New noise pattern</button>
            </div>
            <div className="space-y-4">
                <h3 className="font-medium text-white">LED glow</h3>
                <Slider label="Glow strength" value={effects.glowAmount} onChange={value => update('glowAmount', value)} />
                <Slider label="Glow radius" value={effects.glowRadius} min={1} max={20} unit=" px" onChange={value => update('glowRadius', value)} />
                <p className="text-sm text-neutral-400">A soft bloom around lit LEDs, using each LED’s colour.</p>
                <Slider label="Camera softness" value={effects.cameraSoftness} min={0} max={1.5} step={0.1} unit=" px" onChange={value => update('cameraSoftness', value)} />
            </div>
        </div>
        <div className="mt-6 border-t border-neutral-700 pt-4 space-y-3">
            <Slider label="Dead pixels" value={effects.deadPixels} step={0.1} onChange={value => update('deadPixels', value)} />
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-neutral-400">Percentage of the full LED grid that stays off. Failed locations stay fixed across animation frames.</p>
                <button onClick={() => update('deadPixelSeed', String((Number(effects.deadPixelSeed) % 2147483646) + 1))}
                        className="text-xs text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded px-3 py-2">New dead-pixel pattern</button>
            </div>
        </div>
        <div className="mt-6 border-t border-neutral-700 pt-4">
            <label className="flex items-center gap-3 text-sm font-medium text-white cursor-pointer">
                <input type="checkbox" checked={effects.transparentBackground === 'true'}
                       onChange={event => update('transparentBackground', String(event.target.checked))}
                       className="h-4 w-4 accent-orange-500" />
                Transparent background — text only
            </label>
            <p className="text-xs text-neutral-400 mt-2">Removes the panel and unlit LEDs. PNG keeps soft glow and smooth edges; GIF has hard transparency edges.</p>
        </div>
        <p className="text-xs text-neutral-400 mt-5">Set strength to 0 to turn an effect off. Effects are included in PNG and animated GIF downloads and saved in the page link.</p>
    </section>;
}
