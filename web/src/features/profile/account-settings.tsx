"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { changePasswordSchema, deleteAccountSchema, updateAccountSchema, type User } from "@nutrition/shared";
import { BottomSheet } from "@/components/common/bottom-sheet";
import { Field, FormError } from "@/components/common/field";
import { Panel, Section } from "@/components/common/layout";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { formValues, useSubmit } from "@/lib/forms";

function ProfileDetails({ user }: { user: User }) {
  const router = useRouter();
  const [email, setEmail] = useState(user.email);
  const { errors, formError, pending, submit } = useSubmit(updateAccountSchema);
  const emailChanged = email.trim().toLowerCase() !== user.email;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const values = formValues(e.currentTarget);
        const body = {
          name: values.name,
          ...(emailChanged ? { email: values.email, currentPassword: values.currentPassword } : {}),
        };
        void submit(body, async (data) => {
          await api.account.update(data);
          toast.success("Details updated");
          router.refresh();
        });
      }}
    >
      <FormError message={formError} />
      <Field label="Name" name="name" defaultValue={user.name} autoComplete="name" error={errors.name} />
      <Field
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
      />
      {emailChanged && (
        <Field
          label="Current password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          hint="Needed to change your email."
          error={errors.currentPassword}
        />
      )}
      <Button type="submit" className="h-11 w-full rounded-xl" disabled={pending}>
        {pending ? "Saving..." : "Save details"}
      </Button>
    </form>
  );
}

function PasswordForm() {
  const form = useRef<HTMLFormElement>(null);
  const { errors, formError, pending, submit } = useSubmit(changePasswordSchema);
  return (
    <form
      ref={form}
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(formValues(e.currentTarget), async (data) => {
          await api.account.changePassword(data);
          form.current?.reset();
          toast.success("Password changed. Other devices were signed out.");
        });
      }}
    >
      <FormError message={formError} />
      <Field label="Current password" name="currentPassword" type="password" autoComplete="current-password" error={errors.currentPassword} />
      <Field label="New password" name="newPassword" type="password" autoComplete="new-password" hint="At least 8 characters." error={errors.newPassword} />
      <Button type="submit" variant="outline" className="h-11 w-full rounded-xl" disabled={pending}>
        {pending ? "Updating..." : "Change password"}
      </Button>
    </form>
  );
}

function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { errors, formError, pending, submit } = useSubmit(deleteAccountSchema);

  return (
    <>
      <Button variant="destructive" className="h-11 w-full rounded-xl" onClick={() => setOpen(true)}>
        Delete account
      </Button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="Delete your account?"
        description="This permanently deletes your profile, logs, custom foods and reminders. It can't be undone."
      >
        <form
          noValidate
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(formValues(e.currentTarget), async ({ password }) => {
              await api.account.remove(password);
              toast.success("Your account has been deleted");
              router.replace("/signup");
              router.refresh();
            });
          }}
        >
          <FormError message={formError} />
          <Field label="Enter your password to confirm" name="password" type="password" autoComplete="current-password" error={errors.password} />
          <Button type="submit" variant="destructive" className="h-12 w-full rounded-xl" disabled={pending}>
            {pending ? "Deleting..." : "Permanently delete"}
          </Button>
          <Button type="button" variant="ghost" className="h-11 w-full rounded-xl" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </form>
      </BottomSheet>
    </>
  );
}

export function AccountSettings({ user }: { user: User }) {
  return (
    <div className="space-y-5 px-4 pt-2 pb-8">
      <Section title="Your details">
        <Panel className="p-4">
          <ProfileDetails user={user} />
        </Panel>
      </Section>
      <Section title="Password">
        <Panel className="p-4">
          <PasswordForm />
        </Panel>
      </Section>
      <Section title="Danger zone">
        <Panel className="p-4">
          <DeleteAccount />
        </Panel>
      </Section>
    </div>
  );
}
