// Survey модулийн fetch client.
//
// Base URL: `NEXT_PUBLIC_API_URL`-г тэргүүлж уншина, байхгүй бол
// `NEXT_PUBLIC_SURVEY_API_BASE`-г ашиглана (хоёулаа .env.local-д ижил утгатай
// байж болно — PROMPT.md-ийн "Мэдэгдэж буй эрсдэл" хэсгийг үз).
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_SURVEY_API_BASE || "";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError("NEXT_PUBLIC_API_URL тохируулагдаагүй байна", 0);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    // fetch throws only on network-level failure (offline, DNS, TLS, CORS block).
    throw new ApiError("NETWORK_ERROR", 0);
  }

  const contentType = res.headers.get("content-type") ?? "";
  const raw = await res.text();
  const parsed: unknown = contentType.includes("application/json") && raw ? JSON.parse(raw) : raw;

  if (!res.ok) {
    throw new ApiError(`Request failed: ${path} -> ${res.status}`, res.status, parsed);
  }

  return parsed as T;
}
