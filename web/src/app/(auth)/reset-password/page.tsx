"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { resetPasswordSchema } from "@nutrition/shared";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/common/field";
import { api } from "@/lib/api/client";
import { formValues, useSubmit } from "@/lib/forms";

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const { errors, formError, pending, submit } = useSubmit(resetPasswordSchema);

  if (!token) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Link is incomplete</h1>
        <p className="text-sm text-muted-foreground">Open the link from your email again, or request a new one.</p>
        <Button size="lg" className="h-12 w-full rounded-xl" nativeButton={false} render={<Link href="/forgot-password">Request a new link</Link>} />
      </div>
    );
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit({ ...formValues(e.currentTarget), token }, async (data) => {
          const session = await api.auth.resetPassword(data);
          toast.success("Password updated. You're logged in.");
          router.replace(session.hasProfile ? "/" : "/onboarding");
          router.refresh();
        });
      }}
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">You&apos;ll be signed out on other devices.</p>
      </div>
      <FormError message={formError ?? errors.token} />
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        error={errors.password}
        hint="At least 8 characters."
      />
      <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base" disabled={pending}>
        {pending ? "Saving..." : "Save password"}
      </Button>
      {errors.token && (
        <p className="text-center text-sm">
          <Link href="/forgot-password" className="font-medium text-primary">
            Request a new link
          </Link>
        </p>
      )}
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
