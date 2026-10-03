"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loginSchema } from "@nutrition/shared";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/common/field";
import { api } from "@/lib/api/client";
import { formValues, useSubmit } from "@/lib/forms";
import { safeNextPath } from "@/lib/format";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { errors, formError, pending, submit } = useSubmit(loginSchema);

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(formValues(e.currentTarget), async (data) => {
          const session = await api.auth.login(data);
          router.replace(session.hasProfile ? safeNextPath(params.get("next")) : "/onboarding");
          router.refresh();
        });
      }}
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Log in to pick up where you left off.</p>
      </div>
      <FormError message={formError} />
      <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" error={errors.email} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" error={errors.password} />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-medium text-primary">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base" disabled={pending}>
        {pending ? "Logging in..." : "Log in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/signup" className="font-medium text-primary">
          Create an account
        </Link>
      </p>
    </form>
  );
}
