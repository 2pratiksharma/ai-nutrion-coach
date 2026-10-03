import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createEndpoints, type HttpMethod } from "./endpoints";
import { toApiError } from "./errors";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

async function serverRequest<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const cookieStore = await cookies();
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    method,
    headers: {
      cookie: cookieStore.toString(),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  if (res.status === 401) redirect("/login");
  if (res.status === 404 && method === "GET") notFound();
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Server-side API for Server Components; forwards the user's session cookie. */
export const serverApi = createEndpoints(serverRequest);

/** Deduplicated per request, so layouts and pages can both ask for the session. */
export const getSession = cache(() => serverApi.auth.session());

export async function requireOnboardedSession() {
  const session = await getSession();
  if (!session.hasProfile) redirect("/onboarding");
  return session;
}

export const getProfile = cache(() => serverApi.profile.get());
