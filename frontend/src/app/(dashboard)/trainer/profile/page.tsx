"use client";

import { useEffect, useState } from "react";
import { trainerCatalogApi, availabilityApi } from "@/lib/api";
import dayjs from "dayjs";
import { TrainerProfile, TrainerAvailability } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function TrainerProfilePage() {
  const [profile, setProfile] = useState<TrainerProfile>({});
  const [availability, setAvailability] = useState<TrainerAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileData, availabilityData] = await Promise.all([
          trainerCatalogApi.getTrainerProfile("me"),
          availabilityApi.getMyAvailability(),
        ]);
        setProfile(profileData.trainerProfile || {});
        setAvailability(availabilityData.slots || []);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleProfileSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      await trainerCatalogApi.updateTrainerProfile(profile);
      setMessage("Profile saved successfully!");
    } catch (error) {
      setMessage("Failed to save profile");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleAvailabilitySave = async () => {
    setSaving(true);
    setMessage("");
    try {
      await availabilityApi.setMyAvailability(availability);
      setMessage("Availability saved successfully!");
    } catch (error) {
      setMessage("Failed to save availability");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const addTimeSlot = (dayOfWeek: number) => {
    const newSlot: TrainerAvailability = {
      availabilityId: `new-${dayjs().valueOf()}`,
      trainerId: "",
      dayOfWeek,
      startTime: "09:00",
      endTime: "17:00",
      isBooked: false,
      createdAt: dayjs().toISOString(),
      updatedAt: dayjs().toISOString(),
    };
    setAvailability([...availability, newSlot]);
  };

  const updateSlot = (
    index: number,
    field: keyof TrainerAvailability,
    value: string | number | boolean,
  ) => {
    const updated = [...availability];
    updated[index] = { ...updated[index], [field]: value };
    setAvailability(updated);
  };

  const removeSlot = (index: number) => {
    setAvailability(availability.filter((_, i) => i !== index));
  };

  if (loading) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">My Trainer Profile</h1>

      {message && (
        <div
          className={`mb-4 p-3 rounded ${message.includes("Failed") ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Public Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell athletes about yourself..."
                value={profile.bio || ""}
                onChange={(e) =>
                  setProfile({ ...profile, bio: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
              <Input
                id="hourlyRate"
                type="number"
                value={profile.hourlyRate || ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    hourlyRate: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="yearsOfExperience">Years of Experience</Label>
              <Input
                id="yearsOfExperience"
                type="number"
                value={profile.yearsOfExperience || ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    yearsOfExperience: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., New York, NY"
                value={profile.location || ""}
                onChange={(e) =>
                  setProfile({ ...profile, location: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="languages">Languages (comma-separated)</Label>
              <Input
                id="languages"
                placeholder="e.g., English, Spanish"
                value={profile.languages?.join(", ") || ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    languages: e.target.value.split(",").map((s) => s.trim()),
                  })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isAvailable"
                checked={profile.isAvailableForNewClients ?? true}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    isAvailableForNewClients: e.target.checked,
                  })
                }
              />
              <Label htmlFor="isAvailable">Available for new clients</Label>
            </div>
            <Button onClick={handleProfileSave} disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Availability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {DAYS_OF_WEEK.map((day, index) => {
              const daySlots = availability.filter(
                (s) => s.dayOfWeek === index,
              );
              return (
                <div key={day} className="border-b pb-4 last:border-0">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">{day}</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addTimeSlot(index)}
                    >
                      Add Slot
                    </Button>
                  </div>
                  {daySlots.map((slot, slotIndex) => {
                    const actualIndex = availability.findIndex(
                      (s) => s === slot,
                    );
                    return (
                      <div
                        key={slot.availabilityId}
                        className="flex gap-2 items-center mb-2"
                      >
                        <Input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) =>
                            updateSlot(actualIndex, "startTime", e.target.value)
                          }
                          className="w-32"
                        />
                        <span>to</span>
                        <Input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) =>
                            updateSlot(actualIndex, "endTime", e.target.value)
                          }
                          className="w-32"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeSlot(actualIndex)}
                        >
                          X
                        </Button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            <Button onClick={handleAvailabilitySave} disabled={saving}>
              {saving ? "Saving..." : "Save Availability"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
