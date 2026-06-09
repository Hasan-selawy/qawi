import AsyncStorage from "@react-native-async-storage/async-storage";

const HARDCODED_API_URL =
  "https://d4769cb1-1efe-49e8-bc76-43e3163caa75-00-sdutkzkwul7u.pike.replit.dev/api/v1";

export const API_BASE =
  process.env["EXPO_PUBLIC_API_URL"] ||
  (process.env["EXPO_PUBLIC_DOMAIN"]
    ? `https://${process.env["EXPO_PUBLIC_DOMAIN"]}/api/v1`
    : HARDCODED_API_URL);

console.log("=== API URL ===", API_BASE);

export const TOKEN_KEY = "qawi_token";

// ─── 401 handler ──────────────────────────────────────────────────────────
// Register this callback from AuthContext so api.ts can trigger logout
// without creating a circular dependency.
let _onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(fn: () => void) {
  _onUnauthorized = fn;
}

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any) {
    super(typeof body === "string" ? body : body?.error || body?.message || "Request failed");
    this.status = status;
    this.body = body;
  }
}

function isHtmlBody(text: string): boolean {
  const head = text.trimStart().slice(0, 200).toLowerCase();
  return head.startsWith("<!doctype html") || head.startsWith("<html");
}

async function doFetch(path: string, options: { method?: string; data?: any; headers?: Record<string, string> }) {
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
  return { res, text };
}

export async function apiFetch<T = any>(
  path: string,
  options: { method?: string; data?: any; headers?: Record<string, string> } = {}
): Promise<T> {
  let { res, text } = await doFetch(path, options);

  // Replit dev domains return an HTML wakeup interstitial on the first request
  // when the workspace is asleep. Retry with backoff up to ~12s total.
  if (text && isHtmlBody(text)) {
    const delays = [1000, 1500, 2500, 3500, 4000];
    for (const delay of delays) {
      await new Promise((r) => setTimeout(r, delay));
      ({ res, text } = await doFetch(path, options));
      if (!text || !isHtmlBody(text)) break;
    }
  }

  let body: any = text;
  let parsed = false;
  try {
    body = text ? JSON.parse(text) : null;
    parsed = true;
  } catch { /* keep as text */ }

  // 401 → session expired, trigger global logout
  if (res.status === 401) {
    // Clear stored credentials immediately
    await AsyncStorage.multiRemove([TOKEN_KEY, "qawi_user"]).catch(() => {});
    // Notify AuthContext to clear state + navigate to login
    if (_onUnauthorized) {
      _onUnauthorized();
    }
    throw new ApiError(401, body ?? { error: "Session expired. Please log in again." });
  }

  if (!res.ok) throw new ApiError(res.status, body);

  if (text && !parsed) {
    const snippet = String(text).slice(0, 200).replace(/\s+/g, " ");
    console.warn(`[api] Non-JSON ${res.status} response from ${path}: ${snippet}`);
    throw new ApiError(res.status, {
      error: `Server returned non-JSON response. First 200 chars: ${snippet}`,
    });
  }

  return body as T;
}
