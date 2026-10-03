import Image from "next/image";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-safe pb-safe">
      <div className="flex flex-1 flex-col justify-center gap-8 py-10">
        <div className="flex items-center gap-3">
          <Image src="/icons/icon-192.png" alt="" width={48} height={48} className="rounded-2xl shadow-sm" priority />
          <div>
            <p className="text-lg font-semibold tracking-tight">NutriCoach</p>
            <p className="text-sm text-muted-foreground">Eat well. Move more. Know your numbers.</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
