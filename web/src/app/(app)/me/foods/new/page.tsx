import type { Metadata } from "next";
import { TopBar } from "@/components/app/top-bar";
import { CustomFoodForm } from "@/features/food/custom-food-form";

export const metadata: Metadata = { title: "Add a food" };

export default function NewFoodPage() {
  return (
    <>
      <TopBar title="Add a food" back />
      <CustomFoodForm />
    </>
  );
}
