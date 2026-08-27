import { Suspense } from "react";
import MealsClient from "./MealsClient";

export default function MealsPage() {
  return (
    <Suspense fallback={null}>
      <MealsClient />
    </Suspense>
  );
}
