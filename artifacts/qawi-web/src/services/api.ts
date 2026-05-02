const API_URL = (import.meta.env.VITE_API_URL || "") + "/api/v1";

interface FetchOptions extends RequestInit {
  data?: any;
}

export async function apiFetch<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { data, headers, ...rest } = options;
  
  const token = localStorage.getItem("qawi_token");
  
  const config: RequestInit = {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);

  if (response.status === 401) {
    localStorage.removeItem("qawi_token");
    const base = import.meta.env.BASE_URL || "/";
    window.location.href = `${base.replace(/\/$/, "")}/login`;
    throw new Error("Unauthorized");
  }

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw {
      error: responseData.error || "Unknown error",
      messageAr: responseData.messageAr || "حدث خطأ غير معروف",
      status: response.status
    };
  }

  return responseData as T;
}