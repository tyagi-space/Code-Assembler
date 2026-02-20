import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import type { UserResponse } from "@shared/schema";

type AdminRequestUser = UserResponse;

export function usePendingAdminRequests() {
  return useQuery<AdminRequestUser[]>({
    queryKey: [api.admin.pendingRequests.path],
    queryFn: async () => {
      const res = await fetch(api.admin.pendingRequests.path, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load pending admin requests");
      return (await res.json()) as AdminRequestUser[];
    },
  });
}

export function useApproveAdminRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.admin.approveRequest.path, { id });
      const res = await fetch(url, {
        method: api.admin.approveRequest.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to approve admin request");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.pendingRequests.path] });
      toast({ title: "Approved", description: "Admin request approved and email sent." });
    },
    onError: (error: Error) => {
      toast({
        title: "Approval failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useRejectAdminRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.admin.rejectRequest.path, { id });
      const res = await fetch(url, {
        method: api.admin.rejectRequest.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to reject admin request");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.pendingRequests.path] });
      toast({ title: "Rejected", description: "Admin request rejected and email sent." });
    },
    onError: (error: Error) => {
      toast({
        title: "Rejection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
