import { useState } from "react";
import { useLocation } from "wouter";
import { useNews } from "@/hooks/use-news";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { NewsCard } from "@/components/NewsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Loader2, ArrowRight, ArrowLeft } from "lucide-react";

export default function Home() {
  const [location, setLocation] = useLocation();
  
  // Parse query params properly
  const searchParams = new URLSearchParams(window.location.search);
  const category = searchParams.get("category") || undefined;
  const page = searchParams.get("page") || "1";
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  
  const { data, isLoading, error } = useNews({ 
    category, 
    search: searchParams.get("search") || undefined,
    page
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(window.location.search);
    if (searchTerm) params.set("search", searchTerm);
    else params.delete("search");
    params.set("page", "1"); // Reset to page 1
    setLocation(`/?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", newPage.toString());
    setLocation(`/?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <div className="bg-muted/30 border-b py-16 md:py-24">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-6 tracking-tight text-balance">
              {category ? `${category} News` : "Stories that matter, curated for you."}
            </h1>
            <p className="text-lg text-muted-foreground mb-8 text-balance">
              Stay informed with the latest updates from trusted sources across the globe.
            </p>
            
            <form onSubmit={handleSearch} className="relative max-w-lg mx-auto">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input 
                className="pl-10 h-12 rounded-full text-base bg-background shadow-sm border-muted-foreground/20 focus:border-primary/50" 
                placeholder="Search for topics, sources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button 
                type="submit" 
                className="absolute right-1.5 top-1.5 rounded-full px-6 h-9"
              >
                Search
              </Button>
            </form>
          </div>
        </div>

        {/* Content Section */}
        <div className="container mx-auto px-4 py-12">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex flex-col space-y-3">
                  <Skeleton className="h-[200px] w-full rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <h3 className="text-xl font-semibold mb-2">Failed to load news</h3>
              <p className="text-muted-foreground mb-6">{(error as Error).message}</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          ) : data?.items.length === 0 ? (
            <div className="text-center py-20 bg-muted/20 rounded-2xl border border-dashed">
              <h3 className="text-xl font-semibold mb-2">No stories found</h3>
              <p className="text-muted-foreground mb-6">Try adjusting your search or category filters.</p>
              <Button variant="outline" onClick={() => {
                setLocation("/");
                setSearchTerm("");
              }}>Clear Filters</Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {data?.items.map((item, index) => (
                  <NewsCard key={item.id} {...item} index={index} />
                ))}
              </div>

              {/* Pagination */}
              {data && data.totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-16">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(data.page - 1)}
                    disabled={data.page <= 1}
                    className="gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" /> Previous
                  </Button>
                  
                  <span className="text-sm font-medium text-muted-foreground">
                    Page {data.page} of {data.totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(data.page + 1)}
                    disabled={data.page >= data.totalPages}
                    className="gap-2"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
