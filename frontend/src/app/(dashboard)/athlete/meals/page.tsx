"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { MealForm } from "@/components/features/meal/MealForm";
import { MealList } from "@/components/features/meal/MealList";
import { MealCalendar } from "@/components/features/meal/MealCalendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function MealsPage() {
  const [activeTab, setActiveTab] = useState("log");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Meals & Nutrition</h1>
        <p className="text-muted-foreground">
          Track your nutrition to reach your goals.
        </p>
      </div>

      <Tabs
        defaultValue="log"
        className="w-full"
        onValueChange={setActiveTab}
        value={activeTab}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="log">Log Meal</TabsTrigger>
          <TabsTrigger value="list">History (List)</TabsTrigger>
          <TabsTrigger value="calendar">History (Calendar)</TabsTrigger>
        </TabsList>

        <TabsContent value="log">
          <div className="max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Log New Meal</CardTitle>
                <CardDescription>Record what you ate.</CardDescription>
              </CardHeader>
              <CardContent>
                <MealForm onSuccess={() => setActiveTab("list")} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="list">
          <MealList />
        </TabsContent>

        <TabsContent value="calendar">
          <MealCalendar />
        </TabsContent>
      </Tabs>
    </div>
  );
}
