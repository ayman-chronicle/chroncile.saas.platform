const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

interface FetchOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || BACKEND_URL;
  }

  private async request<T>(
    path: string,
    options: FetchOptions = {},
  ): Promise<T> {
    const { token, headers: extraHeaders, ...fetchOptions } = options;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(extraHeaders as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: response.statusText,
      }));
      throw new ApiError(response.status, error.error || "Request failed");
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  async get<T>(path: string, token?: string): Promise<T> {
    return this.request<T>(path, { method: "GET", token });
  }

  async post<T>(path: string, body: unknown, token?: string): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      token,
    });
  }

  async put<T>(path: string, body: unknown, token?: string): Promise<T> {
    return this.request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
      token,
    });
  }

  async delete(path: string, token?: string): Promise<void> {
    return this.request(path, { method: "DELETE", token });
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiClient = new ApiClient();
export default apiClient;
