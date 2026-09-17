// Same instant-skeleton fix as /ride/loading.tsx — see its comment.
export default function SendPackageLoading() {
    return (
        <div className="min-h-screen bg-white animate-pulse">
            <div className="h-14 bg-gray-100" />
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
                <div className="h-8 w-1/2 bg-gray-100 rounded-lg" />
                <div className="h-48 bg-gray-100 rounded-2xl" />
                <div className="h-40 bg-gray-100 rounded-2xl" />
                <div className="h-24 bg-gray-100 rounded-2xl" />
            </div>
        </div>
    );
}
