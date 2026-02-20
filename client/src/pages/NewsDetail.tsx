import { useParams, Link } from "wouter";
import { useNewsItem } from "@/hooks/use-news";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, ExternalLink } from "lucide-react";
import { format } from "date-fns";

export default function NewsDetail() {
  const { id } = useParams();
  const { data: item, isLoading, error } = useNewsItem(id!);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="container mx-auto px-4 py-12 max-w-4xl flex-grow">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-12 w-full mb-6" />
          <Skeleton className="h-[400px] w-full rounded-xl mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center flex-grow">
          <h2 className="text-2xl font-bold mb-4">Article not found</h2>
          <Link href="/">
            <Button>Return Home</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  // Safe fallback for image
  const displayImage = item.imageUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=2070&auto=format&fit=crop";
  const hasHtmlContent = !!item.content && /<\/?[a-z][\s\S]*>/i.test(item.content);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-12 max-w-4xl">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to News
        </Link>
        
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-primary/20 text-primary">{item.category}</Badge>
            <span className="text-sm text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">{format(new Date(item.publishedAt), "MMMM dd, yyyy")}</span>
          </div>
          
          <h1 className="font-display font-bold text-4xl md:text-5xl leading-tight text-balance">
            {item.title}
          </h1>
          
          <div className="flex items-center justify-between border-y py-4 my-6">
            <div className="flex items-center gap-2">
              <span className="font-medium">Source:</span>
              <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                {item.sourceName} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          
          <div className="rounded-2xl overflow-hidden shadow-2xl mb-10">
            <img 
              src={displayImage} 
              alt={item.title} 
              className="w-full h-auto object-cover max-h-[500px]"
            />
          </div>
          
          <article className="prose prose-lg dark:prose-invert max-w-none">
            <div className="lead text-xl text-muted-foreground mb-8 font-serif leading-relaxed">
              {item.description}
            </div>
            
            {/* If content exists, render it. Often API only returns summary/description */}
            {item.content ? (
              hasHtmlContent ? (
                <div dangerouslySetInnerHTML={{ __html: item.content }} />
              ) : (
                <div className="whitespace-pre-line leading-relaxed text-foreground/90">
                  {item.content}
                </div>
              )
            ) : (
              <div className="bg-muted/30 p-8 rounded-xl border text-center my-8">
                <p className="mb-4 text-muted-foreground">This is a summary of the article.</p>
                <Button asChild size="lg" className="font-semibold">
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                    Read Full Article on {item.sourceName}
                  </a>
                </Button>
              </div>
            )}
          </article>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
