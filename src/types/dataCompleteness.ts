export interface DataSourceIssue {
  network: string;
  period: string;
  message: string;
}

export interface DataCompleteness {
  status: 'preliminary' | 'complete';
  reportingMonth: string;
  comparisonMonth: string;
  missingNetworks: string[];
  reportedNetworks: string[];
  comparisonNetworkCount: number;
  reportedNetworkCount: number;
  reportingMonthQuantity: number;
  comparisonMonthQuantity: number;
  sourceIssues?: DataSourceIssue[];
}
