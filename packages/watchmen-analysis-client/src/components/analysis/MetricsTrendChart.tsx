import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart as RechartLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MetricsTrendChartProps {
  data: Array<{
    month: string;
    conversionRate: number;
    customerAcquisitionRate: number;
  }>;
}

const MetricsTrendChart: React.FC<MetricsTrendChartProps> = ({ data }) => {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Related Metrics Trend</CardTitle>
        <CardDescription>Key metrics trends over the past 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartLineChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="conversionRate" 
                stroke="#8884d8" 
                activeDot={{ r: 8 }} 
              />
              <Line type="monotone" dataKey="customerAcquisitionRate" stroke="#82ca9d" />
            </RechartLineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricsTrendChart;