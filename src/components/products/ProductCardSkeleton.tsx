// components/products/ProductCardSkeleton.tsx
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden rounded-lg shadow-md h-full">
      <CardContent className="p-0">
        <Skeleton className="w-full h-auto aspect-square" />
      </CardContent>
      <CardFooter className="p-4 flex flex-col items-start space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-6 w-1/4 mt-1" />
      </CardFooter>
    </Card>
  );
}
