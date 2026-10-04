import { useEffect, useState } from "react";

// 1024px = Tailwind's `lg`. The dashboard sidebar renders as a persistent rail
// at `lg` and up, so everything below it (tablet + phone) gets the burger menu
// / Sheet drawer instead. Keep this in sync with the `lg:` utilities in
// `components/ui/sidebar.tsx`.
const MOBILE_BREAKPOINT = 1024;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    const initialFrame = requestAnimationFrame(() =>
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT),
    );
    return () => {
      mql.removeEventListener("change", onChange);
      cancelAnimationFrame(initialFrame);
    };
  }, []);

  return !!isMobile;
}
