import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Validate OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set in environment variables');
  throw new Error('OpenAI API key is not configured');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Helper function to determine which assessment areas have been covered
function getAssessedAreas(responses: any[]) {
  const assessmentAreas = {
    location: false,
    characterSeverity: false,
    timing: false,
    triggers: false,
    riskFactors: false
  };

  // Keywords that indicate coverage of each area
  const keywords = {
    location: ['where', 'location', 'area', 'spot', 'place', 'side'],
    characterSeverity: ['severity', 'pain level', 'intensity', 'type of', 'nature of', 'character', 'how severe', 'describe the'],
    timing: ['when', 'how long', 'duration', 'often', 'frequency', 'start', 'began'],
    triggers: ['trigger', 'worse', 'better', 'improve', 'aggravate', 'affect', 'impact'],
    riskFactors: ['history', 'condition', 'medical', 'risk', 'family', 'previous', 'existing']
  };

  // Check each response against keywords
  responses.forEach(response => {
    const questionLower = response.question.toLowerCase();
    
    Object.entries(keywords).forEach(([area, words]) => {
      if (words.some(word => questionLower.includes(word))) {
        assessmentAreas[area as keyof typeof assessmentAreas] = true;
      }
    });
  });

  return assessmentAreas;
}

// Helper function to determine if initial assessment is complete
function isInitialAssessmentComplete(assessedAreas: any) {
  return Object.values(assessedAreas).every(area => area === true);
}

// Helper function to summarize previous responses
function summarizeResponses(responses: any[]) {
  const summary: { [key: string]: string } = {};
  responses.forEach(response => {
    // Try to categorize each response
    if (response.question.toLowerCase().includes('where') || response.question.toLowerCase().includes('location')) {
      summary.location = response.answer;
    } else if (response.question.toLowerCase().includes('severity') || response.question.toLowerCase().includes('pain')) {
      summary.severity = response.answer;
    } else if (response.question.toLowerCase().includes('when') || response.question.toLowerCase().includes('time')) {
      summary.timing = response.answer;
    } else if (response.question.toLowerCase().includes('trigger') || response.question.toLowerCase().includes('worse')) {
      summary.triggers = response.answer;
    } else if (response.question.toLowerCase().includes('history') || response.question.toLowerCase().includes('risk')) {
      summary.riskFactors = response.answer;
    }
  });
  return summary;
}

