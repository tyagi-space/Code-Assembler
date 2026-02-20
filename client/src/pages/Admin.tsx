import { useAuth } from "@/hooks/use-auth";
import {
  useNews,
  useDeleteNews,
  useFetchNews,
  useDeleteNewsByCategory,
  useDeleteNewsByDate,
} from "@/hooks/use-news";
import {
  useApproveAdminRequest,
  usePendingAdminRequests,
  useRejectAdminRequest,
} from "@/hooks/use-admin-requests";
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
import { Loader2, Trash2, RefreshCw, ExternalLink, ShieldCheck, ShieldX } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  
  const { data, isLoading: newsLoading } = useNews({ page: page.toString() });
  const {
    data: pendingAdmins,
    isLoading: pendingLoading,
    error: pendingError,
  } = usePendingAdminRequests();
  const deleteNews = useDeleteNews();
  const fetchNews = useFetchNews();
  const deleteByCategory = useDeleteNewsByCategory();
  const deleteByDate = useDeleteNewsByDate();
  const approveRequest = useApproveAdminRequest();
  const rejectRequest = useRejectAdminRequest();
  const [bulkCategory, setBulkCategory] = useState("Technology");
  const [bulkDate, setBulkDate] = useState("");

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-card border rounded-xl p-4">
            <h3 className="font-semibold mb-2">Bulk Delete by Category</h3>
            <div className="flex gap-2">
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm flex-1"
              >
                {["World", "Technology", "Business", "Health", "Science", "Sports", "Entertainment", "National"].map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <Button
                variant="destructive"
                onClick={() => deleteByCategory.mutate(bulkCategory)}
                disabled={deleteByCategory.isPending}
              >
                Delete
              </Button>
            </div>
          </div>

          <div className="bg-card border rounded-xl p-4">
            <h3 className="font-semibold mb-2">Bulk Delete by Date</h3>
            <div className="flex gap-2">
              <Input
                type="date"
                value={bulkDate}
                onChange={(e) => setBulkDate(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="destructive"
                onClick={() => bulkDate && deleteByDate.mutate(bulkDate)}
                disabled={deleteByDate.isPending || !bulkDate}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="font-semibold text-lg">Pending Admin Requests</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Review and approve or reject users requesting admin access.
            </p>
          </div>
          {pendingLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading requests...</div>
          ) : pendingError ? (
            <div className="p-6 text-sm text-destructive">
              Failed to load pending requests. Ensure you are logged in as an approved admin.
            </div>
          ) : !pendingAdmins || pendingAdmins.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No pending admin requests.</div>
          ) : (
            <div className="relative w-full overflow-auto border-b">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingAdmins.map((pending) => (
                    <TableRow key={pending.id}>
                      <TableCell className="font-medium">{pending.username}</TableCell>
                      <TableCell>{pending.email}</TableCell>
                      <TableCell>{format(new Date(pending.createdAt), "MMM d, yyyy HH:mm")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => approveRequest.mutate(pending.id)}
                            disabled={approveRequest.isPending || rejectRequest.isPending}
                            className="gap-1"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectRequest.mutate(pending.id)}
                            disabled={approveRequest.isPending || rejectRequest.isPending}
                            className="gap-1"
                          >
                            <ShieldX className="h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

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
