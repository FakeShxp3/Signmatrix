function UpdateModal({ version, isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-neutral-700 rounded-lg shadow-2xl max-w-md w-full p-6">
                <h2 className="text-2xl font-bold text-white mb-2">New Signmatrix update</h2>
                <p className="text-sm text-neutral-400 mb-4">Version {version}</p>
                <div className="text-neutral-300 space-y-3 mb-6">
                    <p>Commas, periods and other common punctuation now have fallback glyphs in fonts that were missing them, including Axion and INIT.</p>
                    <p>Curly quotes, long dashes and ellipses are converted to sign-friendly punctuation.</p>
                    <p>This works in destination lines, route numbers, suffixes and public relationship frames, including PNG/GIF downloads.</p>
                </div>
                <button
                    onClick={onClose}
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold py-2 px-4 rounded transition-colors"
                >
                    epic, let's go!
                </button>
            </div>
        </div>
    );
}

export default UpdateModal;
