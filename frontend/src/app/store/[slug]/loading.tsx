export default function StoreLoading() {
    return (
        <div className="min-h-screen bg-white animate-pulse">
            <div className="h-14 bg-gray-100" />
            <div className="h-40 md:h-56 bg-gray-100" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-10 relative">
                <div className="h-20 w-20 rounded-2xl bg-gray-200 border-4 border-white" />
                <div className="h-5 w-48 bg-gray-100 rounded-lg mt-4" />
                <div className="h-4 w-32 bg-gray-100 rounded-lg mt-2" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
                    {Array(8).fill(0).map((_, i) => <div key={i} className="h-56 bg-gray-100 rounded-2xl" />)}
                </div>
            </div>
        </div>
    );
}
