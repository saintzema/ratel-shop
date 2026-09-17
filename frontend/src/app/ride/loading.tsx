// Next.js shows this INSTANTLY on tap — before /ride's own client JS has
// even finished loading/hydrating — so a Quick Action tap gets some visible
// response the same frame instead of the blank pause that got reported as
// "clicking the quick action buttons doesn't do anything instantly."
export default function RideLoading() {
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
