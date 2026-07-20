/**
 * Builds a minimal object shaped like Astro's APIContext, for calling
 * route handler functions directly in tests without running a real server.
 */
export interface MakeContextOptions {
  url: string;
  method?: string;
  body?: unknown;
  params?: Record<string, string>;
  /** Simulated session key/value pairs, e.g. { adminId: 'admin-1' } */
  session?: Record<string, string>;
}

export function makeContext(opts: MakeContextOptions) {
  const { url, method = 'GET', body, params = {}, session = {} } = opts;

  const request = new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  return {
    request,
    params,
    url: new URL(url),
    session: {
      get: async (key: string) => session[key],
      set: () => {},
      destroy: async () => {}
    }
  } as any;
}
