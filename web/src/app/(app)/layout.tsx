import { BottomNav } from "@/components/app/bottom-nav";
import { QuickAddProvider } from "@/components/app/quick-add";
import { getProfile, requireOnboardedSession } from "@/lib/api/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireOnboardedSession();
  const { currentWeightKg } = await getProfile();

  return (
    <QuickAddProvider lastWeightKg={currentWeightKg}>
      <div className="mx-auto min-h-dvh w-full max-w-md bg-background pb-nav md:border-x">
        {children}
      </div>
      <BottomNav />
    </QuickAddProvider>
  );
}
