import { useCallback, useEffect, useRef, useState } from 'react';
import type { ArmyRecommendInput, Recommendation } from 'aacalc2';
import type { ArmyRecommendWorkerResponse } from '../armyRecommend.worker.ts';

interface ArmyRecommendationState {
  loading: boolean;
  recommendations: Recommendation[];
  // targetProfit only: false when the optimizer had to fall back to an army
  // that does not meet the target.  null means "not applicable/unknown".
  feasible: boolean | null;
  error: string | null;
}

const EMPTY_STATE: ArmyRecommendationState = {
  loading: false,
  recommendations: [],
  feasible: null,
  error: null,
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Runs the (synchronous, potentially expensive) army optimizer off the main
 * thread. The worker can be terminated to cancel a run; the test environment
 * runs the optimizer in-process so the UI can be exercised without workers.
 */
export function useArmyRecommendation() {
  const [state, setState] = useState<ArmyRecommendationState>(EMPTY_STATE);
  const workerRef = useRef<Worker | null>(null);
  const runIdRef = useRef(0);

  const stopWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  const cancel = useCallback(() => {
    runIdRef.current += 1;
    stopWorker();
    setState((prev) => (prev.loading ? { ...prev, loading: false } : prev));
  }, [stopWorker]);

  const clear = useCallback(() => {
    runIdRef.current += 1;
    stopWorker();
    setState(EMPTY_STATE);
  }, [stopWorker]);

  const runLocal = useCallback((input: ArmyRecommendInput, runId: number) => {
    void import('aacalc2')
      .then(({ armyRecommend }) => {
        if (runIdRef.current !== runId) return;
        try {
          const result = armyRecommend(input);
          if (runIdRef.current === runId) {
            setState({
              loading: false,
              recommendations: result.recommendations,
              feasible: result.feasible ?? true,
              error: null,
            });
          }
        } catch (error) {
          if (runIdRef.current === runId) {
            setState({
              loading: false,
              recommendations: [],
              feasible: null,
              error: errorMessage(error),
            });
          }
        }
      })
      .catch((error) => {
        if (runIdRef.current === runId) {
          setState({
            loading: false,
            recommendations: [],
            feasible: null,
            error: errorMessage(error),
          });
        }
      });
  }, []);

  const run = useCallback(
    (input: ArmyRecommendInput) => {
      stopWorker();
      const runId = ++runIdRef.current;
      setState({ loading: true, recommendations: [], feasible: null, error: null });

      const canUseWorker = import.meta.env.MODE !== 'test' && typeof Worker !== 'undefined';
      if (!canUseWorker) {
        runLocal(input, runId);
        return;
      }

      let worker: Worker;
      try {
        worker = new Worker(new URL('../armyRecommend.worker.ts', import.meta.url), {
          type: 'module',
        });
      } catch {
        runLocal(input, runId);
        return;
      }

      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<ArmyRecommendWorkerResponse>) => {
        if (runIdRef.current !== runId) return;
        stopWorker();
        const data = event.data;
        if (data.ok) {
          setState({
            loading: false,
            recommendations: data.result.recommendations,
            feasible: data.result.feasible ?? true,
            error: null,
          });
        } else {
          setState({ loading: false, recommendations: [], feasible: null, error: data.error });
        }
      };
      worker.onerror = (event) => {
        if (runIdRef.current !== runId) return;
        stopWorker();
        setState({
          loading: false,
          recommendations: [],
          feasible: null,
          error: event.message || 'Army recommendation failed.',
        });
      };
      worker.postMessage(input);
    },
    [runLocal, stopWorker],
  );

  useEffect(
    () => () => {
      runIdRef.current += 1;
      stopWorker();
    },
    [stopWorker],
  );

  return { ...state, run, cancel, clear };
}
