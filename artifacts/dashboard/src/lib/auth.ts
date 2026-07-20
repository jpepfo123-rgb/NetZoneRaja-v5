import { setAuthTokenGetter } from "@workspace/api-client-react";

export const CRM_TOKEN_KEY = "crm_token";

export function initAuth() {
  setAuthTokenGetter(() => {
    return localStorage.getItem(CRM_TOKEN_KEY);
  });
}

export function setToken(token: string) {
  localStorage.setItem(CRM_TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(CRM_TOKEN_KEY);
}

export function getToken() {
  return localStorage.getItem(CRM_TOKEN_KEY);
}
