import { Skeleton } from "@/components/ui/skeleton";

export const LandingPageSkeleton = () => {
 return (
 <div className="landing-light min-h-screen bg-background text-foreground animate-pulse">
 {/* Navbar skeleton */}
 <div className="fixed top-0 left-0 right-0 z-50 glass">
 <div className="container mx-auto px-4 py-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Skeleton className="h-10 w-10 rounded-hover" />
 <Skeleton className="h-6 w-16 hidden md:block" />
 </div>
 <div className="hidden md:flex items-center gap-8">
 {[...Array(5)].map((_, i) => (
 <Skeleton key={i} className="h-4 w-16" />
 ))}
 </div>
 <div className="flex items-center gap-3">
 <Skeleton className="h-9 w-16" />
 <Skeleton className="h-9 w-28" />
 </div>
 </div>
 </div>
 </div>

 {/* Hero section skeleton */}
 <div className="pt-32 pb-24 container mx-auto px-4">
 <div className="max-w-4xl mx-auto text-center space-y-6">
 {/* Badge */}
 <div className="flex justify-center">
 <Skeleton className="h-8 w-64 rounded-full" />
 </div>
 
 {/* Title */}
 <Skeleton className="h-16 w-3/4 mx-auto" />
 
 {/* Subtitle */}
 <Skeleton className="h-8 w-2/3 mx-auto" />
 <Skeleton className="h-8 w-1/2 mx-auto" />
 
 {/* Feature box */}
 <Skeleton className="h-16 w-full max-w-2xl mx-auto rounded-card" />
 
 {/* CTA buttons */}
 <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
 <Skeleton className="h-14 w-64 rounded-card" />
 <Skeleton className="h-14 w-48 rounded-card" />
 </div>
 
 {/* Feature highlights */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8">
 {[...Array(3)].map((_, i) => (
 <div key={i} className="flex items-center justify-center gap-3">
 <Skeleton className="h-5 w-5 rounded" />
 <Skeleton className="h-5 w-32" />
 </div>
 ))}
 </div>
 </div>
 
 {/* Demo section */}
 <div className="mt-20 max-w-5xl mx-auto">
 <Skeleton className="h-[400px] w-full rounded-panel" />
 </div>
 </div>
 </div>
 );
};
