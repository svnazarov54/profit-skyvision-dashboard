import Papa from 'papaparse';
import { parseCsvTextWithPapa, type ParsedCsvPayload } from '../utils/csvNormalize';
import type { DataLoadError } from '../types/sales';

export type CsvWorkerResponse =
  | { type: 'success'; payload: ParsedCsvPayload }
  | { type: 'error'; error: DataLoadError };

self.onmessage = (event: MessageEvent<string>) => {
  parseCsvTextWithPapa(event.data, Papa)
    .then((payload) => {
      const response: CsvWorkerResponse = { type: 'success', payload };
      self.postMessage(response);
    })
    .catch((err: unknown) => {
      const error =
        err && typeof err === 'object' && 'type' in err
          ? (err.type as DataLoadError)
          : ('parse_error' as DataLoadError);
      const response: CsvWorkerResponse = { type: 'error', error };
      self.postMessage(response);
    });
};
