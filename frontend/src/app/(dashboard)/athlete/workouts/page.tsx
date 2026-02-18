"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { WorkoutForm } from "@/components/features/workout/WorkoutForm";
import { WorkoutList } from "@/components/features/workout/WorkoutList";
import { WorkoutCalendar } from "@/components/features/workout/WorkoutCalendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function WorkoutsPage() {
  const [activeTab, setActiveTab] = useState("log");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Workouts</h1>
        <p className="text-muted-foreground">
          Log your training and track your progress.
        </p>
      </div>

      <Tabs
        defaultValue="log"
        className="w-full"
        onValueChange={setActiveTab}
        value={activeTab}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="log">Log Workout</TabsTrigger>
          <TabsTrigger value="list">History (List)</TabsTrigger>
          <TabsTrigger value="calendar">History (Calendar)</TabsTrigger>
        </TabsList>

        <TabsContent value="log">
          <div className="max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Log New Workout</CardTitle>
                <CardDescription>
                  Record your latest session details.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WorkoutForm onSuccess={() => setActiveTab("list")} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="list">
          <WorkoutList />
        </TabsContent>

        <TabsContent value="calendar">
          <WorkoutCalendar />
        </TabsContent>
      </Tabs>
    </div>
  );
}
