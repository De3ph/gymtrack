"use client";

import * as React from "react";
import type { CSSProperties, HTMLAttributes, ReactElement, ReactNode } from "react";
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import {
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type {
  DragEndEvent,
  DragStartEvent,
  DropAnimation,
  Modifiers,
  UniqueIdentifier,
  DraggableSyntheticListeners,
} from "@dnd-kit/core";
import type { AnimateLayoutChanges } from "@dnd-kit/sortable";
import {
  arrayMove,
  defaultAnimateLayoutChanges,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

// Sortable Item Context
const SortableItemContext = createContext<{
  listeners: DraggableSyntheticListeners | undefined;
  isDragging?: boolean;
  disabled?: boolean;
}>({
  listeners: undefined,
  isDragging: false,
  disabled: false,
});

const IsOverlayContext = createContext(false);

const SortableInternalContext = createContext<{
  activeId: UniqueIdentifier | null;
  modifiers?: Modifiers;
}>({
  activeId: null,
  modifiers: undefined,
});

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true });

const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.4",
      },
    },
  }),
};

export interface SortableRootProps<T>
  extends Omit<HTMLAttributes<HTMLDivElement>, "onDragStart" | "onDragEnd"> {
  value: T[];
  onValueChange: (value: T[]) => void;
  getItemValue: (item: T) => string;
  children: ReactNode;
  onMove?: (event: {
    event: DragEndEvent;
    activeIndex: number;
    overIndex: number;
  }) => void;
  strategy?: "horizontal" | "vertical" | "grid";
  onDragStart?: (event: DragStartEvent) => void;
  onDragEnd?: (event: DragEndEvent) => void;
  modifiers?: Modifiers;
  asChild?: boolean;
}

function Sortable<T>({
  value,
  onValueChange,
  getItemValue,
  className,
  asChild = false,
  onMove,
  strategy = "vertical",
  onDragStart,
  onDragEnd,
  modifiers,
  children,
  ...props
}: SortableRootProps<T>) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => setMounted(true), []);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveId(event.active.id);
      onDragStart?.(event);
    },
    [onDragStart],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveId(null);
      onDragEnd?.(event);

      if (!over) return;

      // Handle item reordering
      const activeIndex = value.findIndex(
        (item: T) => getItemValue(item) === active.id,
      );

      const overIndex = value.findIndex(
        (item: T) => getItemValue(item) === over.id,
      );

      if (activeIndex !== overIndex) {
        if (onMove) {
          onMove({ event, activeIndex, overIndex });
        } else {
          const newValue = arrayMove(value, activeIndex, overIndex);

          onValueChange(newValue);
        }
      }
    },
    [value, getItemValue, onValueChange, onMove, onDragEnd],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const getStrategy = () => {
    switch (strategy) {
      case "horizontal":
        return rectSortingStrategy;
      case "grid":
        return rectSortingStrategy;
      case "vertical":
      default:
        return verticalListSortingStrategy;
    }
  };

  const itemIds = useMemo(() => value.map(getItemValue), [value, getItemValue]);

  const contextValue = useMemo(
    () => ({ activeId, modifiers }),
    [activeId, modifiers],
  );

  // Find the active child for the overlay
  const overlayContent = useMemo(() => {
    if (!activeId) return null;
    let result: ReactNode = null;

    Children.forEach(children, (child) => {
      if (isValidElement(child) && (child.props as any).value === activeId) {
        result = cloneElement(child as ReactElement<any>, {
          ...(child.props as any),
          className: cn((child.props as any).className, "z-50"),
        });
      }
    });

    return result;
  }, [activeId, children]);

  const element = useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        "data-slot": "sortable",
        "data-dragging": activeId !== null,
        className: cn(activeId !== null && "cursor-grabbing!", className),
      } as Record<string, unknown>,
      props as Record<string, unknown>,
    ),
    render: asChild ? (children as ReactElement) : undefined,
  });

  const elementProps = element.props as Record<string, unknown>;

  return (
    <SortableInternalContext.Provider value={contextValue}>
      <DndContext
        sensors={sensors}
        modifiers={modifiers}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={itemIds} strategy={getStrategy()}>
          {asChild ? (
            element
          ) : (
            <element.type
              {...elementProps}
              ref={elementProps.ref as React.Ref<HTMLDivElement>}
            >
              {children}
            </element.type>
          )}
        </SortableContext>
        {mounted &&
          createPortal(
            <DragOverlay
              dropAnimation={dropAnimationConfig}
              modifiers={modifiers}
              className={cn("z-50", activeId && "cursor-grabbing")}
            >
              <IsOverlayContext.Provider value={true}>
                {overlayContent}
              </IsOverlayContext.Provider>
            </DragOverlay>,
            document.body,
          )}
      </DndContext>
    </SortableInternalContext.Provider>
  );
}

