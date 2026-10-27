# Signmatrix 

![img.png](img.png)

This is a React-based interface for configuring and generating LED dest signs.

This frontend uses the [Signmatrix backend](https://github.com/itzzmarkus/Signmatrix-backend) which in turn is forked from chrislo27's [dotmatrix](https://github.com/chrislo27/dotmatrix/). 

To install, clone this repo, `npm install`, and `npm run dev`. Ensure the Signmatrix backend is running.

This work is licensed under APGLv3.

![img_1.png](img_1.png)
## Round LEDs and camera effects

The default display and all presets use round LEDs at a 4 px diameter with a 1 px gap. Square LEDs remain available for older designs. Dot shape is rendered separately from the glyph layout; this does **not** replace the backend's existing font glyphs with BTM fonts.

The **Camera effects** panel offers up to six editable noise colours, strength, coverage, a new-pattern button, and adjustable LED glow strength/radius. Effects start at zero. Glow follows each lit LED's colour and excludes unlit LEDs. Settings are included in share links and undo/redo; **Reset effects** clears them without changing the sign layout.

The browser fetches the existing backend image and processes it in a Web Worker using OffscreenCanvas. Preview and Download use the same resulting blob. PNGs stay PNGs; GIFs retain their frames, delays, disposal/compositing behaviour and loop count, with a new palette per frame. GIF's 256-colour limit can introduce slight banding in strong glow/noise. Processing is limited to 4 million pixels per frame and 150 million pixels per animation to keep memory/time bounded. Use a current browser with OffscreenCanvas support. The existing backend must remain available and allow CORS; rendering errors disable Download and offer Retry preview.

### BTM font reference

The requested reference is [BenTheMiner's destination sign font catalogue](https://docs.google.com/spreadsheets/d/1e4nNlpRJTOTGR7SLSzbmKmvqlEFX2CXbKhJ4B0sxkl0/htmlview#gid=1355147630). The linked [Axion 7X12 licence](https://fontstruct.com/fontstructions/license/1836721/axion-7x12) disallows redistribution and use as a hosted webfont. No BTM font files are bundled or relabelled here. An exact BTM glyph replacement remains pending suitable web-use/redistribution permission and the font files, plus integration with the font-rendering backend.

## Checks

- `npm test`: deterministic noise, circular LED geometry, colour-aware glow, PNG export, and animated GIF timing/loop tests using native Canvas fixtures.
- `npm run lint`
- `npm run build`
