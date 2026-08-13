import { env } from "./env";

const normalizeOrigin = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const defaultClientOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://103.121.194.11",
  "http://ijfst.bup.edu.bd",
  "https://ijfst.bup.edu.bd",
  "http://jfst.bup.edu.bd",
  "https://jfst.bup.edu.bd",
];

export const allowedClientOrigins = Array.from(
  new Set(
    [...env.clientUrls, ...defaultClientOrigins]
      .map(normalizeOrigin)
      .filter((origin): origin is string => Boolean(origin))
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
    normalizedOrigin &&
      allowedClientOrigins.includes(normalizedOrigin)
  );
};
