'use client';

import React, { useState, useEffect } from 'react';
import { ResultCard } from '@/components/ResultCard';
import { useRouter } from 'next/navigation';
import { DiagnosisMatch } from '@/app/types/diagnosis';

interface DiagnosisResponse {
  diagnoses: DiagnosisMatch[];
}

export default function ResultsPage() {
  const [diagnoses, setDiagnoses] = useState<DiagnosisMatch[]>([]);
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
          const diagnosisData = JSON.parse(storedDiagnosis) as DiagnosisResponse;
          setDiagnoses(diagnosisData.diagnoses);
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
          body: JSON.stringify({ responses }),
        });

        if (!response.ok) {
          throw new Error('Failed to get diagnosis');
        }

        const diagnosisResult = await response.json() as DiagnosisResponse;
        setDiagnoses(diagnosisResult.diagnoses);
        localStorage.setItem('bioplus_diagnosis', JSON.stringify(diagnosisResult));
        setIsLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setIsLoading(false);
      }
    };

    if (mounted) {
      fetchDiagnosis();
    }
  }, [mounted]);

  const handleStartNewAssessment = () => {
    localStorage.removeItem('bioplus_diagnosis');
    localStorage.removeItem('bioplus_responses');
    router.push('/onboarding/questions');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 mx-auto mb-4">
            <svg className="animate-spin w-full h-full text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Your Results</h3>
          <p className="text-gray-600">Please wait while we retrieve your diagnosis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Results</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleStartNewAssessment}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Start New Assessment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Your Assessment Results</h1>
          <p className="mt-2 text-gray-600">
            Based on your responses, we've identified the following potential diagnoses:
          </p>
        </div>

        <ResultCard 
          diagnoses={diagnoses} 
          onSaveResult={handleStartNewAssessment}
        />

        <div className="mt-8 text-center">
          <button
            onClick={handleStartNewAssessment}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Start New Assessment
          </button>
        </div>
      </div>
    </div>
  );
}
