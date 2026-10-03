import rateLimit, { ipKeyGenerator, type Options } from "express-rate-limit";
import { env } from "../config/env.js";

/**
 * In-memory stores are per process. When running more than one API instance,
 * pass a shared store (e.g. rate-limit-redis) through `store`.
 */
function limiter(options: Partial<Options>) {
  return rateLimit({
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => !env.RATE_LIMIT_ENABLED,
    message: { error: "Too many requests. Please slow down and try again shortly." },
    ...options,
  });
}

export const authLimiter = limiter({ windowMs: 15 * 60 * 1000, limit: 20 });

export const passwordResetLimiter = limiter({ windowMs: 60 * 60 * 1000, limit: 5 });

export const apiLimiter = limiter({
  windowMs: 60 * 1000,
  limit: 300,
  keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? ""),
});

export const aiLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? ""),
});
