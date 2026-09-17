// Same instant-skeleton fix as /ride/loading.tsx — see its comment. Dark to
// match the scan page's own black background instead of flashing white.
export default function ScanLoading() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
    );
}
