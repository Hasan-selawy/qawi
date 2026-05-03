import AsyncStorage from "@react-native-async-storage/async-storage";

const RAW_DOMAIN = process.env["EXPO_PUBLIC_DOMAIN"] || "";
export const API_BASE = `https://${RAW_DOMAIN}/api/v1`;

export const TOKEN_KEY = "qawi_token";

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any) {
    super(typeof body === "string" ? body : body?.error || body?.message || "Request failed");
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T = any>(
  path: string,
  options: { method?: string; data?: any; headers?: Record<string, string> } = {}
): Promise<T> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.data !== undefined ? JSON.stringify(options.data) : undefined,
  });

  const text = await res.text();
  let body: any = text;
  let parsed = false;
  try {
    body = text ? JSON.parse(text) : null;
    parsed = true;
  } catch { /* keep as text */ }

  if (!res.ok) throw new ApiError(res.status, body);

  // If server returned 2xx but the body isn't JSON, the request was almost
  // certainly intercepted by a proxy/interstitial page (e.g. an auth gate).
  if (text && !parsed) {
    const snippet = String(text).slice(0, 200).replace(/\s+/g, " ");
    console.warn(`[api] Non-JSON ${res.status} response from ${path}: ${snippet}`);
    throw new ApiError(res.status, {
      error: `Server returned non-JSON response (likely a proxy/interstitial page). First 200 chars: ${snippet}`,
    });
  }

  return body as T;
}
