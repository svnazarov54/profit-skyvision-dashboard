import { useEffect, useState } from 'react';
import {
  ERROR_MESSAGES,
  loadCsvData,
  type LoadResult,
} from '../services/dataService';
import type { DataLoadError, DataLoadState, SalesRecord } from '../types/sales';
import type { DateBounds } from '../utils/filters';

export interface CsvDataset {
  records: SalesRecord[];
  dateBounds: DateBounds;
  rowCount: number;
}

const EMPTY_BOUNDS: DateBounds = { minDate: '', maxDate: '' };

export function useCsvData() {
  const [state, setState] = useState<DataLoadState>({ status: 'loading' });
  const [dataset, setDataset] = useState<CsvDataset>({
    records: [],
    dateBounds: EMPTY_BOUNDS,
    rowCount: 0,
  });

  useEffect(() => {
    let cancelled = false;

    loadCsvData()
      .then((result: LoadResult) => {
        if (cancelled) return;
        setDataset({
          records: result.records,
          dateBounds: { minDate: result.minDate, maxDate: result.maxDate },
          rowCount: result.rowCount,
        });
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

  return { state, records: dataset.records, dateBounds: dataset.dateBounds };
}
