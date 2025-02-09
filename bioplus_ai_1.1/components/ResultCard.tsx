'use client';

import React from 'react';
import { ExportResults } from './ExportResults';

interface Recommendation {
  text: string;
  type: 'urgent' | 'important' | 'general';
}

interface ResultCardProps {
  condition: string;
  confidence: number;
  recommendations?: Recommendation[];
  responses?: Array<{ question: string; answer: string }>;
  onSaveResult?: () => void;
}

export function ResultCard({
  condition,
  confidence,
  recommendations = [],
  responses = [],
  onSaveResult
}: ResultCardProps) {
  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-red-600';
    if (score >= 70) return 'text-orange-600';
    return 'text-yellow-600';
  };

  const getRecommendationStyle = (type: Recommendation['type']) => {
    switch (type) {
      case 'urgent':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'important':
        return 'bg-orange-50 border-orange-200 text-orange-700';
      case 'general':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-xl mx-auto">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-800">
          {condition}
        </h3>
        <div className="mt-2 flex items-center">
          <span className="text-sm text-gray-600">Confidence:</span>
          <span className={`ml-2 font-semibold ${getConfidenceColor(confidence)}`}>
            {confidence}%
          </span>
        </div>
      </div>

      {recommendations && recommendations.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">Recommendations:</h4>
          {recommendations.map((rec, index) => (
            <div
              key={index}
              className={`p-3 rounded-md border ${getRecommendationStyle(rec.type)}`}
            >
              {rec.text}
            </div>
          ))}
        </div>
      )}

      <ExportResults
        diagnosis={{ condition, confidence, recommendations: recommendations || [] }}
        responses={responses}
      />

      {onSaveResult && (
        <button
          onClick={onSaveResult}
          className="mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Save Result
        </button>
      )}

      {confidence >= 90 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700 font-medium">
            ⚠️ Based on the high confidence score, we recommend seeking immediate
            medical attention.
          </p>
        </div>
      )}
    </div>
  );
}
