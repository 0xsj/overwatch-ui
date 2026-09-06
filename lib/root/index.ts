import { createFetchClient, createMemoryClient, type HttpClient } from "@/lib/http";
import { routes } from "./fixtures";

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

/** The composition root, and the ONE place that picks an adapter.
 *
 *  With no `NEXT_PUBLIC_API_URL` the whole application runs on fixtures — the
 *  screens cannot tell, because both adapters satisfy the same port and produce
 *  the same `AppError` values. Set it and every call goes to the server with no
 *  edit above this file. */
export const http: HttpClient = baseUrl
  ? createFetchClient({ baseUrl })
  : createMemoryClient({ routes });

export const usingFixtures = !baseUrl;

/** What a screen renders when it says what it is talking to. */
export const transport = usingFixtures
  ? "No backend. Nothing is stored, no email is sent, and no session is created."
  : `Talking to ${baseUrl}.`;
