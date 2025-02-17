'use client';

import React from 'react';
import { ExportResults } from './ExportResults';
import { DiagnosisMatch } from '@/app/types/diagnosis';

interface Recommendation {
  text: string;
  urgency: 'high' | 'medium' | 'low';
}

interface ResultCardProps {
  diagnoses: DiagnosisMatch[];
  onSaveResult?: () => void;
}

export function ResultCard({ diagnoses, onSaveResult }: ResultCardProps) {
  if (!diagnoses || diagnoses.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <p className="text-gray-500">No diagnosis results available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {diagnoses.map((diagnosis, index) => (
        <div 
          key={`${diagnosis.condition}-${index}`}
          className={`bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-200 ${
            index === 0 ? 'border-2 border-blue-500' : ''
          }`}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                {diagnosis.condition}
                {index === 0 && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Most Likely
                  </span>
                )}
              </h3>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500">Confidence</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {Math.round(diagnosis.confidence)}%
                  </div>
                </div>
                <div className="h-12 w-12">
                  <svg viewBox="0 0 36 36" className="circular-chart">
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#eee"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={index === 0 ? "#3B82F6" : "#9CA3AF"}
                      strokeWidth="3"
                      strokeDasharray={`${diagnosis.confidence}, 100`}
                    />
                  </svg>
                </div>
              </div>
            </div>

            {diagnosis.recommendations && diagnosis.recommendations.length > 0 && (
              <div className="mt-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h4>
                <div className="space-y-3">
                  {diagnosis.recommendations.map((recommendation, i) => (
                    <div
                      key={`${diagnosis.condition}-rec-${i}`}
                      className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className={`
                        w-2 h-2 mt-2 rounded-full flex-shrink-0
                        ${recommendation.urgency === 'high' ? 'bg-red-500' :
                          recommendation.urgency === 'medium' ? 'bg-yellow-500' :
                          'bg-green-500'}
                      `} />
                      <div>
                        <p className="text-gray-700">{recommendation.text}</p>
                        <p className={`
                          text-sm mt-1
                          ${recommendation.urgency === 'high' ? 'text-red-600' :
                            recommendation.urgency === 'medium' ? 'text-yellow-600' :
                            'text-green-600'}
                        `}>
                          {recommendation.urgency.charAt(0).toUpperCase() + recommendation.urgency.slice(1)} Priority
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {onSaveResult && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={onSaveResult}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Save Results
          </button>
        </div>
      )}
    </div>
  );
}
