"use client";

import { Separator } from "@/components/ui/separator";
import { motion } from "motion/react";
import { reducedMotionVariants, textReveal, textStagger } from "./landing-variants";
import { useReducedMotion } from "./useReducedMotion";

interface SectionRailProps {
  index: string;
  label: string;
}

export function SectionRail({ index, label }: SectionRailProps) {
  const reducedMotion = useReducedMotion();
  const staggerVariants = reducedMotion ? reducedMotionVariants : textStagger;
  const revealVariants = reducedMotion ? reducedMotionVariants : textReveal;

  return (
    <motion.div
      variants={staggerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      className="mb-10 flex items-baseline gap-6 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
    >
      <motion.span variants={revealVariants} className="text-foreground">
        §{index}
      </motion.span>
      <motion.span variants={revealVariants}>{label}</motion.span>
      <motion.div variants={revealVariants} className="flex-1">
        <Separator className="flex-1" />
      </motion.div>
    </motion.div>
  );
}