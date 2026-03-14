import type {
  SafeFinderFilters,
  SafeFinderModelInstance,
  SafeFinderModelStatic,
} from "./SafeFinder";
import { SafeFinderQuery } from "./SafeFinder";

export function createSafeFinderQuery<TModel extends SafeFinderModelInstance>(
  model: TModel,
  modelClass: SafeFinderModelStatic<TModel>,
): SafeFinderQuery<TModel> {
  return new SafeFinderQuery(model, modelClass);
}

export function applySafeFinderFilters<TModel extends SafeFinderModelInstance>(
  finder: SafeFinderQuery<TModel>,
  filters: SafeFinderFilters,
): SafeFinderQuery<TModel> {
  for (const [field, value] of Object.entries(filters)) {
    finder.where(field, value);
  }

  return finder;
}
