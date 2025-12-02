
import React from 'react';
import { CheckCircle2, XCircle, RefreshCw, Lightbulb } from 'lucide-react';
import { HypothesisType } from '@/model/Hypothesis';

interface StatusIconProps {
  status: HypothesisType['status'];
}

const StatusIcon: React.FC<StatusIconProps> = ({ status }) => {
  switch (status) {
    case 'validated':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'rejected':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'testing':
      return <RefreshCw className="h-5 w-5 text-blue-500" />;
    default:
      return <Lightbulb className="h-5 w-5 text-amber-500" />;
  }
};

export default StatusIcon;
