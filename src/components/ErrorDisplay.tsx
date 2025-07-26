import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorDisplayProps {
  error: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error }) => (
  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
    <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
    <span className="text-red-700">{error}</span>
  </div>
);

export default ErrorDisplay; 