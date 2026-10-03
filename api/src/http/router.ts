import { Router, type Request, type Response } from "express";
import type { z } from "zod";
import { userIdOf } from "./auth.js";

export interface RequestContext<TBody, TQuery> {
  userId: string;
  body: TBody;
  query: TQuery;
  params: Record<string, string>;
  req: Request;
  res: Response;
}

interface RouteSchemas<B extends z.ZodType, Q extends z.ZodType> {
  body?: B;
  query?: Q;
}

type Handler<B extends z.ZodType, Q extends z.ZodType> = (
  ctx: RequestContext<z.infer<B>, z.infer<Q>>,
) => Promise<unknown> | unknown;

/**
 * Thin wrapper over Express routes for authenticated JSON endpoints: validates input with the
 * shared schemas and sends whatever the handler returns (204 for undefined).
 */
export function authedRoute<B extends z.ZodType = z.ZodUnknown, Q extends z.ZodType = z.ZodUnknown>(
  schemas: RouteSchemas<B, Q>,
  handler: Handler<B, Q>,
  successStatus = 200,
) {
  return async (req: Request, res: Response) => {
    const ctx: RequestContext<z.infer<B>, z.infer<Q>> = {
      userId: userIdOf(req),
      body: (schemas.body ? schemas.body.parse(req.body) : req.body) as z.infer<B>,
      query: (schemas.query ? schemas.query.parse(req.query) : req.query) as z.infer<Q>,
      params: req.params as Record<string, string>,
      req,
      res,
    };
    const result = await handler(ctx);
    if (res.headersSent) return;
    if (result === undefined) res.status(204).end();
    else res.status(successStatus).json(result);
  };
}

export const createRouter = () => Router();
