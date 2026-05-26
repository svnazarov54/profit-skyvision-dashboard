import type { FilterState } from '../types/filters';
import type { SalesRecord } from '../types/sales';

export interface FilterSets {
  networks: Set<string> | null;
  cities: Set<string> | null;
  federalSubjects: Set<string> | null;
  points: Set<string> | null;
  skus: Set<string> | null;
}

export function toFilterSets(filters: FilterState): FilterSets {
  return {
    networks: filters.networks.length ? new Set(filters.networks) : null,
    cities: filters.cities.length ? new Set(filters.cities) : null,
    federalSubjects: filters.federalSubjects.length ? new Set(filters.federalSubjects) : null,
    points: filters.points.length ? new Set(filters.points) : null,
    skus: filters.skus.length ? new Set(filters.skus) : null,
  };
}

export function matchesGeoFilters(
  r: SalesRecord,
  sets: FilterSets,
  exclude?: keyof FilterState,
): boolean {
  if (exclude !== 'networks' && sets.networks && !sets.networks.has(r.network)) return false;
  if (exclude !== 'cities' && sets.cities && !sets.cities.has(r.city)) return false;
  if (exclude !== 'federalSubjects' && sets.federalSubjects && !sets.federalSubjects.has(r.federalSubject))
    return false;
  if (exclude !== 'points' && sets.points && !sets.points.has(r.pointId)) return false;
  if (exclude !== 'skus' && sets.skus && !sets.skus.has(r.sku)) return false;
  return true;
}
