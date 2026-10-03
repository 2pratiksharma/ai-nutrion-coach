import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-4xl" aria-hidden>
        🔍
      </p>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-sm text-muted-foreground">That page doesn&apos;t exist or was removed.</p>
      <Button className="mt-2 h-11 rounded-xl px-5" nativeButton={false} render={<Link href="/">Go to Today</Link>} />
    </div>
  );
}
