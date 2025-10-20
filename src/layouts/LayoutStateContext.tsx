import { createContext, useContext, type PropsWithChildren } from "react";

export type LayoutState = {
  desktopCollapsed: boolean;
};

const LayoutStateContext = createContext<LayoutState | undefined>(undefined);

export function LayoutStateProvider({ value, children }: PropsWithChildren<{ value: LayoutState }>) {
  return (
    <LayoutStateContext.Provider value={value}>{children}</LayoutStateContext.Provider>
  );
}

export function useLayoutState(): LayoutState {
  const context = useContext(LayoutStateContext);
  if (!context) {
    throw new Error("useLayoutState must be used within a LayoutStateProvider");
  }
  return context;
}
