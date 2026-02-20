import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Define the response type for list manually since it's complex
type NewsListResponse = {
  items: Array<{
    id: string;
    title: string;
    description: string | null;
    content: string | null;
    imageUrl: string | null;
    sourceName: string;
    sourceUrl: string;
    category: string;
    publishedAt: string; // serialized date
    createdAt: string; // serialized date
  }>;
  total: number;
  page: number;
  totalPages: number;
};

export function useNews(params?: { category?: string; search?: string; page?: string }) {
  // Create a query key that includes all params
  const queryKey = [api.news.list.path, params];

  return useQuery<NewsListResponse>({
    queryKey,
    queryFn: async () => {
      const url = new URL(api.news.list.path, window.location.origin);
      if (params?.category) url.searchParams.set("category", params.category);
      if (params?.search) url.searchParams.set("search", params.search);
      if (params?.page) url.searchParams.set("page", params.page);

      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch news");
      return await res.json();
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

export function useNewsItem(id: string) {
  return useQuery({
    queryKey: [api.news.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.news.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch article");
      return await res.json();
    },
  });
}

export function useDeleteNews() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.news.delete.path, { id });
      const res = await fetch(url, { 
        method: api.news.delete.method,
        credentials: "include" 
      });
      
      if (!res.ok) throw new Error("Failed to delete article");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.news.list.path] });
      toast({ title: "Article deleted", description: "The news article has been removed." });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Could not delete article. You might not have permission.",
        variant: "destructive"
      });
    }
  });
}

export function useDeleteNewsByCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (category: string) => {
      const res = await fetch(api.news.deleteByCategory.path, {
        method: api.news.deleteByCategory.method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      if (!res.ok) throw new Error("Failed to delete category articles");
      return (await res.json()) as { message: string; count: number };
    },
    onSuccess: ({ count, message }) => {
      queryClient.invalidateQueries({ queryKey: [api.news.list.path] });
      toast({ title: "Category delete complete", description: `${message} (${count})` });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not delete category articles.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteNewsByDate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (date: string) => {
      const res = await fetch(api.news.deleteByDate.path, {
        method: api.news.deleteByDate.method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) throw new Error("Failed to delete date articles");
      return (await res.json()) as { message: string; count: number };
    },
    onSuccess: ({ count, message }) => {
      queryClient.invalidateQueries({ queryKey: [api.news.list.path] });
      toast({ title: "Date delete complete", description: `${message} (${count})` });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not delete date-based articles.",
        variant: "destructive",
      });
    },
  });
}

export function useFetchNews() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.news.fetchNow.path, {
        method: api.news.fetchNow.method,
        credentials: "include"
      });
      
      if (!res.ok) throw new Error("Failed to trigger fetch");
      return await res.json();
    },
    onSuccess: (data: { message: string, count: number }) => {
      queryClient.invalidateQueries({ queryKey: [api.news.list.path] });
      toast({ 
        title: "News Fetched", 
        description: `Successfully fetched ${data.count} new articles.` 
      });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to trigger news fetch.",
        variant: "destructive"
      });
    }
  });
}
