import { useCallback, useEffect, useRef, useState } from 'react';
import { useDataSource } from '../services/DataSourceContext';
import type { TraceApi } from '../services/traceApi';

export interface ApiResource<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  isRefreshing: boolean;
  reload: () => Promise<void>;
}

/**
 * Loads data from the active TraceApi. Re-runs when the data source or `key` changes,
 * ignores stale responses, and keeps previous data visible while refreshing.
 */
export function useApiResource<T>(key: string, loader: (api: TraceApi) => Promise<T>): ApiResource<T> {
  const { api } = useDataSource();
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const requestId = useRef(0);

  const run = useCallback(
    async (mode: 'initial' | 'refresh') => {
      const id = ++requestId.current;
      if (mode === 'initial') setIsLoading(true);
      else setIsRefreshing(true);
      try {
        const result = await loaderRef.current(api);
        if (id !== requestId.current) return;
        setData(result);
        setError(null);
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (id === requestId.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [api],
  );

  useEffect(() => {
    setData(undefined);
    void run('initial');
  }, [run, key]);

  const reload = useCallback(() => run('refresh'), [run]);

  return { data, error, isLoading, isRefreshing, reload };
}
