import webpush from "web-push";
import { env } from "../config/env.js";

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

export type PushResult = "sent" | "gone" | "failed";

if (env.pushConfigured) {
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
}

export const push = {
  configured: env.pushConfigured,
  publicKey: env.VAPID_PUBLIC_KEY ?? null,

  async send(target: PushTarget, payload: PushPayload): Promise<PushResult> {
    if (!env.pushConfigured) return "failed";
    try {
      await webpush.sendNotification(
        { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 },
      );
      return "sent";
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      // 404/410: the browser dropped the subscription; the caller should delete it.
      return status === 404 || status === 410 ? "gone" : "failed";
    }
  },
};
