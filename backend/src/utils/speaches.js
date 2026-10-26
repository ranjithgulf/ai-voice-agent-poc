import { env } from "../config/env.js";

export function speachesError(code) {
  return Object.assign(new Error(code), { code });
}

export function speachesEndpoint(path) {
  let base;
  try {
    base = new URL(env.speachesBaseUrl);
  } catch {
    throw speachesError("NOT_CONFIGURED");
  }

  if (base.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)
      || base.username || base.password) {
    throw speachesError("NOT_CONFIGURED");
  }

  return new URL(`/v1/audio/${path}`, base);
}
