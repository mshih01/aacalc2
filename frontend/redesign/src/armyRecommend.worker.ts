import { armyRecommend, type ArmyRecommendInput, type ArmyRecommendOutput } from 'aacalc2';

export type ArmyRecommendWorkerResponse =
  | { ok: true; result: ArmyRecommendOutput }
  | { ok: false; error: string };

type WorkerScope = {
  onmessage: ((event: MessageEvent<ArmyRecommendInput>) => void) | null;
  postMessage: (message: ArmyRecommendWorkerResponse) => void;
};

const scope = self as unknown as WorkerScope;

scope.onmessage = (event) => {
  try {
    scope.postMessage({ ok: true, result: armyRecommend(event.data) });
  } catch (error) {
    scope.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
