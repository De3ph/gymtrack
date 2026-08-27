export const exerciseReveal = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2, ease: "easeOut" as const },
};

export const exerciseStagger = {
  initial: "hidden",
  animate: "visible",
  variants: {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.03, delayChildren: 0 },
    },
  },
};
