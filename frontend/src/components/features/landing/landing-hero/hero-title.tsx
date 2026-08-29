import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { textReveal, textStagger } from "../landing-variants";

export function HeroTitle() {
  const t = useTranslations("home");
  const title = t("hero.title");

  return (
    <motion.h1
      id="hero-heading"
      variants={textStagger}
      initial="hidden"
      animate="visible"
      className="text-balance font-mono text-[2.5rem] font-medium leading-[1.05] tracking-[-0.04em] text-foreground sm:text-6xl lg:text-[5.5rem]"
    >
      {title.split(" ").map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          variants={textReveal}
          className="inline-block"
          style={{ marginRight: "0.22em" }}
        >
          {word}
        </motion.span>
      ))}
    </motion.h1>
  );
}