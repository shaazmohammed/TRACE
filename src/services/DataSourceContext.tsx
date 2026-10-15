import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { DEMO_FIXTURES_AVAILABLE } from './config';
import { createDemoTraceApi } from './demoTraceApi';
import { httpTraceApi, type TraceApi } from './traceApi';

export type DataSourceMode = 'live' | 'demo';

interface DataSourceValue {
  api: TraceApi;
  mode: DataSourceMode;
  demoAvailable: boolean;
  enableDemoFixtures: () => void;
  enableLiveApi: () => void;
}

const DataSourceContext = createContext<DataSourceValue | null>(null);

export function DataSourceProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<DataSourceMode>('live');
  const [demoApi, setDemoApi] = useState<TraceApi | null>(null);

  const enableDemoFixtures = useCallback(() => {
    if (!DEMO_FIXTURES_AVAILABLE) return;
    setDemoApi((current) => current ?? createDemoTraceApi());
    setMode('demo');
  }, []);

  const enableLiveApi = useCallback(() => setMode('live'), []);

  const value = useMemo<DataSourceValue>(
    () => ({
      api: mode === 'demo' && demoApi ? demoApi : httpTraceApi,
      mode,
      demoAvailable: DEMO_FIXTURES_AVAILABLE,
      enableDemoFixtures,
      enableLiveApi,
    }),
    [mode, demoApi, enableDemoFixtures, enableLiveApi],
  );

  return <DataSourceContext.Provider value={value}>{children}</DataSourceContext.Provider>;
}

export function useDataSource(): DataSourceValue {
  const context = useContext(DataSourceContext);
  if (!context) throw new Error('useDataSource must be used within DataSourceProvider');
  return context;
}
