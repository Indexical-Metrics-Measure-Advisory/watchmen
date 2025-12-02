import React, { useState } from 'react';
import { useChat } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// 示例数据
const sampleChartData = [
  { label: 'January', value: 65 },
  { label: 'February', value: 78 },
  { label: 'March', value: 90 },
  { label: 'April', value: 81 },
  { label: 'May', value: 56 },
  { label: 'June', value: 95 },
];

const sampleTableData = [
  { id: 1, name: 'Customer Acquisition', value: 1250, growth: '+15%', status: 'Positive' },
  { id: 2, name: 'Customer Retention', value: 890, growth: '-5%', status: 'Negative' },
  { id: 3, name: 'Revenue Growth', value: 45000, growth: '+23%', status: 'Positive' },
  { id: 4, name: 'Churn Rate', value: 12.5, growth: '-8%', status: 'Improving' },
];

const sampleTableHeaders = ['id', 'name', 'value', 'growth', 'status'];

export const MessageTypeExamples: React.FC = () => {
  const {
    chatHistory,
    createChartMessage,
    createTableMessage,
    createAssistantMessage,
    createUserMessage,
    handleSendMessage
  } = useChat() as any;

  const [showExamples, setShowExamples] = useState(false);

  const addChartExample = () => {
    const chartMessage = createChartMessage(
      'Monthly performance metrics',
      'bar',
      sampleChartData,
      {
        title: 'Monthly Sales Performance',
        description: 'Sales performance over the last 6 months',
        dataSource: 'Sales Analytics Dashboard',
        interactive: true,
        exportable: true
      }
    );
    
    // 在实际使用中，这些消息会通过handleSendMessage发送
    console.log('Chart message created:', chartMessage);
  };

  const addTableExample = () => {
    const tableMessage = createTableMessage(
      'Key business metrics summary',
      sampleTableData,
      sampleTableHeaders,
      {
        title: 'Business Metrics Overview',
        description: 'Summary of key performance indicators',
        dataSource: 'Business Analytics Platform',
        sortable: true,
        filterable: true,
        exportable: true,
        pagination: true,
        pageSize: 5
      }
    );
    
    console.log('Table message created:', tableMessage);
  };

  const addCombinedExample = () => {
    // 发送图表消息
    const chartMessage = createChartMessage(
      'Quarterly revenue trends',
      'line',
      [
        { label: 'Q1', value: 120000 },
        { label: 'Q2', value: 145000 },
        { label: 'Q3', value: 135000 },
        { label: 'Q4', value: 165000 }
      ],
      {
        title: 'Quarterly Revenue Trends',
        description: 'Revenue progression across four quarters',
        dataSource: 'Financial Reports 2024'
      }
    );
    console.log('Combined analysis - chart:', chartMessage);

    // 发送表格消息
    const tableMessage = createTableMessage(
      'Detailed quarterly metrics',
      [
        { quarter: 'Q1', revenue: 120000, customers: 450, avgOrder: 266.67 },
        { quarter: 'Q2', revenue: 145000, customers: 520, avgOrder: 278.85 },
        { quarter: 'Q3', revenue: 135000, customers: 480, avgOrder: 281.25 },
        { quarter: 'Q4', revenue: 165000, customers: 580, avgOrder: 284.48 }
      ],
      ['quarter', 'revenue', 'customers', 'avgOrder'],
      {
        title: 'Quarterly Performance Details',
        description: 'Detailed breakdown by quarter',
        dataSource: 'Business Intelligence System'
      }
    );
    console.log('Combined analysis - table:', tableMessage);
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Message Types Demo</CardTitle>
          <CardDescription>
            Explore the new chart and table message types for richer chat experiences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={addChartExample}
                variant="outline"
                className="w-full"
              >
                Add Chart Message
              </Button>
              <Button 
                onClick={addTableExample}
                variant="outline"
                className="w-full"
              >
                Add Table Message
              </Button>
              <Button 
                onClick={addCombinedExample}
                variant="outline"
                className="w-full"
              >
                Add Combined Analysis
              </Button>
            </div>

            <Button
              onClick={() => setShowExamples(!showExamples)}
              variant="secondary"
              className="w-full"
            >
              {showExamples ? 'Hide' : 'Show'} Usage Examples
            </Button>

            {showExamples && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Usage Examples:</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Chart Message:</strong>
                    <pre className="mt-1 p-2 bg-white rounded text-xs overflow-x-auto">
{`createChartMessage('Revenue Analysis', 'bar', revenueData, {
  title: 'Monthly Revenue',
  description: 'Revenue trends over 12 months',
  dataSource: 'Sales Database'
})`}
                    </pre>
                  </div>
                  <div>
                    <strong>Table Message:</strong>
                    <pre className="mt-1 p-2 bg-white rounded text-xs overflow-x-auto">
{`createTableMessage('Customer Metrics', customerData, headers, {
  title: 'Customer Performance',
  sortable: true,
  filterable: true,
  exportable: true
})`}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {chatHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Chat History</CardTitle>
            <CardDescription>Messages in the current session</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {chatHistory.map((message, index) => (
                <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                  <strong className="capitalize">{message.type}:</strong> {message.content}
                  {message.metadata && (
                    <div className="text-xs text-gray-600 mt-1">
                      {JSON.stringify(message.metadata, null, 2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};