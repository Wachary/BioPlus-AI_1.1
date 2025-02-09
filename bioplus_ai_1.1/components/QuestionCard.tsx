'use client';

import React from 'react';

interface Option {
  value: string;
  label: string;
}

interface QuestionCardProps {
  question: string;
  options: Option[];
  onAnswer: (answer: string) => void;
  isLoading?: boolean;
}

export function QuestionCard({
  question,
  options,
  onAnswer,
  isLoading = false
}: QuestionCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-xl mx-auto">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        {question}
      </h3>
      
      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onAnswer(option.value)}
            disabled={isLoading}
            className={`w-full text-left px-4 py-3 rounded-md transition-colors
              ${isLoading 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700'
              }
            `}
          >
            {option.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="mt-4 flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
        </div>
      )}
    </div>
  );
}
