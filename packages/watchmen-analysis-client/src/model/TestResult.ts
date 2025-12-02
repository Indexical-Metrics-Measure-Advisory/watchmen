
export interface TestResult {
  name: string;
  conversionA: number;
  conversionB: number;
  sampleSize: number;
  pValue: number;
  confidenceInterval?: [number, number];
  testDuration?: string;
  lastUpdated?: string;
}
