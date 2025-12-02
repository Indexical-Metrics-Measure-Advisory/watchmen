
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PValueSignificance from './PValueSignificance';
import { TestResult } from '@/model/TestResult';



interface HypothesisTestingTabProps {
  testResults: TestResult[];
}

const HypothesisTestingTab: React.FC<HypothesisTestingTabProps> = ({ testResults }) => {
  return (
    <div className="space-y-6">
      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">A/B Test Results</CardTitle>
          <CardDescription>Marketing message test results for different age groups</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Customer Group</th>
                  <th className="text-left py-3 px-4">Standard Message Conversion</th>
                  <th className="text-left py-3 px-4">Age-Targeted Message Conversion</th>
                  <th className="text-left py-3 px-4">Improvement</th>
                  <th className="text-left py-3 px-4">Sample Size</th>
                  <th className="text-left py-3 px-4">Significance</th>
                </tr>
              </thead>
              <tbody>
                {testResults.map((result, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-3 px-4">{result.name}</td>
                    <td className="py-3 px-4">{result.conversionA}%</td>
                    <td className="py-3 px-4">{result.conversionB}%</td>
                    <td className="py-3 px-4">
                      <div className="text-green-600">
                        +{((result.conversionB - result.conversionA) / result.conversionA * 100).toFixed(1)}%
                      </div>
                    </td>
                    <td className="py-3 px-4">{result.sampleSize.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <PValueSignificance pValue={result.pValue} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <div className="glass-panel p-4 rounded-lg">
        <h3 className="text-lg font-medium mb-4">Statistical Analysis Summary</h3>
        
        <div className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-md">
            <h4 className="font-medium mb-2">Hypothesis Testing</h4>
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">
                <span className="font-medium">Null Hypothesis (H0):</span> No significant correlation between customer age groups and insurance purchase intent.
              </p>
              <p className="mb-2">
                <span className="font-medium">Alternative Hypothesis (H1):</span> Significant correlation exists between customer age groups and insurance purchase intent.
              </p>
              <p className="mb-2">
                <span className="font-medium">Test Result:</span> Reject null hypothesis (p=0.0012), accept alternative hypothesis.
              </p>
              <p>
                <span className="font-medium">Conclusion:</span> Sufficient statistical evidence shows significant correlation between customer age groups and insurance purchase intent.
              </p>
            </div>
          </div>
          
          <div className="p-3 bg-muted/50 rounded-md">
            <h4 className="font-medium mb-2">Confidence Interval Analysis</h4>
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">
                Conversion rate improvement for customers aged 45-60 is 45%±8% (95% confidence interval).
              </p>
              <p>
                This means we are 95% confident that the true improvement effect is between 37% and 53%.
              </p>
            </div>
          </div>
          
          <div className="p-3 bg-muted/50 rounded-md">
            <h4 className="font-medium mb-2">Effect Size</h4>
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">
                Cohen's d = 0.82, indicating a "large" association strength between age and purchase intent.
              </p>
              <p>
                This suggests age has a substantial impact on purchase decisions, beyond mere statistical significance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HypothesisTestingTab;
