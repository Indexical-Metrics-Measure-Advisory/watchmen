import React from 'react';

interface SkeletonProps {
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded-md ${className ?? ''}`} />
);

export default Skeleton;