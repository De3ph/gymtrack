"use client"

import { useState, useEffect, useTransition } from "react"
import { trainerCatalogApi } from "@/lib/api"
import { TrainerWithProfile } from "@/types"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { motion } from "motion/react"
import { staggerContainer, staggerItem } from "@/lib/animations"
import TrainerCatalogCard from "@/components/features/trainer/TrainerCatalogCard"
import { useTranslations } from "next-intl"
import { X } from "lucide-react"

export default function TrainerCatalogPage() {
  const [trainers, setTrainers] = useState<TrainerWithProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    specialization: "",
    location: "",
    minRating: 0,
    availableForNewClients: false,
  })
  const [isPending, startTransition] = useTransition()
  const t = useTranslations("athlete.trainers")
  const tCommon = useTranslations("common")

  useEffect(() => {
    loadTopTrainers()
  }, [])

  const loadTopTrainers = async () => {
    setLoading(true)
    try {
      const response = await trainerCatalogApi.searchTrainers({
        limit: 20,
      })
      setTrainers(response.trainers)
    } catch (error) {
      console.error("Failed to load top trainers:", error)
    } finally {
      setLoading(false)
    }
  }

  const searchTrainers = async () => {
    setLoading(true)
    try {
      const response = await trainerCatalogApi.searchTrainers({
        specialization: filters.specialization || undefined,
        location: filters.location || undefined,
        minRating: filters.minRating || undefined,
        availableForNewClients: filters.availableForNewClients || undefined,
      })
      setTrainers(response.trainers)
    } catch (error) {
      console.error("Failed to search trainers:", error)
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    startTransition(() => {
      setFilters({
        specialization: "",
        location: "",
        minRating: 0,
        availableForNewClients: false,
      })
    })
  }

  const hasActiveFilters =
    filters.specialization ||
    filters.location ||
    filters.minRating > 0 ||
    filters.availableForNewClients

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <header className="mb-8">
        <p className="font-mono text-xs font-medium uppercase tracking-widest text-primary">
          {t("eyebrow")}
        </p>
        <h1
          className="mt-2 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl"
          style={{ letterSpacing: "-0.02em" }}
        >
          {t("headline")}
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">{t("subhead")}</p>
      </header>

      <div className="mb-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-4 md:flex-row md:items-end md:gap-3">
        <div className="flex-1 space-y-1.5">
          <Label
            htmlFor="specialization"
            className="text-xs font-medium text-muted-foreground"
          >
            {t("specialization")}
          </Label>
          <Input
            id="specialization"
            placeholder={t("specialization_placeholder")}
            value={filters.specialization}
            onChange={(e) =>
              startTransition(() => {
                setFilters({ ...filters, specialization: e.target.value })
              })
            }
          />
        </div>
        <div className="flex-1 space-y-1.5">
          <Label
            htmlFor="location"
            className="text-xs font-medium text-muted-foreground"
          >
            {t("location")}
          </Label>
          <Input
            id="location"
            placeholder={t("location_placeholder")}
            value={filters.location}
            onChange={(e) =>
              startTransition(() => {
                setFilters({ ...filters, location: e.target.value })
              })
            }
          />
        </div>
        <div className="w-full space-y-1.5 md:w-40">
          <Label className="text-xs font-medium text-muted-foreground">
            {t("min_rating")}
          </Label>
          <Select
            value={String(filters.minRating)}
            onValueChange={(v) =>
              startTransition(() => {
                setFilters({ ...filters, minRating: parseFloat(v ?? "0") })
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Min ★" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Any</SelectItem>
              <SelectItem value="3">3 ★</SelectItem>
              <SelectItem value="3.5">3.5 ★</SelectItem>
              <SelectItem value="4">4 ★</SelectItem>
              <SelectItem value="4.5">4.5 ★</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pb-2 md:pb-0">
          <Checkbox
            id="openOnly"
            checked={filters.availableForNewClients}
            onCheckedChange={(checked) =>
              startTransition(() => {
                setFilters({
                  ...filters,
                  availableForNewClients: checked === true,
                })
              })
            }
          />
          <Label htmlFor="openOnly" className="text-sm font-medium">
            {t("open_only")}
          </Label>
        </div>
        <Button onClick={searchTrainers} className="w-full md:w-auto">
          {t("search")}
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="w-full md:w-auto"
          >
            <X className="mr-1 h-4 w-4" />
            {tCommon("actions.clear")}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">{t("loading")}</p>
        </div>
      ) : trainers.length === 0 ? (
        <div className="py-16 text-center">
          <h3 className="text-lg font-semibold text-foreground">
            {t("empty_title")}
          </h3>
          <p className="mt-1 text-muted-foreground">{t("empty_desc")}</p>
          {hasActiveFilters && (
            <Button variant="outline" className="mt-4" onClick={clearFilters}>
              {tCommon("actions.clear")}
            </Button>
          )}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {trainers.map((trainer) => (
            <motion.div key={trainer.userId} variants={staggerItem}>
              <TrainerCatalogCard trainer={trainer} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
