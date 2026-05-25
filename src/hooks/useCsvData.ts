import { useEffect, useState } from 'react';
import {
  ERROR_MESSAGES,
  loadCsvData,
  type LoadResult,
} from '../services/dataService';
import type { DataLoadError, DataLoadState, SalesRecord } from '../types/sales';

export function useCsvData() {
  const [state, setState] = useState<DataLoadState>({ status: 'loading' });
  const [records, setRecords] = useState<SalesRecord[]>([]);

  useEffect(() => {
    let cancelled = false;

    loadCsvData()
      .then((result: LoadResult) => {
        if (cancelled) return;
        setRecords(result.records);
        setState({
          status: 'success',
          rowCount: result.rowCount,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const type =
          err && typeof err === 'object' && 'type' in err
            ? (err.type as DataLoadError)
            : 'parse_error';
        setState({
          status: 'error',
          error: type,
          errorMessage: ERROR_MESSAGES[type] ?? ERROR_MESSAGES.parse_error,
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { state, records };
}
