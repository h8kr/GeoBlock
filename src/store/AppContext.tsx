import React, {createContext, useContext} from 'react';
import type {useAppStore} from './useAppStore';

type AppContextValue = {
  store: ReturnType<typeof useAppStore>;
  onSignOut: () => void;
};

const AppContext = createContext<AppContextValue>(null as any);

export function useAppContext() {
  return useContext(AppContext);
}

export {AppContext};
