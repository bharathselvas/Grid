import { useCallback, useEffect, useRef, useState } from "react";

export type ApiSource = "live" | "demo";

export type ApiDataState<T> = {
  data: T;
  source: ApiSource;
  loading: boolean;
  error: Error | null;
};

/**
 * Loads `fetcher` once on mount. On success the page renders live API data;
 * on failure it keeps the existing static demo dataset and logs a warning, so
 * the UI is never left empty — but it never pretends the demo rows are live.
 *
 * `fallback` identity should be stable (module-level constant).
 */
export function useApiData<T>(fetcher: () => Promise<T>, fallback: T): ApiDataState<T> {
  const [state, setState] = useState<ApiDataState<T>>({
    data: fallback,
    source: "demo",
    loading: true,
    error: null,
  });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;

    fetcherRef
      .current()
      .then((data) => {
        if (cancelled) return;
        setState({ data, source: "live", loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const err = error instanceof Error ? error : new Error(String(error));
        console.warn("[api] request failed — showing the static demo dataset:", err.message);
        setState({ data: fallback, source: "demo", loading: false, error: err });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}

export type RequiredApiState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
  reload: () => void;
};

/**
 * Loads live data with NO demo fallback. On failure the page must render an
 * explicit error state with a Retry action — core DoLR pages may never fall
 * back silently to sample rows.
 *
 * `deps` behaves like useEffect deps (re-fetch when they change); the previous
 * data is kept while the next request is in flight.
 */
export function useRequiredApi<T>(
  fetcher: () => Promise<T>,
  deps: readonly unknown[] = [],
): RequiredApiState<T> {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: Error | null }>({
    data: null,
    loading: true,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetcherRef
      .current()
      .then((data) => {
        if (cancelled) return;
        setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const err = error instanceof Error ? error : new Error(String(error));
        setState({ data: null, loading: false, error: err });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { ...state, reload };
}
