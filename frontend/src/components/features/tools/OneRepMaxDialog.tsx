"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { estimate1RM, REP_CAP } from "@/lib/utils/strength-calc";

interface OneRepMaxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Unit = "kg" | "lbs";

/** Training percentages people actually load off a 1RM. */
const PERCENTAGES = [100, 90, 80, 70] as const;

/**
 * Standalone 1RM calculator.
 *
 * Deliberately not wired into the logging form or history list: a 1RM is a
 * planning number, not a per-set readout. It lives behind one dashboard card
 * so it stays out of the way until the athlete goes looking for it.
 */
export function OneRepMaxDialog({ open, onOpenChange }: OneRepMaxDialogProps) {
  const t = useTranslations("tools.one_rep_max");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [unit, setUnit] = useState<Unit>("kg");

  const parsedWeight = Number.parseFloat(weight);
  const parsedReps = Number.parseInt(reps, 10);
  const repsValid = Number.isFinite(parsedReps) && parsedReps >= 1 && parsedReps <= REP_CAP;

  const result = useMemo(() => {
    if (!Number.isFinite(parsedWeight) || !repsValid) return null;
    return estimate1RM(parsedWeight, parsedReps);
  }, [parsedWeight, parsedReps, repsValid]);

  const hint = (() => {
    if (Number.isFinite(parsedReps) && !repsValid) {
      return t("reps_range_hint", { max: REP_CAP });
    }
    return t("empty_hint");
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none border border-border shadow-none sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="orm-weight">{t("weight_label")}</Label>
              <div className="flex gap-2">
                <Input
                  id="orm-weight"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="0"
                  className="tabular-nums"
                />
                <div className="flex border border-border">
                  {(["kg", "lbs"] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnit(u)}
                      aria-pressed={unit === u}
                      className={cn(
                        "px-2 font-mono text-[10px] uppercase tracking-[0.18em]",
                        unit === u
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orm-reps">{t("reps_label")}</Label>
              <Input
                id="orm-reps"
                type="number"
                inputMode="numeric"
                min="1"
                max={REP_CAP}
                step="1"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="1"
                className="tabular-nums"
              />
            </div>
          </div>

          <div className="border border-border bg-muted/30 px-4 py-4 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {t("result_label")}
            </p>
            {result !== null ? (
              <p className="mt-2 font-mono text-4xl font-semibold tabular-nums text-foreground">
                ~{result}{" "}
                <span className="text-xl text-muted-foreground">{unit}</span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
            )}
          </div>

          {result !== null && (
            <div className="grid grid-cols-4 gap-2">
              {PERCENTAGES.map((p) => (
                <div key={p} className="border border-border px-2 py-2 text-center">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {p}%
                  </p>
                  <p className="mt-1 font-mono text-sm tabular-nums text-foreground">
                    {Math.round(((result * p) / 100) * 10) / 10}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
