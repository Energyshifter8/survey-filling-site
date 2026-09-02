// Survey модулийн fetch client.
//
// Base URL: `NEXT_PUBLIC_API_URL`-г тэргүүлж уншина, байхгүй бол
// `NEXT_PUBLIC_SURVEY_API_BASE`-г ашиглана (хоёулаа .env.local-д ижил утгатай
// байж болно). collector-staging.mindxplus.com-г decompiled bundle-ээр
// баталгаажсан (2026-09) — service-staging.mindxplus.com ӨӨР, хамааралгүй
// сервис (401 буцаадаг, survey API биш).
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_SURVEY_API_BASE || "";

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

/** Бүх хүсэлтэд нийтлэг: base URL угтвар, Accept-Language: mn-MN header
 *  (decompiled bundle-ээр баталгаажсан — жинхэнэ frontend-ийн axios interceptor
 *  бүх хүсэлтэд энэ header-ийг нэмдэг). */
async function doFetch(path: string, options: RequestOptions): Promise<Response> {
  if (!API_BASE_URL) {
    throw new ApiError("NEXT_PUBLIC_API_URL тохируулагдаагүй байна", 0);
  }

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Accept-Language": "mn-MN",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    // fetch throws only on network-level failure (offline, DNS, TLS, CORS block).
    throw new ApiError("NETWORK_ERROR", 0);
  }
}

/** JSON хариу хүлээж буй endpoint-уудад. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await doFetch(path, options);

  const contentType = res.headers.get("content-type") ?? "";
  const raw = await res.text();
  const parsed: unknown = contentType.includes("application/json") && raw ? JSON.parse(raw) : raw;

  if (!res.ok) {
    throw new ApiError(`Request failed: ${path} -> ${res.status}`, res.status, parsed);
  }

  return parsed as T;
}

/** Raw plain-text хариу буцаадаг endpoint-уудад (жишээ нь GET /s/{shortUrl} —
 *  Content-Type: text/plain, JSON биш, decompiled bundle-ээр баталгаажсан).
 *  JSON.parse-г огт дуудахгүй тул сервер JSON бус хариу буцаахад алдаа шидэхгүй. */
export async function apiRequestText(path: string, options: RequestOptions = {}): Promise<string> {
  const res = await doFetch(path, options);
  const raw = await res.text();

  if (!res.ok) {
    throw new ApiError(`Request failed: ${path} -> ${res.status}`, res.status, raw);
  }

  return raw;
}