// Helper function to determine if we have enough information for diagnosis
function isReadyForDiagnosis(responses: any[], assessedAreas: any) {
  // Must have at least 5 responses
  if (!responses || responses.length < 5) {
    return false;
  }

  // All assessment areas must be covered
  if (!isInitialAssessmentComplete(assessedAreas)) {
    return false;
  }

  // Check for minimum responses in each area
  const areaResponses = {
    location: 0,
    characterSeverity: 0,
    timing: 0,
    triggers: 0,
    riskFactors: 0
  };

  const keywords = {
    location: ['where', 'location', 'area', 'spot', 'place', 'side'],
    characterSeverity: ['severity', 'pain level', 'intensity', 'type of', 'nature of', 'character', 'how severe', 'describe the'],
    timing: ['when', 'how long', 'duration', 'often', 'frequency', 'start', 'began'],
    triggers: ['trigger', 'worse', 'better', 'improve', 'aggravate', 'affect', 'impact'],
    riskFactors: ['history', 'condition', 'medical', 'risk', 'family', 'previous', 'existing']
  };

  // Count responses for each area
  responses.forEach(response => {
    const questionLower = response.question.toLowerCase();
    Object.entries(keywords).forEach(([area, words]) => {
      if (words.some(word => questionLower.includes(word))) {
        areaResponses[area as keyof typeof areaResponses]++;
      }
    });
  });

  // Each area should have at least one detailed response
  return Object.values(areaResponses).every(count => count > 0);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Request body:', body);

    const { category, selection, previousResponses, isPhase2 } = body;

    if (!category || !selection) {
      console.error('Missing required fields:', { category, selection });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Always calculate assessed areas to track progress
    const assessedAreas = getAssessedAreas(previousResponses || []);
    const initialAssessmentComplete = isInitialAssessmentComplete(assessedAreas);
    
    // Check if we're ready for diagnosis using the new function
    const readyForDiagnosis = isPhase2 && isReadyForDiagnosis(previousResponses, assessedAreas);

    // Create system message based on phase
    const systemMessage = {
      role: 'system',
      content: `You are a medical assessment AI assistant. Your role is to ask relevant follow-up questions about the user's symptoms to gather comprehensive information for diagnosis. Always provide exactly 5 answer options plus an "Other" option.

      Based on the user's responses, estimate the total number of questions needed and track the current question number. Include this in your response.

      Previous responses: ${JSON.stringify(previousResponses)}
      Current phase: ${isPhase2 ? 'Phase 2 (Detailed Assessment)' : 'Phase 1 (Initial Assessment)'}
      Areas assessed: ${JSON.stringify(assessedAreas)}
      Ready for diagnosis: ${readyForDiagnosis}

      In Phase 1, focus on gathering basic information about all assessment areas.
      In Phase 2, ask detailed follow-up questions based on the initial responses.
      Set readyForDiagnosis to true only when you have gathered enough detailed information for a diagnosis.

      Guidelines for setting readyForDiagnosis:
      1. Must have at least 5 total responses
      2. Must have covered all assessment areas
      3. Must have at least one detailed response in each area
      4. Must be in Phase 2

      Respond in the following JSON format:
      {
        "questions": [{
          "text": "question text",
          "options": ["option1", "option2", "option3", "option4", "option5", "Other"]
        }],
        "assessedAreas": {
          "location": boolean,
          "characterSeverity": boolean,
          "timing": boolean,
          "triggers": boolean,
          "riskFactors": boolean
        },
        "totalPredictedQuestions": number,
        "currentQuestionNumber": number,
        "readyForDiagnosis": boolean
      }`
    };

    // Construct the conversation history with phase context
    let conversationHistory = (previousResponses || []).map((response: any) => ({
      role: 'user',
      content: `Question: ${response.question}\nAnswer: ${response.answer}`
    }));

    // Add the current selection
    conversationHistory.push({
      role: 'user',
      content: `Category: ${category}\nSymptom: ${selection}`
    });

    try {
      console.log('Sending request to OpenAI...');
      const completion = await openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages: [
          systemMessage,
          ...conversationHistory,
          {
            role: 'user',
            content: `Generate the next most relevant follow-up question. ${
              isPhase2 
                ? `Ask detailed follow-up questions based on the collected information. Focus on any concerning symptoms or unclear responses. Set readyForDiagnosis to true only when you have gathered enough information for a diagnosis.` 
                : `Focus on uncovered areas: ${
                    Object.entries(assessedAreas)
                      .filter(([_, assessed]) => !assessed)
                      .map(([area]) => area)
                      .join(', ')
                  }`
            }`
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      console.log('OpenAI response:', completion.choices[0].message);

      const responseContent = completion.choices[0].message.content;
      if (!responseContent) {
        throw new Error('Empty response from OpenAI');
      }

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseContent);
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', responseContent);
        throw new Error('Invalid JSON response from OpenAI');
      }

      if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
        throw new Error('Invalid response format from OpenAI');
      }

      // Ensure each question has exactly 5 options plus "Other"
      parsedResponse.questions = parsedResponse.questions.map((question: any) => {
        let options = Array.isArray(question.options) ? question.options : [];
        
        // Remove any "Other" options that ChatGPT might have included
        options = options.filter(opt => !opt.toLowerCase().includes('other'));
        
        // If we have fewer than 5 options, add generic ones based on the assessment area
        while (options.length < 5) {
          options.push(`Option ${options.length + 1}`);
        }
        
        // If we have more than 5 options, keep only the first 5
        options = options.slice(0, 5);
        
        // Add "Other" option
        options.push('Other');
        
        return {
          text: question.text,
          options: options
        };
      });

      // In phase 2, check if we have enough information for diagnosis
      if (isPhase2) {
        const responseCount = (previousResponses || []).length;
        const hasEnoughResponses = responseCount >= 5; // Minimum responses needed
        const hasKeyAreas = assessedAreas && Object.values(assessedAreas).every(area => area);
        
        // Set readyForDiagnosis if we have enough information
        parsedResponse.readyForDiagnosis = hasEnoughResponses && hasKeyAreas;
        
        // Update progress tracking for phase 2
        parsedResponse.totalPredictedQuestions = 10; // Typical total questions
        parsedResponse.currentQuestionNumber = Math.min(responseCount, 10);
      } else {
        parsedResponse.readyForDiagnosis = false;
        
        // Update progress tracking for phase 1
        const assessedCount = Object.values(assessedAreas).filter(Boolean).length;
        parsedResponse.totalPredictedQuestions = 5;
        parsedResponse.currentQuestionNumber = assessedCount;
      }

      // Only include assessedAreas in phase 1
      const response = {
        ...parsedResponse,
        assessedAreas: !isPhase2 ? assessedAreas : undefined,
      };

      return NextResponse.json(response);
      
    } catch (openAiError: any) {
      console.error('OpenAI API Error:', openAiError);
      return NextResponse.json(
        { error: 'Failed to generate questions', details: openAiError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Server Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
