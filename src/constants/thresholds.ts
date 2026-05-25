export const THRESHOLDS = {
  anomalyCritical: -20,
  anomalyWarning: -15,
  minPreviousSales: 20,
  statusGrowth: 5,
  statusStable: 5,
  statusDecline: -5,
  networkDeclineMarker: -20,
  monthDeclineMarker: -20,
  topCitiesLimit: 15,
  maxCitiesBeforeOthers: 20,
  maxInsights: 7,
  topPointsCount: 5,
} as const;
