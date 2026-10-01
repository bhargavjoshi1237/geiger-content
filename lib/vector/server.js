import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { authorizeProject, VectorError } from "./auth.mjs";
import { ProviderError } from "./provider.mjs";

export async function vectorContext(request, projectId, permissions) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new VectorError(
      "source_unconfigured",
      "Supabase is not configured.",
      503,
    );
  let client;
  const bearer = request.headers.get("authorization");
  if (bearer?.startsWith("Bearer "))
    client = createClient(url, key, {
      global: { headers: { Authorization: bearer } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  else {
    const store = await cookies();
    client = createServerClient(url, key, {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (values) => {
          for (const value of values)
            store.set(value.name, value.value, value.options);
        },
      },
    });
  }
  return authorizeProject(client, projectId, permissions);
}

export function vectorResponse(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function vectorFailure(error) {
  const known = error instanceof VectorError || error instanceof ProviderError;
  const data = {
    error: known
      ? error.message
      : "The vector service is unavailable. Check the server connection and migration status.",
    code: known ? error.code : "vector_unavailable",
    ...(error.retryAt
      ? { retryAt: new Date(error.retryAt).toISOString() }
      : {}),
  };
  const response = vectorResponse(data, known ? error.status : 503);
  if (error.retryAt)
    response.headers.set(
      "Retry-After",
      String(Math.max(1, Math.ceil((error.retryAt - Date.now()) / 1000))),
    );
  return response;
}
