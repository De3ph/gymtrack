"use client";

import { useEffect, useRef, useState } from "react";
import { Space_Grotesk } from "next/font/google";
import { motion, useScroll, useSpring, useInView } from "motion/react";
import {
  ArrowUpRight,
  ClipboardList,
  Dumbbell,
  HeartHandshake,
  NotebookPen,
  Ruler,
  ScanLine,
  Timer,
  UsersRound,
  Zap,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/routes";
import { LandingHeader } from "@/components/features/landing/LandingHeader";

const display = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
});

function useCountUp(target: number, active: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const dur = 1400;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active]);
  return value;
}

export function AboutClient() {
  const t = useTranslations("about");
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  return (
    <div className={`min-h-screen bg-background text-foreground ${display.variable}`}>
      <div className="mx-auto max-w-[88rem] px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-[6rem_1fr]">
          <aside aria-hidden="true" className="hidden border-r border-border lg:block">
            <div className="sticky top-0 flex h-screen flex-col justify-between py-8">
              <span className="origin-top-left translate-x-6 translate-y-6 -rotate-90 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {t("aside_top")}
              </span>

              <div className="relative mx-auto flex h-[52vh] w-[2.2rem] flex-col items-center">
                <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
                <motion.div
                  style={{ scaleY, originY: 0 }}
                  className="absolute left-1/2 top-0 w-px -translate-x-1/2 bg-foreground"
                />
                <div className="relative flex h-full flex-col justify-between py-2 font-mono text-[9px] leading-none text-muted-foreground">
                  {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((n) => (
                    <span key={n} className="flex items-center gap-1.5">
                      <span className={`h-px w-2 bg-border ${n % 20 === 0 ? "w-3 bg-foreground" : ""}`} />
                      {n % 20 === 0 ? String(n).padStart(3, "0") : ""}
                    </span>
                  ))}
                </div>
                <span className="absolute bottom-0 left-1/2 flex -translate-x-1/2 -rotate-90 items-center gap-2 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.18em] text-foreground">
                  <Ruler className="size-3 rotate-90" /> {t("tape")}
                </span>
              </div>

              <span className="origin-bottom-left translate-x-6 -translate-y-6 -rotate-90 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {t("aside_bottom")}
              </span>
            </div>
          </aside>

          <main className="flex flex-col">
            <div className="py-6 sm:py-8">
              <LandingHeader />
            </div>

            <section
              ref={heroRef}
              className="relative overflow-hidden border-y border-border"
              aria-labelledby="about-hero-heading"
            >
              <div className="absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-200/60 via-transparent to-transparent dark:from-stone-800/40" />
                <div className="absolute inset-0 opacity-[0.04] [background-image:repeating-linear-gradient(0deg,transparent_0_22px,currentColor_22px_23px)]" />
                <div className="absolute right-[-8%] top-[12%] hidden h-[120%] w-[42%] rotate-[-8deg] border border-dashed border-foreground/15 lg:block" />
              </div>

              <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
                <div className="px-6 py-12 sm:px-10 sm:py-16 lg:py-20">
                  <p className="inline-flex items-center gap-2 border border-foreground bg-foreground px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-background">
                    <span className="size-1.5 animate-pulse bg-teal-400" aria-hidden />
                    {t("badge")}
                  </p>

                  <h1
                    id="about-hero-heading"
                    className="mt-6 font-[var(--font-display)] text-[2.6rem] font-medium leading-[1.05] tracking-[-0.04em] sm:text-[3.6rem] lg:text-[4.6rem]"
                  >
                    <span className="block text-foreground">{t("hero.plan")}</span>
                    <span className="block font-mono text-[0.34em] font-normal uppercase tracking-[0.18em] text-muted-foreground">
                      {t("hero.and")}
                    </span>
                    <span className="block text-foreground">
                      {t("hero.proof")}<span className="text-primary">,</span>
                    </span>
                    <span className="relative inline-block">
                      <span className="relative z-10 bg-foreground px-2 text-background">{t("hero.suffix")}</span>
                      <span className="absolute inset-0 translate-x-1 translate-y-1 bg-primary/20" aria-hidden />
                    </span>
                  </h1>

                  <p className="mt-8 max-w-[36rem] text-pretty text-[15px] leading-7 text-muted-foreground sm:text-base sm:leading-8">
                    {t("hero.description")}
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      href={ROUTES.REGISTER}
                      className="inline-flex h-11 items-center gap-2 border border-foreground bg-foreground px-6 font-mono text-xs uppercase tracking-[0.18em] text-background transition hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {t("hero.cta_start")} <ArrowUpRight className="size-4" />
                    </Link>
                    <Link
                      href={ROUTES.ABOUT}
                      className="inline-flex h-11 items-center gap-2 border border-border bg-transparent px-6 font-mono text-xs uppercase tracking-[0.18em] hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {t("hero.cta_crew")}
                    </Link>
                  </div>

                  <div className="mt-10 grid grid-cols-3 divide-x divide-border border-y border-border">
                    {[
                      { k: t("stats.founded_label"), v: t("stats.founded_value"), sub: t("stats.founded_sub") },
                      { k: t("stats.loop_label"), v: t("stats.loop_value"), sub: t("stats.loop_sub") },
                      { k: t("stats.window_label"), v: t("stats.window_value"), sub: t("stats.window_sub") },
                    ].map((s) => (
                      <div key={s.k} className="px-4 py-4 sm:px-6">
                        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                          {s.k}
                        </div>
                        <div className="font-mono text-2xl font-semibold tracking-tight">{s.v}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{s.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative border-t border-border bg-card lg:border-l lg:border-t-0">
                  <div className="absolute left-0 top-0 hidden h-full w-6 -translate-x-full items-center justify-center border-y border-l border-dashed border-foreground/20 bg-stone-100 lg:flex dark:bg-stone-900">
                    <span className="rotate-90 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                      {t("ledger.perforate")}
                    </span>
                  </div>

                  <div className="p-6 sm:p-8">
                    <div className="flex items-center justify-between border-b border-dashed border-border pb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <NotebookPen className="size-3.5" /> {t("ledger.title")}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-teal-500" /> {t("ledger.live")}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {[
                        {
                          day: t("ledger.mon_day"),
                          title: t("ledger.mon_title"),
                          meta: t("ledger.mon_meta"),
                          tone: "bg-red-50 border-red-200 dark:bg-red-950/30",
                          dot: "bg-red-600",
                        },
                        {
                          day: t("ledger.tue_day"),
                          title: t("ledger.tue_title"),
                          meta: t("ledger.tue_meta"),
                          tone: "bg-teal-50 border-teal-200 dark:bg-teal-950/30",
                          dot: "bg-teal-600",
                        },
                        {
                          day: t("ledger.wed_day"),
                          title: t("ledger.wed_title"),
                          meta: t("ledger.wed_meta"),
                          tone: "bg-amber-50 border-amber-200 dark:bg-amber-950/30",
                          dot: "bg-amber-500",
                        },
                      ].map((row) => (
                        <div
                          key={row.day}
                          className={`flex gap-3 border px-3 py-3 ${row.tone}`}
                        >
                          <div className="flex w-10 shrink-0 flex-col items-center justify-center border-r border-black/10 pr-3">
                            <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                              {row.day}
                            </span>
                            <span className={`mt-1 size-2 rounded-full ${row.dot}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-mono text-xs font-semibold uppercase tracking-wide">
                              {row.title}
                            </div>
                            <div className="font-mono text-[11px] text-muted-foreground">{row.meta}</div>
                          </div>
                          <ScanLine className="ml-auto hidden size-4 shrink-0 text-muted-foreground sm:block" />
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 border border-foreground bg-foreground p-4 text-background">
                      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-background/70">
                        <HeartHandshake className="size-3.5" /> {t("ledger.coach_label")}
                      </div>
                      <p className="mt-2 font-mono text-xs leading-6">
                        {t("ledger.coach_body")}
                      </p>
                      <div className="mt-2 font-mono text-[10px] text-background/60">{t("ledger.coach_author")}</div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 border border-dashed border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      <Timer className="size-3.5" />
                      {t("ledger.honest")}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border bg-stone-100 px-6 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground dark:bg-stone-900">
                    <span>{t("ledger.ledger_id")}</span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-1.5 bg-foreground" /> {t("ledger.carbon_copy")}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <SectionRail index="01" label={t("rail.origin")} />

            <section className="grid gap-8 border-t border-border py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
              <div>
                <h2 className="font-[var(--font-display)] text-3xl font-semibold leading-none tracking-[-0.04em] sm:text-4xl">
                  {t("origin.title_a")}
                  <br />
                  <span className="text-muted-foreground">{t("origin.title_b")}</span>
                </h2>
                <div className="mt-6 space-y-4 text-sm leading-7 text-muted-foreground sm:text-[15px]">
                  <p>{t("origin.p1")}</p>
                  <p>{t("origin.p2")}</p>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: ClipboardList, title: t("origin.card1_title"), desc: t("origin.card1_desc") },
                    { icon: UsersRound, title: t("origin.card2_title"), desc: t("origin.card2_desc") },
                  ].map((c) => (
                    <div key={c.title} className="border border-border bg-card p-4">
                      <c.icon className="size-4 text-muted-foreground" />
                      <div className="mt-3 font-mono text-xs font-semibold uppercase tracking-wide">{c.title}</div>
                      <div className="mt-1 text-xs leading-6 text-muted-foreground">{c.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="border border-border bg-card">
                  <div className="border-b border-border px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {t("origin.timeline_title")}
                  </div>
                  <ol className="relative pl-10 pr-6 py-6">
                    <div className="absolute bottom-6 left-[1.65rem] top-6 w-px bg-border" aria-hidden />
                    {[
                      {
                        year: "2023",
                        title: t("origin.y2023_title"),
                        text: t("origin.y2023_text"),
                      },
                      {
                        year: "2024",
                        title: t("origin.y2024_title"),
                        text: t("origin.y2024_text"),
                      },
                      {
                        year: "2025",
                        title: t("origin.y2025_title"),
                        text: t("origin.y2025_text"),
                      },
                      {
                        year: "2026",
                        title: t("origin.y2026_title"),
                        text: t("origin.y2026_text"),
                      },
                    ].map((item) => (
                      <li key={item.year} className="relative pb-6 last:pb-0">
                        <span className="absolute -left-[1.95rem] top-1 flex size-3 items-center justify-center border border-foreground bg-background">
                          <span className="size-1.5 bg-foreground" />
                        </span>
                        <div className="font-mono text-xs font-semibold tracking-wide">
                          <span className="inline-flex items-center gap-2">
                            <span className="border border-foreground bg-foreground px-1.5 py-0.5 text-[10px] text-background">
                              {item.year}
                            </span>
                            {item.title}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-6 text-muted-foreground">{item.text}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </section>

            <SectionRail index="02" label={t("rail.loop")} />

            <section className="border-t border-border py-12 sm:py-16">
              <div className="flex flex-wrap items-end justify-between gap-6">
                <h2 className="font-[var(--font-display)] text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                  {t("loop.title")}
                </h2>
                <p className="max-w-md text-sm leading-6 text-muted-foreground">
                  {t("loop.description")}
                </p>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    step: "01",
                    name: t("loop.s1_name"),
                    icon: Dumbbell,
                    desc: t("loop.s1_desc"),
                    accent: "border-red-200 bg-red-50 dark:bg-red-950/20",
                  },
                  {
                    step: "02",
                    name: t("loop.s2_name"),
                    icon: ScanLine,
                    desc: t("loop.s2_desc"),
                    accent: "border-stone-200 bg-stone-50 dark:bg-stone-900/40",
                  },
                  {
                    step: "03",
                    name: t("loop.s3_name"),
                    icon: NotebookPen,
                    desc: t("loop.s3_desc"),
                    accent: "border-teal-200 bg-teal-50 dark:bg-teal-950/20",
                  },
                  {
                    step: "04",
                    name: t("loop.s4_name"),
                    icon: Zap,
                    desc: t("loop.s4_desc"),
                    accent: "border-amber-200 bg-amber-50 dark:bg-amber-950/20",
                  },
                ].map((s) => (
                  <div key={s.step} className={`relative border p-5 ${s.accent}`}>
                    <div className="flex items-start justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        §{s.step}
                      </span>
                      <s.icon className="size-4 text-muted-foreground" />
                    </div>
                    <div className="mt-3 font-mono text-sm font-semibold uppercase tracking-wide">{s.name}</div>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">{s.desc}</p>
                    <div className="pointer-events-none absolute bottom-3 right-3 font-mono text-[10px] text-muted-foreground/50">
                      →
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-4 border border-dashed border-foreground/20 bg-stone-50 px-4 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-center dark:bg-stone-900/30">
                <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em]">
                  <span className="size-2 bg-foreground" /> {t("loop.quiet_label")}
                </span>
                <p className="text-xs leading-6 text-muted-foreground">
                  {t("loop.quiet_body")}
                </p>
                <span className="hidden font-mono text-[10px] uppercase tracking-wide text-muted-foreground sm:block">
                  {t("loop.quiet_tag")}
                </span>
              </div>
            </section>

            <SectionRail index="03" label={t("rail.principles")} />

            <section className="border-t border-border py-12 sm:py-16">
              <div className="grid gap-4 lg:grid-cols-3">
                {[
                  {
                    title: t("principles.p1_title"),
                    body: t("principles.p1_body"),
                    meta: t("principles.p1_meta"),
                    color: "from-red-500/10 to-transparent",
                  },
                  {
                    title: t("principles.p2_title"),
                    body: t("principles.p2_body"),
                    meta: t("principles.p2_meta"),
                    color: "from-teal-500/10 to-transparent",
                  },
                  {
                    title: t("principles.p3_title"),
                    body: t("principles.p3_body"),
                    meta: t("principles.p3_meta"),
                    color: "from-amber-500/10 to-transparent",
                  },
                ].map((p) => (
                  <div key={p.title} className="group relative overflow-hidden border border-border bg-card">
                    <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${p.color} opacity-60 transition group-hover:opacity-80`} />
                    <div className="relative p-6">
                      <div className="size-8 border border-foreground bg-foreground text-background flex items-center justify-center text-[10px] font-mono">
                        ✦
                      </div>
                      <h3 className="mt-4 font-[var(--font-display)] text-lg font-semibold leading-tight tracking-tight">
                        {p.title}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">{p.body}</p>
                      <div className="mt-4 border-t border-dashed border-border pt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {p.meta}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <SectionRail index="04" label={t("rail.crew")} />

            <section className="border-t border-border py-12 sm:py-16">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <h2 className="font-[var(--font-display)] text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{t("crew.title")}</h2>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {t("crew.subtitle")}
                </p>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    name: "Meryem K.",
                    role: t("crew.meryem_role"),
                    detail: t("crew.meryem_detail"),
                    plate: "bg-red-600 text-white",
                  },
                  {
                    name: "Emir D.",
                    role: t("crew.emir_role"),
                    detail: t("crew.emir_detail"),
                    plate: "bg-stone-900 text-white dark:bg-stone-800",
                  },
                  {
                    name: "Sena A.",
                    role: t("crew.sena_role"),
                    detail: t("crew.sena_detail"),
                    plate: "bg-teal-600 text-white",
                  },
                  {
                    name: "Can Y.",
                    role: t("crew.can_role"),
                    detail: t("crew.can_detail"),
                    plate: "bg-amber-500 text-stone-900",
                  },
                ].map((person) => (
                  <div key={person.name} className="border border-border bg-card p-4">
                    <div className={`flex aspect-[4/3] items-center justify-center border border-black/10 ${person.plate}`}>
                      <span className="font-[var(--font-display)] text-2xl font-medium tracking-tight">
                        {person.name
                          .split(" ")
                          .map((w) => w[0])
                          .join("")}
                      </span>
                    </div>
                    <div className="mt-4 font-mono text-sm font-semibold uppercase tracking-wide">{person.name}</div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{person.role}</div>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">{person.detail}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3 border border-border bg-stone-100 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground dark:bg-stone-900">
                <span>{t("crew.hiring")}</span>
                <span className="hidden sm:inline">·</span>
                <a href="mailto:hello@gymtrack.app" className="underline decoration-dotted underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {t("crew.email")}
                </a>
              </div>
            </section>

            <SectionRail index="05" label={t("rail.proof")} />

            <StatsStrip />

            <section className="border-t border-border py-12 sm:py-14">
              <div className="grid gap-6 border border-foreground bg-foreground p-6 text-background sm:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                <div>
                  <h2 className="font-[var(--font-display)] text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                    {t("cta.title_a")}
                    <br />
                    <span className="font-mono text-[0.62em] font-normal uppercase tracking-[0.14em] text-background/70">
                      {t("cta.title_b")}
                    </span>
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-background/70">
                    {t("cta.description")}
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                  <Link
                    href={ROUTES.REGISTER}
                    className="inline-flex h-11 items-center justify-center gap-2 bg-background px-6 font-mono text-xs uppercase tracking-[0.18em] text-foreground hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {t("cta.create")} <ArrowUpRight className="size-4" />
                  </Link>
                  <Link
                    href={ROUTES.LOGIN}
                    className="inline-flex h-11 items-center justify-center border border-background/30 px-6 font-mono text-xs uppercase tracking-[0.18em] text-background hover:bg-background/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {t("cta.signin")}
                  </Link>
                </div>
              </div>
            </section>

            <footer className="border-t border-border py-8 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <span>{t("footer.copy")}</span>
                <span className="flex items-center gap-3">
                  <Link href={ROUTES.HOME} className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {t("footer.home")}
                  </Link>
                  <span aria-hidden>·</span>
                  <span>EN / TR</span>
                </span>
              </div>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}

function SectionRail({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-baseline gap-6 py-6 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      <span className="text-foreground">§{index}</span>
      <span>{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function StatsStrip() {
  const t = useTranslations("about.stats_strip");
  const locale = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const c1 = useCountUp(24712, inView);
  const c2 = useCountUp(12, inView);
  const c3 = useCountUp(94, inView);

  return (
    <section ref={ref} className="border-t border-border py-10 sm:py-12">
      <div className="grid gap-6 border border-border sm:grid-cols-3">
        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{t("reps_label")}</div>
          <div className="mt-2 font-mono text-3xl font-semibold tracking-tight sm:text-4xl">
            {c1.toLocaleString(locale)}
          </div>
          <div className="mt-2 text-xs leading-6 text-muted-foreground">
            {t("reps_desc")}
          </div>
        </div>
        <div className="border-t border-border px-6 py-6 sm:border-l sm:border-t-0 sm:px-8 sm:py-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{t("avg_label")}</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold sm:text-4xl">{c2}</span>
            <span className="font-mono text-sm text-muted-foreground">{t("avg_weeks")}</span>
          </div>
          <div className="mt-2 text-xs leading-6 text-muted-foreground">
            {t("avg_desc")}
          </div>
        </div>
        <div className="border-t border-border px-6 py-6 sm:border-l sm:border-t-0 sm:px-8 sm:py-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{t("ontime_label")}</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-mono text-3xl font-semibold sm:text-4xl">{c3}</span>
            <span className="font-mono text-lg">%</span>
          </div>
          <div className="mt-2 text-xs leading-6 text-muted-foreground">
            {t("ontime_desc")}
          </div>
        </div>
      </div>
    </section>
  );
}
