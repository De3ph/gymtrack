import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import PublicProfileField from "./PublicProfileField"
import { trainerCatalogApi } from "@/lib/api"
import { TrainerProfile } from "@/types"
import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"

interface PublicProfileCardProps {
  onMessage: (message: string) => void
}

export default function PublicProfileCard({
  onMessage
}: PublicProfileCardProps) {
  const [profile, setProfile] = useState<TrainerProfile>({})
  const [saving, setSaving] = useState(false)

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["trainerProfile"],
    queryFn: () => trainerCatalogApi.getTrainerProfile("me"),
    staleTime: 5 * 60 * 1000,
  })

  // Sync profile data when query returns
  useEffect(() => {
    if (profileData?.trainerProfile) {
      setProfile(profileData.trainerProfile)
    }
  }, [profileData])

  if (isLoading) {
    return <Card><CardContent className='p-6'>Loading profile...</CardContent></Card>
  }

  const handleProfileSave = async () => {
    setSaving(true)
    onMessage("")
    try {
      await trainerCatalogApi.updateTrainerProfile(profile)
      onMessage("Profile saved successfully!")
    } catch (error) {
      onMessage("Failed to save profile")
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Public Profile</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <PublicProfileField>
          <Label htmlFor='bio'>Bio</Label>
          <Textarea
            id='bio'
            placeholder='Tell athletes about yourself...'
            value={profile.bio || ""}
            onChange={(e) =>
              setProfile({ ...profile, bio: e.target.value })
            }
          />
        </PublicProfileField>
        <PublicProfileField>
          <Label htmlFor='hourlyRate'>Hourly Rate ($)</Label>
          <Input
            id='hourlyRate'
            type='number'
            value={profile.hourlyRate || ""}
            onChange={(e) =>
              setProfile({
                ...profile,
                hourlyRate: parseFloat(e.target.value) || 0
              })
            }
          />
        </PublicProfileField>
        <PublicProfileField>
          <Label htmlFor='yearsOfExperience'>Years of Experience</Label>
          <Input
            id='yearsOfExperience'
            type='number'
            value={profile.yearsOfExperience || ""}
            onChange={(e) =>
              setProfile({
                ...profile,
                yearsOfExperience: parseInt(e.target.value) || 0
              })
            }
          />
        </PublicProfileField>
        <PublicProfileField>
          <Label htmlFor='location'>Location</Label>
          <Input
            id='location'
            placeholder='e.g., New York, NY'
            value={profile.location || ""}
            onChange={(e) =>
              setProfile({ ...profile, location: e.target.value })
            }
          />
        </PublicProfileField>
        <PublicProfileField>
          <Label htmlFor='languages'>Languages (comma-separated)</Label>
          <Input
            id='languages'
            placeholder='e.g., English, Spanish'
            value={profile.languages?.join(", ") || ""}
            onChange={(e) =>
              setProfile({
                ...profile,
                languages: e.target.value.split(",").map((s) => s.trim())
              })
            }
          />
        </PublicProfileField>
        <div className='flex items-center gap-2'>
          <input
            type='checkbox'
            id='isAvailable'
            checked={profile.isAvailableForNewClients ?? true}
            onChange={(e) =>
              setProfile({
                ...profile,
                isAvailableForNewClients: e.target.checked
              })
            }
          />
          <Label htmlFor='isAvailable'>Available for new clients</Label>
        </div>
        <Button onClick={handleProfileSave} disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </CardContent>
    </Card>
  )
}
