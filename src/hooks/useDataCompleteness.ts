import { useEffect, useState } from 'react';
import type { DataCompleteness } from '../types/dataCompleteness';

export function useDataCompleteness(): DataCompleteness | null {
  const [data, setData] = useState<DataCompleteness | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = `${import.meta.env.BASE_URL}data_completeness.json`;

    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<DataCompleteness>;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        // Metadata is supplementary: the dashboard must still work without it.
        if (!cancelled) setData(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
