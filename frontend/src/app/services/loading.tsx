// Same instant-skeleton fix as /ride/loading.tsx — see its comment.
export default function ServicesLoading() {
    return (
        <div className="min-h-screen bg-white animate-pulse">
            <div className="h-14 bg-gray-100" />
            <div className="max-w-6xl mx-auto px-4 py-6">
                <div className="h-9 w-1/3 bg-gray-100 rounded-lg mb-6" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array(8).fill(0).map((_, i) => <div key={i} className="h-40 bg-gray-100 rounded-2xl" />)}
                </div>
            </div>
        </div>
    );
}
