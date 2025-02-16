'use client';

import React, { useState, useEffect } from 'react';
import { ResultCard } from '@/components/ResultCard';
import { useRouter } from 'next/navigation';

interface Diagnosis {
  condition: string;
  confidence: number;
  similarity: number;
  recommendations: Array<{
    text: string;
    urgency: 'low' | 'medium' | 'high';
  }>;
}

export default function ResultsPage() {
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchDiagnosis = async () => {
      try {
        // Get stored diagnosis
        const storedDiagnosis = localStorage.getItem('bioplus_diagnosis');
        if (storedDiagnosis) {
          const diagnosisData = JSON.parse(storedDiagnosis);
          setDiagnosis(diagnosisData);
          setIsLoading(false);
          return;
        }

        // Get stored responses
        const storedResponses = localStorage.getItem('bioplus_responses');
        if (!storedResponses) {
          setError('No assessment data found');
          setIsLoading(false);
          return;
        }

        const responses = JSON.parse(storedResponses);

        const response = await fetch('/api/diagnose', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            responses
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get diagnosis');
        }

        const data = await response.json();
        if (!data || !data.condition || typeof data.confidence !== 'number' || typeof data.similarity !== 'number') {
          throw new Error('Invalid diagnosis data received');
        }

        setDiagnosis(data);
        // Store the diagnosis for future use
        localStorage.setItem('bioplus_diagnosis', JSON.stringify(data));
      } catch (error) {
        console.error('Error:', error);
        setError(error instanceof Error ? error.message : 'Failed to load diagnosis. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (mounted) {
      fetchDiagnosis();
    }
  }, [mounted]);

  const handleContinueAssessment = () => {
    if (mounted) {
      router.push('/onboarding/questions');
    }
  };

  const handleSaveResult = async () => {
    if (!diagnosis) return;
    
    try {
      // Implementation for saving results
      console.log('Saving result:', diagnosis);
    } catch (error) {
      console.error('Error saving result:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        <p className="mt-4 text-gray-600">Analyzing your responses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <svg
            className="mx-auto h-12 w-12 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Error</h3>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!diagnosis) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <p className="text-gray-500">No diagnosis available. Please start a new assessment.</p>
        </div>
      </div>
    );
  }

  // If we have insufficient information, show a different UI
  if (diagnosis.condition === "Insufficient Information") {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                More Information Needed
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>
                  We need more information to provide an accurate assessment. The following areas need clarification:
                </p>
                <ul className="list-disc pl-5 mt-2">
                  {diagnosis.recommendations.map((rec, index) => (
                    <li key={index}>{rec.text}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleContinueAssessment}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Continue Assessment
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <ResultCard
          condition={diagnosis.condition}
          confidence={diagnosis.confidence}
          similarity={diagnosis.similarity}
          recommendations={diagnosis.recommendations}
          onSaveResult={handleSaveResult}
        />
      </div>
    </div>
  );
}
