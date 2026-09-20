export default function CartLoading() {
    return (
        <div className="min-h-screen bg-gray-50 animate-pulse">
            <div className="h-14 bg-gray-100" />
            <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
                <div className="h-8 w-1/3 bg-gray-200 rounded-lg" />
                <div className="h-28 bg-gray-200 rounded-2xl" />
                <div className="h-28 bg-gray-200 rounded-2xl" />
            </div>
        </div>
    );
}
