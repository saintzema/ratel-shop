/**
 * Instant feedback for the single most-clicked navigation on the site
 * (product card → PDP). page.tsx does real DB work (product + reviews)
 * before it can render anything, so without this file a tap sat on the
 * previous screen with zero visual change until that finished — reported as
 * "feels like what I clicked isn't opening". Next.js shows this
 * automatically (App Router Suspense convention) the instant navigation
 * starts, no wiring needed beyond the file existing.
 */
export default function ProductLoading() {
    return (
        <div className="min-h-screen bg-white animate-pulse">
            <div className="h-14 bg-gray-100" />
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <div className="aspect-square rounded-2xl bg-gray-100" />
                    <div className="flex gap-2">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-16 w-16 rounded-xl bg-gray-100 shrink-0" />)}
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="h-4 w-24 bg-gray-100 rounded-full" />
                    <div className="h-7 w-3/4 bg-gray-100 rounded-lg" />
                    <div className="h-4 w-1/2 bg-gray-100 rounded-lg" />
                    <div className="h-9 w-40 bg-gray-100 rounded-lg mt-2" />
                    <div className="h-12 w-full bg-gray-100 rounded-2xl mt-6" />
                    <div className="h-12 w-full bg-gray-100 rounded-2xl" />
                    <div className="h-24 w-full bg-gray-50 rounded-2xl mt-4" />
                </div>
            </div>
        </div>
    );
}
