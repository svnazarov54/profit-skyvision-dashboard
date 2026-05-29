import { CSV_PATH } from '../constants/columnMapping';
import type { DataLoadError } from '../types/sales';
import { parseCsvTextWithPapa, type ParsedCsvPayload } from '../utils/csvNormalize';
import type { CsvWorkerResponse } from '../workers/csvParser.worker';

export type LoadResult = ParsedCsvPayload;

let csvWorker: Worker | null = null;

function getCsvWorker(): Worker {
  if (!csvWorker) {
    csvWorker = new Worker(
      new URL('../workers/csvParser.worker.ts', import.meta.url),
      { type: 'module' },
    );
  }
  return csvWorker;
}

function parseInWorker(text: string): Promise<ParsedCsvPayload> {
  return new Promise((resolve, reject) => {
    const worker = getCsvWorker();
    const onMessage = (event: MessageEvent<CsvWorkerResponse>) => {
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
      const msg = event.data;
      if (msg.type === 'success') resolve(msg.payload);
      else reject({ type: msg.error });
    };
    const onError = () => {
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
      reject({ type: 'parse_error' as DataLoadError });
    };
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    worker.postMessage(text);
  });
}

async function parseOnMainThread(text: string): Promise<ParsedCsvPayload> {
  const Papa = await import('papaparse');
  return parseCsvTextWithPapa(text, Papa);
}

export async function loadCsvData(path = CSV_PATH): Promise<LoadResult> {
  let response: Response;
  try {
    response = await fetch(path);
  } catch {
    throw { type: 'file_not_found' as DataLoadError };
  }

  if (!response.ok) {
    throw { type: 'file_not_found' as DataLoadError };
  }

  const text = await response.text();

  if (typeof Worker !== 'undefined') {
    try {
      return await parseInWorker(text);
    } catch {
      return parseOnMainThread(text);
    }
  }

  return parseOnMainThread(text);
}

export const ERROR_MESSAGES: Record<DataLoadError, string> = {
  file_not_found:
    'Не удалось загрузить файл geo_by_pharmacy.csv. Проверьте, что файл находится в папке public и доступен по пути /geo_by_pharmacy.csv.',
  empty_csv: 'Файл загружен, но в нём нет строк с данными.',
  missing_columns:
    'В CSV не найдены обязательные колонки: source_network, city, pharmacy_address, period_start, quantity. Проверьте маппинг колонок.',
  parse_error: 'Не удалось разобрать CSV-файл. Проверьте формат данных.',
};
