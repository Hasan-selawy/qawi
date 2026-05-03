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
  try { body = text ? JSON.parse(text) : null; } catch { /* keep as text */ }

  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}
