import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";

export interface SwipeCoordinator {
  /**
   * Registers an open-able row. Returns the unregister callback, which
   * callers must invoke on unmount to keep the registry from leaking rows.
   */
  register: (id: string, methods: SwipeableMethods) => () => void;
  /** Closes every row except `id`. Called when a row starts to open. */
  requestOpen: (id: string) => void;
  /** Closes every row. Call on scroll to avoid a row frozen half-open. */
  closeAll: () => void;
}

/**
 * Registry of open swipe rows, scoped to a single list screen.
 *
 * Scoped by design: a module-level singleton would outlive the screen, leak
 * rows under virtualization, and let a card in one list hold a handle on a
 * card in another.
 */
const SwipeCoordinatorContext = createContext<SwipeCoordinator | null>(null);

export interface SwipeCoordinatorProps {
  value: SwipeCoordinator;
  children: ReactNode;
}

export function SwipeCoordinatorProvider({
  value,
  children,
}: SwipeCoordinatorProps) {
  return (
    <SwipeCoordinatorContext.Provider value={value}>
      {children}
    </SwipeCoordinatorContext.Provider>
  );
}

/**
 * Creates the registry for a single list screen.
 *
 * The owning screen calls this and passes the result to
 * `SwipeCoordinatorProvider`, so the screen itself can also drive the
 * registry — for example closing any open row when scrolling starts.
 */
export function useCreateSwipeCoordinator(): SwipeCoordinator {
  const registry = useRef(new Map<string, SwipeableMethods>());

  const register = useCallback((id: string, methods: SwipeableMethods) => {
    registry.current.set(id, methods);
    return () => {
      if (registry.current.get(id) === methods) {
        registry.current.delete(id);
      }
    };
  }, []);

  const requestOpen = useCallback((id: string) => {
    registry.current.forEach((methods, otherId) => {
      if (otherId !== id) {
        methods.close();
      }
    });
  }, []);

  const closeAll = useCallback(() => {
    registry.current.forEach((methods) => methods.close());
  }, []);

  useEffect(() => {
    const rows = registry.current;
    return () => {
      rows.clear();
    };
  }, []);

  return useMemo<SwipeCoordinator>(
    () => ({ register, requestOpen, closeAll }),
    [register, requestOpen, closeAll],
  );
}

/**
 * Returns the nearest coordinator, or a standalone coordinator when used
 * outside a provider so a single card still works without ceremony.
 */
export function useSwipeCoordinator(): SwipeCoordinator {
  const context = useContext(SwipeCoordinatorContext);

  const standalone = useMemo<SwipeCoordinator>(() => {
    const rows = new Map<string, SwipeableMethods>();
    return {
      register: (id, methods) => {
        rows.set(id, methods);
        return () => {
          rows.delete(id);
        };
      },
      requestOpen: (id) => {
        rows.forEach((methods, otherId) => {
          if (otherId !== id) methods.close();
        });
      },
      closeAll: () => {
        rows.forEach((methods) => methods.close());
      },
    };
  }, []);

  return context ?? standalone;
}