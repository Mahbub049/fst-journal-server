import { env } from "./env";

const normalizeOrigin = (value: string): string | null => {
  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
};

const developmentOrigins =
  env.nodeEnv === "production"
    ? []
    : ["http://localhost:3000", "http://localhost:3001"];

export const allowedClientOrigins = Array.from(
  new Set(
    [...env.clientUrls, ...developmentOrigins]
      .map(normalizeOrigin)
      .filter((origin): origin is string => Boolean(origin))
      .filter(
        (origin) =>
          env.nodeEnv !== "production" || origin.startsWith("https://")
      )
  )
);

export const isAllowedClientOrigin = (
  origin: string | undefined | null
): boolean => {
  if (!origin) {
    return false;
  }

  const normalizedOrigin = normalizeOrigin(origin);

  return Boolean(
    normalizedOrigin && allowedClientOrigins.includes(normalizedOrigin)
  );
};
