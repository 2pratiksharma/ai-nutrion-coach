"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signupSchema } from "@nutrition/shared";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/common/field";
import { api } from "@/lib/api/client";
import { formValues, useSubmit } from "@/lib/forms";

export default function SignupPage() {
  const router = useRouter();
  const { errors, formError, pending, submit } = useSubmit(signupSchema);

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(formValues(e.currentTarget), async (data) => {
          await api.auth.signup(data);
          router.replace("/onboarding");
          router.refresh();
        });
      }}
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Takes a minute. Your goals are set up next.</p>
      </div>
      <FormError message={formError} />
      <Field label="Your name" name="name" autoComplete="name" autoCapitalize="words" error={errors.name} />
      <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" error={errors.email} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        error={errors.password}
        hint="At least 8 characters."
      />
      <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base" disabled={pending}>
        {pending ? "Creating account..." : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary">
          Log in
        </Link>
      </p>
    </form>
  );
}
