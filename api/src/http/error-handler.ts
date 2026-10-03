import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import type { ApiErrorBody } from "@nutrition/shared";
import { HttpError } from "./errors.js";

export function notFoundHandler(_req: Request, res: Response<ApiErrorBody>) {
  res.status(404).json({ error: "Route not found" });
}

export function errorHandler(err: unknown, req: Request, res: Response<ApiErrorBody>, _next: NextFunction) {
  if (err instanceof ZodError) {
    const issue = err.issues[0];
    const field = issue?.path.join(".") || undefined;
    res.status(400).json({ error: issue?.message ?? "Invalid input", field });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, field: err.field });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({ error: "Already exists" });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ error: "Not found" });
      return;
    }
  }
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "Malformed JSON body" });
    return;
  }
  req.log.error({ err }, "unhandled error");
  res.status(500).json({ error: "Something went wrong. Please try again." });
}
