// components/products/ProductGridSkeleton.tsx
import ProductCardSkeleton from "./ProductCardSkeleton";

export default function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="w-screen max-w-[100vw] ml-[calc(50%-50vw)] px-3 md:w-auto md:max-w-full md:ml-0 md:px-0 grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 xl:gap-x-8 mt-8">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
