import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Salad } from "lucide-react";
import { macrosForQuantity } from "@nutrition/shared";
import { TopBar } from "@/components/app/top-bar";
import { EmptyState, ListGroup, Row, Screen } from "@/components/common/layout";
import { Button } from "@/components/ui/button";
import { serverApi } from "@/lib/api/server";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "My foods" };

export default async function MyFoodsPage() {
  const foods = await serverApi.foods.search({ scope: "mine", limit: 50 });

  return (
    <>
      <TopBar
        title="My foods"
        backHref="/me"
        actions={
          <Link href="/me/foods/new" aria-label="Add a food" className="grid size-11 place-items-center rounded-full text-primary active:bg-muted">
            <Plus className="size-6" />
          </Link>
        }
      />
      <Screen className="pt-2">
        {foods.length === 0 ? (
          <div className="rounded-2xl border bg-card">
            <EmptyState
              icon={<Salad className="size-6" />}
              title="No custom foods yet"
              body="Add home recipes or packaged foods that aren't in the list."
              action={<Button nativeButton={false} className="rounded-full" render={<Link href="/me/foods/new">Add a food</Link>} />}
            />
          </div>
        ) : (
          <ListGroup>
            {foods.map((f) => {
              const serving = macrosForQuantity(f, f.servingGrams);
              return (
                <Row
                  key={f.id}
                  href={`/me/foods/${f.id}`}
                  title={f.name}
                  subtitle={`${f.servingLabel} · ${formatNumber(serving.calories)} kcal · ${formatNumber(serving.proteinG, 1)} g protein`}
                />
              );
            })}
          </ListGroup>
        )}
      </Screen>
    </>
  );
}
