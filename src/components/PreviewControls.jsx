function PreviewControls({previewMode, setPreviewMode, frames, prFrames, downloadSign, isDownloading, disabled}) {
    return (
        <div
            className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4 mt-4 bg-zinc-900/50 p-3 rounded-lg border border-neutral-700/50">
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
                {(frames.length > 1 || prFrames.some(f => f.line1.trim() !== "" || f.line2.trim() !== "")) && (
                    <>
                        <button
                            onClick={() => setPreviewMode("all")}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${previewMode === "all" ? "bg-orange-600 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"}`}
                        >
                            ▶ Play
                        </button>
                        {frames.map((_, idx) => (
                            <button
                                key={`frame-${idx}`}
                                onClick={() => setPreviewMode(idx.toString())}
                                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${previewMode === idx.toString() ? "bg-orange-600 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"}`}
                            >
                                Frame {idx + 1}
                            </button>
                        ))}
                        {prFrames.map((frame, idx) => {
                            if (!frame.line1.trim() && !frame.line2.trim()) return null;
                            return (
                                <button
                                    key={`pr-${idx}`}
                                    onClick={() => setPreviewMode(`pr-${idx}`)}
                                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${previewMode === `pr-${idx}` ? "bg-orange-600 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"}`}
                                >
                                    PR {idx + 1}
                                </button>
                            );
                        })}
                    </>
                )}
            </div>

            <button
                onClick={downloadSign}
                disabled={isDownloading || disabled}
                className={`flex items-center gap-2 px-5 py-1.5 rounded-lg font-bold text-white text-sm transition-all whitespace-nowrap ${isDownloading || disabled ? 'bg-orange-600/50 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-500 active:scale-95'}`}
            >
                {isDownloading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg"
                             fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                    strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                             xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                        </svg>
                        Download
                    </>
                )}
            </button>
        </div>
    );
}

export default PreviewControls;