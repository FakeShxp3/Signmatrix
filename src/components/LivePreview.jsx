function LivePreview({ url, loading, error, progress, onRetry }) {
    return (
        <section aria-label="Sign preview" aria-busy={loading}
                 className="bg-black p-4 sm:p-8 rounded-lg border border-neutral-700 flex flex-col gap-3 justify-center items-center min-h-[120px] mb-6">
            {url && <img src={url} alt="LED Sign Preview" className="max-w-full h-auto" />}
            {loading && <p role="status" className="text-sm text-neutral-400">Rendering sign{progress > 0 && progress < 100 ? `… ${progress}%` : '…'}</p>}
            {!loading && error && <div className="text-center space-y-2">
                <p role="alert" className="text-sm text-red-300">{error}</p>
                <button onClick={onRetry} className="text-sm text-orange-400 hover:text-orange-300">Retry preview</button>
            </div>}
        </section>
    );
}

export default LivePreview;
