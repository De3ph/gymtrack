import * as React from 'react';

interface CommonControlledStateProps<T> {
  value?: T;
  defaultValue?: T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useControlledState<T, Rest extends any[] = []>(
  props: CommonControlledStateProps<T> & {
    onChange?: (value: T, ...args: Rest) => void;
  },
): readonly [T, (next: T, ...args: Rest) => void] {
  const { value, defaultValue, onChange } = props;

  const isControlled = value !== undefined;
  const [uncontrolledState, setUncontrolledState] = React.useState<T>(
    defaultValue as T,
  );

  // In controlled mode the prop is the source of truth and is read straight
  // through, so no effect has to mirror it into state on every change.
  const state = isControlled ? (value as T) : uncontrolledState;

  const setState = React.useCallback(
    (next: T, ...args: Rest) => {
      if (!isControlled) setUncontrolledState(next);
      onChange?.(next, ...args);
    },
    [isControlled, onChange],
  );

  return [state, setState] as const;
}
