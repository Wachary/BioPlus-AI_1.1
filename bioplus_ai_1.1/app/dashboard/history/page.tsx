import React from 'react';
import Link from 'next/link';

interface HistoryEntry {
  id: string;
  date: string;
  primarySymptom: string;
  diagnosis: {
    condition: string;
    confidence: number;
  };
}

export default function HistoryPage() {
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // TODO: Implement Supabase fetch
    // For now, using mock data
    setHistory([
      {
        id: '1',
        date: '2025-02-02',
        primarySymptom: 'Headache',
        diagnosis: {
          condition: 'Tension Headache',
          confidence: 85
        }
      },
      // Add more mock entries as needed
    ]);
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Assessment History
          </h1>
          <Link
            href="/onboarding/questions"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            New Assessment
          </Link>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <h3 className="mt-2 text-sm font-medium text-gray-900">No assessments yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start your first health assessment to track your symptoms.
            </p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {history.map((entry) => (
                <li key={entry.id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <p className="text-sm font-medium text-blue-600 truncate">
                          {entry.diagnosis.condition}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Primary Symptom: {entry.primarySymptom}
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        <p className="text-sm text-gray-900">
                          {new Date(entry.date).toLocaleDateString()}
                        </p>
                        <p className={`mt-1 text-xs ${
                          entry.diagnosis.confidence >= 90 ? 'text-red-600' :
                          entry.diagnosis.confidence >= 70 ? 'text-orange-600' :
                          'text-yellow-600'
                        }`}>
                          {entry.diagnosis.confidence}% confidence
                        </p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Link
                        href={`/dashboard/results?id=${entry.id}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Privacy Notice */}
        <div className="mt-8 p-4 bg-gray-100 rounded-md">
          <h4 className="text-sm font-medium text-gray-900">Privacy Notice</h4>
          <p className="mt-1 text-sm text-gray-500">
            Your health data is encrypted and stored securely. Only you can access your assessment history.
          </p>
        </div>
      </div>
    </div>
  );
}
