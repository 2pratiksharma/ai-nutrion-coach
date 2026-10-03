import type { Metadata } from "next";

export const metadata: Metadata = { title: "Create account" };

export default function Layout({ children }: LayoutProps<"/signup">) {
  return children;
}
