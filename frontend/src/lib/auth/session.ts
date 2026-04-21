import { getAccessToken, clearTokens } from "@/lib/api/http";

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

export function logout() {
  clearTokens();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}
