const FONT_GROUPS = [
    {
        name: "Luminator",
        fonts: [
            "5", "5d", "6", "6d", "7", "7d", "7dn", "8", "8d", "9", "9d",
            "10d", "10df", "10dc", "11d", "12d", "13d", "14d", "14da1", "15d",
            "16d", "16t", "18t", "20t", "22t", "22q", "24q", "24qa1", "f16"
        ]
    },
    {
        name: "Luminator New",
        fonts: ["l10", "l10d", "l11d", "l12d", "l13d", "l14d", "l14da1", "l15d", "l16d", "l16t"]
    },
    {
        name: "Luminator Fixed Width",
        fonts: ["5x7", "8x14"]
    },
    {
        name: "Luminator Smart",
        fonts: [
            "smart7x5", "smart7x6", "smart8x6", "smart9x6", "smart9x7",
            "smart10x6", "smart10x7", "smart10x8", "smart11x6", "smart11x8",
            "smart12x6", "smart12x9", "smart12x10", "smart14x7", "smart14x10",
            "smart14x11", "smart16x11", "smart16x12", "smart18x12", "smart19x13",
            "smart20x14", "smart22x15", "smart24x16", "smartgraphics"
        ]
    },
    {
        name: "INIT",
        fonts: ["init8"]
    },
    {
        name: "Axion",
        fonts: ["balios7", "balios7w", "balios8", "balios8d", "balios10", "balios12", "balios14", "balios16", "balios16w"]
    }
];

const getFontSize = (font) => {
    const match = font?.match(/\d+/);
    return match ? Number(match[0]) : null;
};

const getFontLabel = (font) => {
    if (font === "5x7") return "7";
    if (font === "8x14") return "14";
    const smartFont = font.match(/^smart(\d+)x(\d+)$/);
    if (smartFont) {
        const [, height, width] = smartFont;
        const widthsByHeight = {
            "7": ["5", "6"],
            "9": ["6", "7"],
            "10": ["6", "7", "8"],
            "11": ["6", "8"],
            "12": ["6", "9", "10"],
            "14": ["7", "10", "11"],
            "16": ["11", "12"]
        };
        const variantIndex = widthsByHeight[height]?.indexOf(width) ?? 0;
        const strokeSuffix = {
            "7": "d",
            "8": "d",
            "9": width === "6" ? "d" : "",
            "10": "d",
            "11": "d",
            "12": "d",
            "14": width === "7" ? "d" : "",
            "16": "t",
            "18": "t",
            "19": "t",
            "20": "t",
            "22": "q",
            "24": "q"
        }[height] || "";
        const variantSuffix = ["", "f", "c"][variantIndex] || "";
        return `${height}${strokeSuffix}${variantSuffix}`;
    }
    if (font === "smartgraphics") return "Graphics";
    if (font === "init8") return "8";
    return font.replace(/^balios|^l/, "");
};

const getClosestFont = (fonts, currentFont) => {
    const currentSize = getFontSize(currentFont);
    if (currentSize === null) return fonts[0];

    return fonts.reduce((closest, font) => {
        const fontSize = getFontSize(font);
        if (fontSize === null) return closest;

        const closestSize = getFontSize(closest);
        return Math.abs(fontSize - currentSize) < Math.abs(closestSize - currentSize)
            ? font
            : closest;
    }, fonts[0]);
};

function FontDropdown({ label, value, onChange }) {
    const selectedGroup = FONT_GROUPS.find(group => group.fonts.includes(value)) || FONT_GROUPS[0];
    const selectedFont = selectedGroup.fonts.includes(value) ? value : selectedGroup.fonts[0];

    return (
        <div className="flex flex-col flex-1">
            {label && <label className="text-sm text-neutral-400 mb-1">{label}</label>}
            <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-2">
                <select
                    aria-label="Font family"
                    value={selectedGroup.name}
                    onChange={(e) => {
                        const group = FONT_GROUPS.find(item => item.name === e.target.value);
                        onChange(getClosestFont(group.fonts, value));
                    }}
                    className="w-full h-10 px-2 rounded bg-neutral-700 border border-neutral-600 text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                    {FONT_GROUPS.map(group => (
                        <option key={group.name} value={group.name}>{group.name}</option>
                    ))}
                </select>
                <select
                    aria-label="Font size"
                    value={selectedFont}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full h-10 px-2 rounded bg-neutral-700 border border-neutral-600 text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                    {selectedGroup.fonts.map(font => (
                        <option key={font} value={font}>{getFontLabel(font)}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}

export default FontDropdown;