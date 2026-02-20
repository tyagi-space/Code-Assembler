import { useAuth } from "@/hooks/use-auth";
import { useNews, useDeleteNews, useFetchNews } from "@/hooks/use-news";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Loader2, Trash2, RefreshCw, ExternalLink, Plus } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  
  const { data, isLoading: newsLoading } = useNews({ page: page.toString() });
  const deleteNews = useDeleteNews();
  const fetchNews = useFetchNews();

  if (authLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;

  if (!user || !user.isAdmin) {
    setLocation("/");
    return null;
  }

  const handleDelete = async (id: string) => {
    deleteNews.mutate(id);
  };

  const handleFetch = () => {
    fetchNews.mutate();
  };

  return (
    <div className="min-h-screen bg-muted/10">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="font-display font-bold text-3xl">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage news articles and trigger updates.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleFetch} 
              disabled={fetchNews.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {fetchNews.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Fetch Latest News
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="font-semibold text-lg">News Articles</h2>
          </div>
          
          {newsLoading ? (
             <div className="p-12 text-center text-muted-foreground">Loading articles...</div>
          ) : (
            <>
              <div className="relative w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[400px]">Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium max-w-[400px]">
                          <div className="line-clamp-1" title={item.title}>{item.title}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category}</Badge>
                        </TableCell>
                        <TableCell>{item.sourceName}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {format(new Date(item.publishedAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-2">
                            <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="icon" title="View Source">
                                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </a>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Article?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the article "{item.title}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDelete(item.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {data && (
                <div className="p-4 border-t flex justify-between items-center bg-muted/5">
                  <div className="text-sm text-muted-foreground">
                    Showing {(data.page - 1) * 20 + 1} to {Math.min(data.page * 20, data.total)} of {data.total} results
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= data.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
