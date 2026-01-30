
export default function Loading() {
    return (
        <div className="w-full min-h-screen bg-background p-4 md:p-10 space-y-8">
            {/* Hero Shimmer */}
            <div className="max-w-4xl mx-auto space-y-4 py-20">
                <div className="h-12 w-3/4 mx-auto bg-muted/40 rounded-xl animate-pulse" />
                <div className="h-6 w-1/2 mx-auto bg-muted/20 rounded-lg animate-pulse" />
            </div>

            {/* Grid Shimmer */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-[1440px] mx-auto">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="aspect-square bg-muted/20 rounded-3xl animate-pulse shadow-sm" />
                ))}
            </div>
        </div>
    );
}
