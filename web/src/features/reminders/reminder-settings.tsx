"use client";

import { useEffect, useState } from "react";
import { BellOff, BellRing, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { REMINDER_TYPES, type ReminderSetting, type RemindersResponse } from "@nutrition/shared";
import { Panel, Section } from "@/components/common/layout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { pushSupported, urlBase64ToUint8Array, useInstall } from "@/lib/pwa";
import { cn } from "@/lib/utils";

type DeviceState = "loading" | "unsupported" | "needs-install" | "denied" | "off" | "on";

function useDevicePush(publicKey: string | null) {
  const { state: install } = useInstall();
  const [state, setState] = useState<DeviceState>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!pushSupported() || !publicKey) {
        // iOS only exposes push to apps added to the home screen.
        setState(install === "ios" ? "needs-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setState("denied");
      const registration = await navigator.serviceWorker.getRegistration("/");
      const sub = await registration?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, [publicKey, install]);

  async function enable() {
    if (!publicKey) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      await navigator.serviceWorker.ready;
      const sub =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
      await api.reminders.subscribe(sub.toJSON());
      setState("on");
      toast.success("Notifications are on for this device");
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't turn on notifications on this device."));
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const sub = await registration?.pushManager.getSubscription();
      if (sub) {
        await api.reminders.unsubscribe(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return { state, busy, enable, disable };
}

const DEVICE_COPY: Record<DeviceState, { title: string; body: string }> = {
  loading: { title: "Checking this device…", body: "" },
  unsupported: { title: "Not available here", body: "This browser can't show notifications from web apps. Try Chrome, Edge, Firefox or Safari." },
  "needs-install": { title: "Add to Home Screen first", body: "On iPhone, reminders work once NutriCoach is added to your Home Screen and opened from there." },
  denied: { title: "Notifications are blocked", body: "Allow notifications for this site in your browser settings, then come back." },
  off: { title: "Notifications are off", body: "Turn them on to get the reminders below on this device." },
  on: { title: "Notifications are on", body: "This device will receive your reminders." },
};

export function ReminderSettings({ initial }: { initial: RemindersResponse }) {
  const [data, setData] = useState(initial);
  const [saving, setSaving] = useState<string | null>(null);
  const device = useDevicePush(initial.push.publicKey);
  const copy = DEVICE_COPY[device.state];

  async function save(next: ReminderSetting) {
    const previous = data;
    setData((d) => ({ ...d, reminders: d.reminders.map((r) => (r.type === next.type ? next : r)) }));
    setSaving(next.type);
    try {
      setData(await api.reminders.save([next]));
    } catch (err) {
      setData(previous);
      toast.error(errorMessage(err));
    } finally {
      setSaving(null);
    }
  }

  async function test() {
    try {
      await api.reminders.test();
      toast.success("Test notification sent");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="space-y-5 px-4 pt-2 pb-8">
      {!initial.push.configured && (
        <Panel className="border-warning/40 p-4 text-sm">
          Push notifications aren&apos;t set up on the server yet, so reminders won&apos;t be delivered. Your choices below are still saved.
        </Panel>
      )}

      <Panel className="p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
            {device.state === "on" ? <BellRing className="size-5" /> : device.state === "needs-install" ? <Smartphone className="size-5" /> : <BellOff className="size-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{copy.title}</p>
            {copy.body && <p className="text-sm text-muted-foreground">{copy.body}</p>}
          </div>
        </div>
        {(device.state === "off" || device.state === "on") && (
          <div className="mt-4 flex gap-2">
            {device.state === "off" ? (
              <Button className="h-11 flex-1 rounded-xl" disabled={device.busy} onClick={() => void device.enable()}>
                Turn on notifications
              </Button>
            ) : (
              <>
                <Button variant="outline" className="h-11 flex-1 rounded-xl" onClick={() => void test()}>
                  Send a test
                </Button>
                <Button variant="ghost" className="h-11 flex-1 rounded-xl" disabled={device.busy} onClick={() => void device.disable()}>
                  Turn off
                </Button>
              </>
            )}
          </div>
        )}
      </Panel>

      <Section title={`Reminders · times in ${data.timezone.replace("_", " ")}`}>
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-xs">
          {data.reminders.map((r) => {
            const meta = REMINDER_TYPES[r.type];
            return (
              <li key={r.type} className="flex min-h-16 items-center gap-3 px-4 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium">{meta.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{meta.body}</p>
                </div>
                <input
                  type="time"
                  aria-label={`${meta.label} time`}
                  value={r.time}
                  disabled={!r.enabled}
                  onChange={(e) => e.target.value && void save({ ...r, time: e.target.value })}
                  className={cn("h-10 rounded-lg border bg-background px-2 text-sm", !r.enabled && "opacity-40")}
                />
                <Switch
                  checked={r.enabled}
                  disabled={saving === r.type}
                  aria-label={`${meta.label} reminder`}
                  onCheckedChange={(enabled) => void save({ ...r, enabled })}
                />
              </li>
            );
          })}
        </ul>
        <p className="px-1 text-xs text-muted-foreground">
          Smart reminders skip themselves when you&apos;ve already logged that meal, weighed in, or hit your water goal.
        </p>
      </Section>
    </div>
  );
}
