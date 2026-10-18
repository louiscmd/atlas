import "server-only";
// Server-only configuration. Never import from client components.
export const env = {
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  secret: process.env.APP_SECRET ?? (process.env.NODE_ENV === "production" ? (() => { throw new Error("APP_SECRET is required"); })() : "dev-secret"),
  anthropicKey: process.env.ANTHROPIC_API_KEY || null,
  aiModel: process.env.AI_MODEL || "claude-opus-5-5",
  googleClientId: process.env.GOOGLE_CLIENT_ID || null,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || null,
  appleClientId: process.env.APPLE_CLIENT_ID || null,
  isProd: process.env.NODE_ENV === "production",
};
export const features = {
  ai: !!env.anthropicKey,
  /** Development only: returns a labelled sample scan when no AI key is configured. */
  visionDevSample: !env.anthropicKey && !env.isProd && process.env.FOOD_VISION_DEV_SAMPLE === "1",
  google: !!(env.googleClientId && env.googleClientSecret),
  apple: false, // Apple sign-in requires a signed client-secret JWT; see README.
};