export interface SortableItemProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
  asChild?: boolean;
}

function SortableItem({
  value,
  className,
  asChild = false,
  disabled,
  children,
  ...props
}: SortableItemProps) {
  const isOverlay = useContext(IsOverlayContext);

  const {
    setNodeRef,
    transform,
    transition,
    attributes,
    listeners,
    isDragging: isSortableDragging,
  } = useSortable({
    id: value,
    disabled: disabled || isOverlay,
    animateLayoutChanges,
  });

  if (isOverlay) {
    const element = useRender({
      defaultTagName: "div",
      props: mergeProps<"div">(
        {
          "data-slot": "sortable-item",
          "data-value": value,
          "data-dragging": true,
          className: cn(className),
        } as Record<string, unknown>,
        props as Record<string, unknown>,
        // `children` was destructured out above, so it has to be re-attached
        // here: when `render` is undefined (the non-`asChild` path) `useRender`
        // builds the element purely from `props` and would otherwise drop them.
        { children: asChild ? undefined : children },
      ),
      render: asChild ? (children as ReactElement) : undefined,
    });

    return (
      <SortableItemContext.Provider
        value={{ listeners: undefined, isDragging: true, disabled: false }}
      >
        {element}
      </SortableItemContext.Provider>
    );
  }

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  } as CSSProperties;

  const element = useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        "data-slot": "sortable-item",
        "data-value": value,
        "data-dragging": isSortableDragging,
        "data-disabled": disabled,
        ref: setNodeRef,
        style,
        ...attributes,
        className: cn(
          isSortableDragging && "z-50 opacity-50",
          disabled && "opacity-50",
          className,
        ),
      } as Record<string, unknown>,
      props as Record<string, unknown>,
      // Re-attach the destructured `children` so the default (non-`asChild`)
      // path renders them instead of an empty wrapper.
      { children: asChild ? undefined : children },
    ),
    render: asChild ? (children as ReactElement) : undefined,
  });

  return (
    <SortableItemContext.Provider
      value={{ listeners, isDragging: isSortableDragging, disabled }}
    >
      {element}
    </SortableItemContext.Provider>
  );
}

export interface SortableItemHandleProps extends HTMLAttributes<HTMLDivElement> {
  cursor?: boolean;
  asChild?: boolean;
}

function SortableItemHandle({
  className,
  asChild = false,
  cursor = true,
  children,
  ...props
}: SortableItemHandleProps) {
  const { listeners, isDragging, disabled } = useContext(SortableItemContext);

  const element = useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        "data-slot": "sortable-item-handle",
        "data-dragging": isDragging,
        "data-disabled": disabled,
        ...listeners,
        className: cn(
          cursor && (isDragging ? "cursor-grabbing!" : "cursor-grab!"),
          className,
        ),
      } as Record<string, unknown>,
      props as Record<string, unknown>,
      // Re-attach the destructured `children` so the default (non-`asChild`)
      // path renders them instead of an empty handle.
      { children: asChild ? undefined : children },
    ),
    render: asChild ? (children as ReactElement) : undefined,
  });

  return element;
}

export interface SortableOverlayProps
  extends Omit<React.ComponentProps<typeof DragOverlay>, "children"> {
  children?: ReactNode | ((params: { value: UniqueIdentifier }) => ReactNode);
}

function SortableOverlay({ children, className, ...props }: SortableOverlayProps) {
  const { activeId, modifiers } = useContext(SortableInternalContext);
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => setMounted(true), []);

  const content =
    activeId && children
      ? typeof children === "function"
        ? children({ value: activeId })
        : children
      : null;

  if (!mounted) return null;

  return createPortal(
    <DragOverlay
      dropAnimation={dropAnimationConfig}
      modifiers={modifiers}
      className={cn("z-50", activeId && "cursor-grabbing", className)}
      {...props}
    >
      <IsOverlayContext.Provider value={true}>{content}</IsOverlayContext.Provider>
    </DragOverlay>,
    document.body,
  );
}

export { Sortable, SortableItem, SortableItemHandle, SortableOverlay };
