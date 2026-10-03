import type { Metadata } from "next";

export const metadata: Metadata = { title: "Forgot password" };

export default function Layout({ children }: LayoutProps<"/forgot-password">) {
  return children;
}
