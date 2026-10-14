export interface DataSourceIssue {
  network: string;
  period: string;
  message: string;
}

export interface DataReviewNote {
  network: string;
  message: string;
}

export interface DataCompletenessPeriod {
  reportingMonth: string;
  comparisonMonth: string;
  missingNetworks: string[];
  reportedNetworks: string[];
  comparisonNetworkCount: number;
  reportedNetworkCount: number;
  reportingMonthQuantity: number;
  comparisonMonthQuantity: number;
  sourceIssues?: DataSourceIssue[];
  reviewNotes?: DataReviewNote[];
}

export interface DataCompleteness extends DataCompletenessPeriod {
  status: 'preliminary' | 'complete';
  periods?: DataCompletenessPeriod[];
}
