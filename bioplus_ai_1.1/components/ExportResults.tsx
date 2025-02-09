'use client';

import React, { useState } from 'react';

interface Recommendation {
  text: string;
  type: 'urgent' | 'important' | 'general';
}

interface Diagnosis {
  condition: string;
  confidence: number;
  recommendations: Recommendation[];
}

interface ExportResultsProps {
  diagnosis: Diagnosis;
  responses?: Array<{ question: string; answer: string }>;
}

export function ExportResults({ diagnosis, responses = [] }: ExportResultsProps) {
  const [copied, setCopied] = useState(false);

  const formatContent = () => {
    const lines = [
      `Diagnosis: ${diagnosis.condition}`,
      `Confidence: ${diagnosis.confidence}%`,
      '',
      'Recommendations:',
      ...diagnosis.recommendations.map(rec => `- ${rec.text} (${rec.type})`),
      '',
      'Responses:',
      ...responses.map(r => `Q: ${r.question}\nA: ${r.answer}`),
    ];

    return lines.join('\n');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatContent());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="mt-6 space-y-3">
      <button
        onClick={handleCopy}
        className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        {copied ? 'Copied!' : 'Copy Results'}
      </button>
    </div>
  );
}
