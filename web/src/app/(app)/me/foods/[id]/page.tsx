import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/app/top-bar";
import { serverApi } from "@/lib/api/server";
import { CustomFoodForm } from "@/features/food/custom-food-form";

export const metadata: Metadata = { title: "Edit food" };

export default async function EditFoodPage(props: PageProps<"/me/foods/[id]">) {
  const { id } = await props.params;
  const food = await serverApi.foods.get(id);
  if (!food.isCustom) notFound();
  return (
    <>
      <TopBar title="Edit food" backHref="/me/foods" />
      <CustomFoodForm food={food} />
    </>
  );
}
