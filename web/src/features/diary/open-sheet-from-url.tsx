"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuickAdd } from "@/components/app/quick-add";

/** Opens a quick-add sheet requested by a link (e.g. a weigh-in reminder), then cleans the URL. */
export function OpenSheetFromUrl() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { openWeight, openSteps } = useQuickAdd();
  const sheet = params.get("sheet");

  useEffect(() => {
    if (sheet !== "weight" && sheet !== "steps") return;
    if (sheet === "weight") openWeight();
    else openSteps();
    const rest = new URLSearchParams(params);
    rest.delete("sheet");
    router.replace(rest.size ? `${pathname}?${rest}` : pathname, { scroll: false });
  }, [sheet, params, pathname, router, openWeight, openSteps]);

  return null;
}
