'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './styles.module.css';

interface Category {
  title: string;
  options: string[];
}

interface Question {
  text: string;
  options: string[];
}

interface Response {
  question: string;
  answer: string;
  timestamp?: number;
}

interface AssessmentAreas {
  location: boolean;
  characterSeverity: boolean;
  timing: boolean;
  triggers: boolean;
  riskFactors: boolean;
}

interface ChatGPTResponse {
  questions: Question[];
  assessedAreas?: AssessmentAreas;
  totalPredictedQuestions?: number;
  currentQuestionNumber?: number;
  readyForDiagnosis?: boolean;
}

interface StoredQuestion {
  text: string;
  options: string[];
  timestamp: number;
}

interface StoredResponse {
  question: string;
  answer: string;
  timestamp: number;
  questionData: StoredQuestion;
}

const STORAGE_KEYS = {
  CATEGORY: 'bioplus_category',
  SYMPTOM: 'bioplus_symptom',
  QUESTIONS: 'bioplus_questions',
  RESPONSES: 'bioplus_responses',
  CURRENT_STEP: 'bioplus_current_step',
  DIAGNOSIS: 'bioplus_diagnosis',
  PHASE: 'bioplus_phase'
} as const;

type StorageKey = keyof typeof STORAGE_KEYS;

const clearStorageData = () => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};

const initialCategories: Category[] = [
  {
    title: "I am feeling...",
    options: ["Choose this if you are experiencing any discomfort like pain or tension"]
  },
  {
    title: "I am having trouble with...",
    options: ["Choose this if you have functional issues like breathing or moving"]
  },
  {
    title: "I am noticing...",
    options: ["Choose this if you see physical changes in your body like a rash or weight loss"]
  }
];

const symptomOptions: { [key: string]: string[] } = {
  "I am feeling...": [
    "Fatigued / Weak / Shaky",
    "Dizzy / Lightheaded",
    "Pain",
    "Nauseous / Queasy",
    "Fever / Chills",
    "Numbness / Tingling",
    "Other"
  ],
  "I am having trouble with...": [
    "Breathing Issues (Shortness of Breath, Wheezing, Chest Tightness)",
    "Sleeping Issues (Trouble Falling Asleep, Staying Asleep, Unrested Sleep)",
    "Eating Issues (Loss of Appetite, Difficulty Swallowing)",
    "Moving Issues (Weakness, Stiffness, Painful Joints, Coordination Problems)",
    "Speaking / Thinking Clearly",
    "Bladder / Bowel Control Issues",
    "Vision / Hearing Changes",
    "Other"
  ],
  "I am noticing...": [
    "Unexplained Weight Loss / Gain",
    "Swelling (Hands, Feet, Face, Abdomen, Joints)",
    "Skin Changes (Rash, Bruising, Peeling)",
    "Lumps, Hair Loss, or Other Growths",
    "Urine / Bowel Changes (Color, Frequency, Pain, Constipation, Diarrhea, Blood in Stool)",
    "Other"
  ]
};

const LoadingAnimation = ({ message = "Analyzing...", inline = false }: { message?: string, inline?: boolean }) => (
  <div className={`flex flex-col items-center justify-center ${inline ? 'py-4' : 'p-8'}`}>
    <div className="relative">
      <div className="w-12 h-12 rounded-full border-[3px] border-blue-200 animate-[spin_3s_linear_infinite]"></div>
      <div className="w-12 h-12 rounded-full border-t-[3px] border-blue-600 absolute top-0 left-0 animate-[spin_1.5s_linear_infinite]"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
      </div>
    </div>
    <p className="mt-4 text-sm text-gray-600 font-medium">{message}</p>
    <div className="mt-2 text-xs text-gray-500">Please wait while we analyze your responses...</div>
  </div>
);

