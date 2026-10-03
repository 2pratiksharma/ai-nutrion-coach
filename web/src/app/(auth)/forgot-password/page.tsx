"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { forgotPasswordSchema } from "@nutrition/shared";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/common/field";
import { api } from "@/lib/api/client";
import { formValues, useSubmit } from "@/lib/forms";

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { errors, formError, pending, submit } = useSubmit(forgotPasswordSchema);

  if (sentTo) {
    return (
      <div className="space-y-4 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-secondary-foreground">
          <MailCheck className="size-7" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          If an account exists for <span className="font-medium text-foreground">{sentTo}</span>, we&apos;ve sent a link to
          reset your password. It expires in 1 hour.
        </p>
        <Button variant="outline" size="lg" className="h-12 w-full rounded-xl" nativeButton={false} render={<Link href="/login">Back to log in</Link>} />
      </div>
    );
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(formValues(e.currentTarget), async ({ email }) => {
          await api.auth.forgotPassword(email);
          setSentTo(email);
        });
      }}
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
        <p className="text-sm text-muted-foreground">Enter your email and we&apos;ll send you a reset link.</p>
      </div>
      <FormError message={formError} />
      <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" error={errors.email} />
      <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base" disabled={pending}>
        {pending ? "Sending..." : "Send reset link"}
      </Button>
      <p className="text-center text-sm">
        <Link href="/login" className="font-medium text-primary">
          Back to log in
        </Link>
      </p>
    </form>
  );
}
