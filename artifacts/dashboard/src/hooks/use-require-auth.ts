import { useEffect } from "react";
import { useLocation } from "wouter";
import { getToken } from "@/lib/auth";
import { useGetMe } from "@workspace/api-client-react";

export function useRequireAuth() {
  const [, setLocation] = useLocation();
  const token = getToken();

  // If no token locally, redirect immediately
  useEffect(() => {
    if (!token) {
      setLocation("/");
    }
  }, [token, setLocation]);

  // If token is present, we also fetch me to ensure it's valid
  const { data: user, isError, isLoading } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    }
  });

  useEffect(() => {
    if (isError) {
      localStorage.removeItem("crm_token");
      setLocation("/");
    }
  }, [isError, setLocation]);

  return {
    user,
    isLoading: isLoading && !!token,
    isAuthenticated: !!user,
  };
}
