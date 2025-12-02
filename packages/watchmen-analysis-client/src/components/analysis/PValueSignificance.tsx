
import React from 'react';

interface PValueSignificanceProps {
  pValue: number;
}

const PValueSignificance: React.FC<PValueSignificanceProps> = ({ pValue }) => {
  let color = 'text-red-500';
  let text = 'Not Significant';
  
  if (pValue < 0.001) {
    color = 'text-green-600';
    text = 'Highly Significant (p<0.001)';
  } else if (pValue < 0.01) {
    color = 'text-green-500';
    text = 'Very Significant (p<0.01)';
  } else if (pValue < 0.05) {
    color = 'text-green-400';
    text = 'Significant (p<0.05)';
  }
  return <span className={color}>{text}</span>;
};

export default PValueSignificance;