export default function QuestionsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSymptom, setSelectedSymptom] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<StoredResponse[]>([]);
  const [followUpQuestions, setFollowUpQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [customSymptom, setCustomSymptom] = useState('');
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [storedQuestions, setStoredQuestions] = useState<StoredQuestion[]>([]);
  const [isPhase2, setIsPhase2] = useState(false);
  const [totalPredictedQuestions, setTotalPredictedQuestions] = useState(0);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);
  const [assessmentProgress, setAssessmentProgress] = useState<AssessmentAreas>({
    location: false,
    characterSeverity: false,
    timing: false,
    triggers: false,
    riskFactors: false
  });
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearAssessmentData = () => {
    // Clear localStorage
    clearStorageData();
    
    // Clear all state
    setResponses([]);
    setFollowUpQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedCategory(null);
    setSelectedSymptom(null);
    setCustomSymptom('');
    setIsOtherSelected(false);
    setStoredQuestions([]);
    setIsPhase2(false);
    setTotalPredictedQuestions(0);
    setCurrentQuestionNumber(0);
    setAssessmentProgress({
      location: false,
      characterSeverity: false,
      timing: false,
      triggers: false,
      riskFactors: false
    });
  };

  // Load previous responses if they exist
  useEffect(() => {
    if (mounted) {
      // Clear storage if we're starting a new assessment or coming from a completed diagnosis
      const fromDiagnosis = new URLSearchParams(window.location.search).get('fromDiagnosis');
      const isNewAssessment = new URLSearchParams(window.location.search).get('new') === 'true';
      
      if (fromDiagnosis === 'true' || isNewAssessment) {
        clearAssessmentData();
        // Remove the query parameters to prevent clearing on subsequent renders
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      const storedCategory = localStorage.getItem(STORAGE_KEYS.CATEGORY);
      const storedSymptom = localStorage.getItem(STORAGE_KEYS.SYMPTOM);
      const storedResponses = localStorage.getItem(STORAGE_KEYS.RESPONSES);
      const storedPhase = localStorage.getItem(STORAGE_KEYS.PHASE);

      if (storedCategory) setSelectedCategory(storedCategory);
      if (storedSymptom) setSelectedSymptom(storedSymptom);
      if (storedResponses) {
        try {
          setResponses(JSON.parse(storedResponses));
        } catch (error) {
          console.error('Error parsing stored responses:', error);
        }
      }
      if (storedPhase) setIsPhase2(storedPhase === 'true');
    }
  }, [mounted]);

  const fetchNextQuestion = async (
    currentResponses: StoredResponse[], 
    category: string, 
    symptom: string, 
    phase2: boolean
  ): Promise<ChatGPTResponse> => {
    try {
      console.log('Sending request with:', { category, symptom, phase2 });
      const response = await fetch('/api/chatgpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          selection: symptom,
          previousResponses: currentResponses,
          isPhase2: phase2
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`API Error: ${response.status} - ${errorData?.error || response.statusText}`);
      }

      const data: ChatGPTResponse = await response.json();
      console.log('Received response:', data);
      
      if (!data.questions || !Array.isArray(data.questions)) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format from server');
      }

      setFollowUpQuestions(data.questions);
      setCurrentQuestionIndex(0);
      
      // Update progress tracking
      if (data.totalPredictedQuestions) {
        setTotalPredictedQuestions(Math.max(1, data.totalPredictedQuestions));
      }
      if (data.currentQuestionNumber) {
        setCurrentQuestionNumber(Math.max(0, data.currentQuestionNumber));
      }
      
      // Update assessment progress if in phase 1
      if (data.assessedAreas && !phase2) {
        setAssessmentProgress(data.assessedAreas);
      }

      return data;
    } catch (error) {
      console.error('Error in fetchNextQuestion:', error);
      setError(error instanceof Error ? error.message : 'Failed to get follow-up questions');
      throw error;
    }
  };

  const handleCategorySelection = (category: string) => {
    setSelectedCategory(category);
    setCurrentStep(1);
    localStorage.setItem(STORAGE_KEYS.CATEGORY, category);
  };

  const handleCustomSymptomSubmit = () => {
    if (!customSymptom.trim()) {
      setError('Please enter your symptom');
      return;
    }
    handleSymptomSelection(customSymptom);
  };

  const handleCustomAnswerSubmit = () => {
    if (!customSymptom.trim()) {
      setError('Please provide your answer');
      return;
    }
    const answer = customSymptom;
    setCustomSymptom('');
    setIsOtherSelected(false);
    if (currentStep === 1) {
      handleSymptomSelection(answer);
    } else {
      handleAnswerQuestion(answer);
    }
  };

  const handleAnswerQuestion = async (answer: string) => {
    setIsLoading(true);
    setError(null);
    setCustomSymptom('');
    setIsOtherSelected(false);

    try {
      const currentQuestion = followUpQuestions[currentQuestionIndex];
      
      // Add the current response
      const updatedResponses = [...responses, { 
        question: currentQuestion.text,
        answer: answer,
        timestamp: Date.now(),
        questionData: {
          text: currentQuestion.text,
          options: currentQuestion.options,
          timestamp: Date.now()
        }
      }];
      setResponses(updatedResponses);

      const response = await fetch('/api/chatgpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: selectedCategory,
          selection: selectedSymptom,
          previousResponses: updatedResponses,
          isPhase2
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`API Error: ${response.status} - ${errorData?.error || response.statusText}`);
      }

      const data: ChatGPTResponse = await response.json();
      
      if (!data.questions || !Array.isArray(data.questions)) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format from server');
      }

      // Update progress tracking
      if (data.totalPredictedQuestions) {
        setTotalPredictedQuestions(Math.max(1, data.totalPredictedQuestions));
      }
      if (data.currentQuestionNumber) {
        setCurrentQuestionNumber(Math.max(0, data.currentQuestionNumber));
      }

      // Update assessment progress
      if (data.assessedAreas) {
        setAssessmentProgress(data.assessedAreas);
      }

      // Check if we've covered all areas and have enough information
      const allAreasAssessed = data.assessedAreas ? 
        Object.values(data.assessedAreas).every(area => area) : 
        false;
      
      const { current, total } = getAdjustedQuestionNumbers();
      const shouldTransitionToPhase2 = allAreasAssessed && !isPhase2;
      const readyForDiagnosis = isPhase2 && data.readyForDiagnosis === true;
      const shouldFinishAssessment = readyForDiagnosis && current >= Math.min(8, total);

      console.log('Assessment state:', {
        isPhase2,
        allAreasAssessed,
        shouldTransitionToPhase2,
        shouldFinishAssessment,
        readyForDiagnosis: data.readyForDiagnosis,
        currentQuestion: current,
        totalQuestions: total
      });
      
      if (shouldTransitionToPhase2) {
        // Transition to phase 2
        setIsPhase2(true);
        const phase2Response = await fetch('/api/chatgpt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            category: selectedCategory,
            selection: selectedSymptom,
            previousResponses: updatedResponses,
            isPhase2: true
          }),
        });

        if (!phase2Response.ok) {
          const errorData = await phase2Response.json().catch(() => null);
          console.error('API Error:', {
            status: phase2Response.status,
            statusText: phase2Response.statusText,
            error: errorData
          });
          throw new Error(`API Error: ${phase2Response.status} - ${errorData?.error || phase2Response.statusText}`);
        }

        const phase2Data: ChatGPTResponse = await phase2Response.json();
        if (!phase2Data.questions || !Array.isArray(phase2Data.questions)) {
          console.error('Invalid response format:', phase2Data);
          throw new Error('Invalid response format from server');
        }

        // Update progress for phase 2
        if (phase2Data.totalPredictedQuestions) {
          setTotalPredictedQuestions(Math.max(1, phase2Data.totalPredictedQuestions));
        }
        if (phase2Data.currentQuestionNumber) {
          setCurrentQuestionNumber(Math.max(0, phase2Data.currentQuestionNumber));
        }

        setFollowUpQuestions(phase2Data.questions);
        setCurrentQuestionIndex(0);
        return;
      } else if (shouldFinishAssessment) {
        setIsDiagnosing(true);
        try {
          // Save responses to localStorage before redirecting
          localStorage.setItem(STORAGE_KEYS.RESPONSES, JSON.stringify(updatedResponses));
          
          // Navigate to results - the results page will handle the diagnosis API call
          router.push('/dashboard/results');
          
          // Clear other assessment data
          (Object.keys(STORAGE_KEYS) as StorageKey[]).forEach(key => {
            if (key !== 'RESPONSES') {
              localStorage.removeItem(STORAGE_KEYS[key]);
            }
          });
          
          // Reset state except responses
          setFollowUpQuestions([]);
          setCurrentQuestionIndex(0);
          setSelectedCategory(null);
          setSelectedSymptom(null);
          setCustomSymptom('');
          setIsOtherSelected(false);
          setStoredQuestions([]);
          setIsPhase2(false);
          setTotalPredictedQuestions(0);
          setCurrentQuestionNumber(0);
          setAssessmentProgress({
            location: false,
            characterSeverity: false,
            timing: false,
            triggers: false,
            riskFactors: false
          });
        } catch (error) {
          console.error('Error navigating to diagnosis:', error);
          setError('Failed to proceed to diagnosis. Please try again.');
          setIsDiagnosing(false);
        }
        return;
      }

      setFollowUpQuestions(data.questions);
      setCurrentQuestionIndex(0);

    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSymptomSelection = async (symptom: string) => {
    if (symptom === 'Other') {
      setIsOtherSelected(true);
      return;
    }

    const selectedSymptom = isOtherSelected ? customSymptom : symptom;

    if (selectedSymptom === '') {
      setError('Please describe your symptoms');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSelectedSymptom(selectedSymptom);
    localStorage.setItem(STORAGE_KEYS.SYMPTOM, selectedSymptom);
    setCustomSymptom('');
    setIsOtherSelected(false);
    setCurrentStep(2);
    
    try {
      await fetchNextQuestion([], selectedCategory!, selectedSymptom, false);
    } finally {
      setIsLoading(false);
    }
  };

  const getAdjustedQuestionNumbers = () => {
    // Add 2 to account for category and symptom selection
    const adjustedCurrent = currentStep === 0 ? 0 : currentStep === 1 ? 1 : currentQuestionNumber + 2;
    const adjustedTotal = totalPredictedQuestions + 2;
    return { current: adjustedCurrent, total: adjustedTotal };
  };

  const calculateProgress = () => {
    const { current, total } = getAdjustedQuestionNumbers();
    
    if (total === 0) return 0;
    if (isDiagnosing) return 100;
    
    // Calculate progress as a percentage based on current question number
    return Math.min(Math.round((current / total) * 100), 100);
  };

  const handleGoBackToQuestion = async (index: number) => {
    // Keep responses up to the selected index
    const updatedResponses = responses.slice(0, index);
    setResponses(updatedResponses);
    localStorage.setItem(STORAGE_KEYS.RESPONSES, JSON.stringify(updatedResponses));

    // Get the question data from the stored response
    const targetResponse = responses[index];
    if (targetResponse && targetResponse.questionData) {
      setFollowUpQuestions([{
        text: targetResponse.questionData.text,
        options: targetResponse.questionData.options
      }]);
      setCurrentQuestionIndex(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get new follow-up questions based on the updated response history
      const response = await fetch('/api/chatgpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: selectedCategory,
          selection: selectedSymptom,
          previousResponses: updatedResponses,
          isPhase2
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`API Error: ${response.status} - ${errorData?.error || response.statusText}`);
      }

      const data: ChatGPTResponse = await response.json();
      
      if (!data.questions || !Array.isArray(data.questions)) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format from server');
      }

      // Store the new questions
      const newStoredQuestions = data.questions.map(q => ({
        text: q.text,
        options: q.options,
        timestamp: Date.now()
      }));
      
      setStoredQuestions(prev => [...prev, ...newStoredQuestions]);
      localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(newStoredQuestions));

      if (data.assessedAreas) {
        setAssessmentProgress(data.assessedAreas);
      }

      setFollowUpQuestions(data.questions);
      setCurrentQuestionIndex(0);
      setCustomSymptom('');
      setIsOtherSelected(false);

    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const addResponse = (question: string, answer: string) => {
    setResponses(prev => [...prev, {
      question,
      answer,
      timestamp: Date.now(),
      questionData: {
        text: question,
        options: [],
        timestamp: Date.now()
      }
    }]);
  };

  const handleEditInitialQuestion = (step: number) => {
    // Reset to the appropriate step
    setCurrentStep(step);
    
    if (step === 0) {
      // Keep nothing if editing the first question
      setSelectedCategory('');
      setSelectedSymptom('');
      setResponses([]);
    } else if (step === 1) {
      // Keep the category selection if editing symptoms
      setSelectedSymptom('');
      setResponses([]);
    }
    
    // Reset follow-up questions
    setFollowUpQuestions([]);
    setCurrentQuestionIndex(0);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const QuestionHistory = () => (
    <div className="space-y-4">
      <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-100">
        {selectedCategory && (
          <div className="relative pl-8 transition-all duration-300">
            <div className="absolute left-0 top-3 w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-500" />
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all duration-300 group">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                    How are you feeling?
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-700">Answer:</span> {selectedCategory}
                  </p>
                </div>
                <button
                  onClick={() => handleEditInitialQuestion(0)}
                  className="flex items-center shrink-0 gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 hover:text-blue-700 transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Edit
                </button>
              </div>
            </div>
          </div>
        )}
        {selectedSymptom && (
          <div className="relative pl-8 transition-all duration-300">
            <div className="absolute left-0 top-3 w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-500" />
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all duration-300 group">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                    What symptoms are you experiencing?
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-700">Answer:</span> {selectedSymptom}
                  </p>
                </div>
                <button
                  onClick={() => handleEditInitialQuestion(1)}
                  className="flex items-center shrink-0 gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 hover:text-blue-700 transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Edit
                </button>
              </div>
            </div>
          </div>
        )}
        {responses.map((response, index) => (
          <div 
            key={index}
            className="relative pl-8 transition-all duration-300"
          >
            <div className="absolute left-0 top-3 w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-500" />
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all duration-300 group">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                    {response.question}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-700">Answer:</span> {response.answer}
                  </p>
                  {response.timestamp && (
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatTimestamp(response.timestamp)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleGoBackToQuestion(index)}
                  className="flex items-center shrink-0 gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 hover:text-blue-700 transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

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
            onClick={() => {
              setError(null);
              setCurrentStep(0);
              setFollowUpQuestions([]);
              setCurrentQuestionIndex(0);
              setResponses([]);
              setSelectedCategory(null);
              setSelectedSymptom(null);
              setCustomSymptom('');
              setIsOtherSelected(false);
            }}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (isLoading && currentStep !== 2) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <LoadingAnimation 
          message={
            isPhase2 
              ? "Generating detailed follow-up questions..." 
              : "Analyzing your response..."
          }
        />
      </div>
    );
  }

  if (isDiagnosing) {
    return (
      <div className="fixed inset-0 bg-gray-50 bg-opacity-90 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4">
              <svg className="animate-spin w-full h-full text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Processing Your Diagnosis</h3>
            <p className="text-gray-600">
              Our AI is analyzing your responses and calculating the most accurate diagnosis. This may take a few moments...
            </p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            {initialCategories.map((category, idx) => (
              <button
                key={idx}
                onClick={() => handleCategorySelection(category.title)}
                className={`
                  w-full px-6 py-4 bg-white border-2 border-transparent
                  rounded-xl shadow-sm text-left
                  transition-all duration-200 ease-in-out
                  hover:border-blue-200 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                `}
              >
                <h4 className="text-lg font-medium text-blue-600">{category.title}</h4>
                <p className="mt-2 text-sm text-gray-500">
                  {category.options.join(', ')}
                </p>
              </button>
            ))}
          </div>
        );

      case 1:
        return selectedCategory ? (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-xl p-6">
              <h4 className="text-xl font-semibold text-gray-900 mb-4">
                Select your main symptom:
              </h4>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {selectedCategory && symptomOptions[selectedCategory].map((symptom, idx) => (
                    symptom === 'Other' && !isOtherSelected ? (
                      <button
                        key={idx}
                        onClick={() => setIsOtherSelected(true)}
                        className={`
                          w-full px-6 py-4 bg-white border-2 border-transparent
                          rounded-lg shadow-sm text-base font-medium text-left
                          transition-all duration-200 ease-in-out
                          hover:border-blue-200 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                        `}
                      >
                        <span className="text-base font-medium text-gray-900">Other</span>
                      </button>
                    ) : symptom === 'Other' && isOtherSelected ? (
                      <div key={idx} className="flex items-center">
                        <input
                          type="text"
                          value={customSymptom}
                          onChange={(e) => setCustomSymptom(e.target.value)}
                          placeholder="Type your symptom..."
                          className="flex-1 px-6 py-4 bg-white border-2 border-transparent rounded-lg shadow-sm text-base font-medium text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={handleCustomSymptomSubmit}
                          className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Next
                        </button>
                      </div>
                    ) : (
                      <button
                        key={idx}
                        onClick={() => handleSymptomSelection(symptom)}
                        disabled={isLoading}
                        className={`
                          w-full px-6 py-4 bg-white border-2 border-transparent
                          rounded-lg shadow-sm text-base font-medium text-left
                          transition-all duration-200 ease-in-out
                          ${isLoading 
                            ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-500'
                            : 'text-gray-700 hover:bg-blue-50 hover:border-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                          }
                        `}
                      >
                        <span className="text-base font-medium text-gray-900">{symptom}</span>
                      </button>
                    )
                  ))}
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setCurrentStep(0);
                      setSelectedCategory(null);
                      setSelectedSymptom(null);
                      setCustomSymptom('');
                      setIsOtherSelected(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null;

      case 2:
        if (!followUpQuestions.length) {
          return (
            <div className="bg-gray-50 rounded-xl p-8">
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <h4 className="text-xl font-semibold text-gray-900">
                    Generating Your Next Questions
                  </h4>
                  <p className="mt-2 text-sm text-gray-600">
                    Our AI is carefully analyzing your responses to provide relevant follow-up questions.
                  </p>
                </div>

                {/* Skeleton loading animation */}
                <div className="space-y-6">
                  <div className="animate-pulse space-y-8">
                    {/* Question skeleton */}
                    <div className="h-6 bg-gray-200 rounded-md w-3/4 mx-auto"></div>
                    
                    {/* Options skeleton */}
                    <div className="space-y-4">
                      {[1, 2, 3, 4].map((_, idx) => (
                        <div key={idx} className="flex items-center space-x-4">
                          <div className="h-12 bg-white rounded-lg shadow-sm w-full 
                            border-2 border-gray-100 hover:border-blue-100 transition-colors duration-200">
                            <div className="h-full flex items-center px-6">
                              <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <LoadingAnimation inline message="Processing your previous answers..." />
                </div>
              </div>
            </div>
          );
        }

        const currentQuestion = followUpQuestions[currentQuestionIndex];
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-2xl p-6 transition-all duration-200">
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>{isPhase2 ? 'Detailed Assessment' : 'Initial Assessment'}</span>
                  <span>{calculateProgress()}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${calculateProgress()}%` }}
                  ></div>
                </div>
                <div className="text-sm text-gray-500 text-center mt-2">
                  {(() => {
                    const { current, total } = getAdjustedQuestionNumbers();
                    return `Question ${current} of ~${total}`;
                  })()}
                </div>
              </div>

              <div className="transform transition-all duration-500 ease-in-out opacity-0 animate-fade-in">
                <h4 className="text-xl font-semibold text-gray-900 mb-6">
                  {currentQuestion.text}
                </h4>
                
                {/* All options in a single grid with staggered fade-in */}
                <div className="grid grid-cols-1 gap-4">
                  {currentQuestion.options.map((option, idx) => (
                    <div
                      key={idx}
                      className={`transform transition-all duration-500 ease-in-out opacity-0 animate-fade-in-up [animation-delay:${idx * 100}ms]`}
                    >
                      {option === 'Other' ? (
                        isOtherSelected ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={customSymptom}
                              onChange={(e) => setCustomSymptom(e.target.value)}
                              placeholder="Type your answer..."
                              className={`
                                flex-1 px-6 py-4 bg-white border-2 border-transparent
                                rounded-lg shadow-sm text-base font-medium text-left
                                transition-all duration-200 ease-in-out
                                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                              `}
                            />
                            <button
                              onClick={handleCustomAnswerSubmit}
                              disabled={isLoading || !customSymptom.trim()}
                              className={`
                                px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm
                                hover:bg-blue-700 focus:outline-none focus:ring-2
                                focus:ring-offset-2 focus:ring-blue-500
                                disabled:opacity-50 disabled:cursor-not-allowed
                                transition-all duration-200 ease-in-out
                              `}
                            >
                              Submit
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setIsOtherSelected(true)}
                            disabled={isLoading}
                            className={`
                              w-full px-6 py-4 bg-white border-2 border-transparent
                              rounded-lg shadow-sm text-base font-medium text-left
                              transition-all duration-200 ease-in-out
                              ${isLoading 
                                ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-500'
                                : 'text-gray-700 hover:bg-blue-50 hover:border-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                              }
                            `}
                          >
                            {option}
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => handleAnswerQuestion(option)}
                          disabled={isLoading}
                          className={`
                            w-full px-6 py-4 bg-white border-2 border-transparent
                            rounded-lg shadow-sm text-base font-medium text-left
                            transition-all duration-200 ease-in-out
                            ${isLoading 
                              ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-500'
                              : 'text-gray-700 hover:bg-blue-50 hover:border-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                            }
                          `}
                        >
                          {isLoading ? (
                            <div className="animate-pulse">
                              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            </div>
                          ) : (
                            option
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Loading animation below all options */}
              {isLoading && (
                <div className="mt-4">
                  <LoadingAnimation inline message="Processing your answer..." />
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-8 sm:p-10">
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900">Health Assessment</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Help us understand your symptoms better to provide accurate recommendations
                </p>
              </div>

              {/* Main Content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Questions panel */}
                <div className="lg:col-span-2">
                  {renderContent()}
                </div>

                {/* Question History panel - show after category selection */}
                {currentStep >= 1 && (
                  <div className="lg:col-span-1 h-full">
                    <div className="w-full max-w-3xl mx-auto h-full flex flex-col">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Response History</h3>
                      {/* Scrollable container for responses */}
                      <div className={`flex-1 ${styles['custom-scrollbar']}`}>
                        <div className={`h-[calc(100vh-4rem)] overflow-y-auto pr-4`}>
                          <QuestionHistory />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
