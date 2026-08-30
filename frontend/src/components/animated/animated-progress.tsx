"use client"

import {
  type SpringOptions,
  useMotionValue,
  useSpring,
} from "motion/react"
import * as React from "react"
import { cn } from "@/lib/utils"

type AnimatedProgressProps = {
  value?: number
  springConfig?: SpringOptions
  className?: string
  indicatorClassName?: string
}

function AnimatedProgress({
  value = 0,
  springConfig = { stiffness: 90, damping: 30 },
  className,
  indicatorClassName,
}: AnimatedProgressProps) {
  const localRef = React.useRef<HTMLDivElement>(null)

  const motionVal = useMotionValue(0)
  const springVal = useSpring(motionVal, springConfig)

  React.useEffect(() => {
    const timeout = setTimeout(() => motionVal.set(value), 400)
    return () => clearTimeout(timeout)
  }, [value, motionVal])

  const [width, setWidth] = React.useState(0)

  React.useEffect(() => {
    const unsubscribe = springVal.on("change", (latest) => {
      setWidth(latest)
    })
    return () => unsubscribe()
  }, [springVal])

  return (
    <div
      ref={localRef}
      className={cn(
        "relative flex h-1.5 w-full items-center overflow-hidden rounded-full bg-muted",
        className
      )}
    >
      <div
        className={cn("h-full bg-foreground transition-all", indicatorClassName)}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

export { AnimatedProgress, type AnimatedProgressProps }
