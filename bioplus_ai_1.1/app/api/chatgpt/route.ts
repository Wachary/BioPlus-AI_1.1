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

// Helper function to check for contradictions in responses
function findContradictions(responses: any[]) {
  interface Contradiction {
    category: string;
    response1: any;
    response2: any;
  }
  
  const contradictions: Contradiction[] = [];
  
  // Common contradiction patterns to check
  const patterns = {
    timing: {
      recent: ['just started', 'began recently', 'new', 'started today', 'since yesterday'],
      chronic: ['years', 'months', 'chronic', 'long time', 'always had']
    },
    severity: {
      mild: ['mild', 'slight', 'minor', 'barely', 'little'],
      severe: ['severe', 'extreme', 'worst', 'intense', 'unbearable']
    },
    frequency: {
      rare: ['rarely', 'occasionally', 'sometimes', 'few times'],
      constant: ['constant', 'always', 'continuous', 'persistent', 'all the time']
    },
    improvement: {
      better: ['improves', 'gets better', 'relieves', 'helps', 'reduces'],
      worse: ['worsens', 'gets worse', 'aggravates', 'increases', 'intensifies']
    }
  };

  // Helper function to check if text matches any pattern
  const matchesPattern = (text: string, patterns: string[]) => {
    return patterns.some(pattern => text.toLowerCase().includes(pattern));
  };

  // Check each response against others for contradictions
  for (let i = 0; i < responses.length; i++) {
    for (let j = i + 1; j < responses.length; j++) {
      const response1 = responses[i].answer.toLowerCase();
      const response2 = responses[j].answer.toLowerCase();

      // Check each pattern category for contradictions
      Object.entries(patterns).forEach(([category, categoryPatterns]) => {
        const matches1 = Object.entries(categoryPatterns).find(([_, patterns]) => 
          matchesPattern(response1, patterns)
        );
        const matches2 = Object.entries(categoryPatterns).find(([_, patterns]) => 
          matchesPattern(response2, patterns)
        );

        if (matches1 && matches2 && matches1[0] !== matches2[0]) {
          contradictions.push({
            category,
            response1: responses[i],
            response2: responses[j]
          });
        }
      });
    }
  }

  return contradictions;
}

// Helper function to determine if we have enough information for diagnosis
function isReadyForDiagnosis(responses: any[], assessedAreas: any) {
  // Must have at least 8 responses for a thorough assessment
  if (!responses || responses.length < 8) {
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
    location: ['where', 'location', 'area', 'spot', 'place', 'side', 'specific', 'exactly'],
    characterSeverity: ['severity', 'pain level', 'intensity', 'type of', 'nature of', 'character', 'how severe', 'describe the', 'quality', 'feels like'],
    timing: ['when', 'how long', 'duration', 'often', 'frequency', 'start', 'began', 'pattern', 'time of day', 'seasonal'],
    triggers: ['trigger', 'worse', 'better', 'improve', 'aggravate', 'affect', 'impact', 'factors', 'activities', 'foods', 'environmental'],
    riskFactors: ['history', 'condition', 'medical', 'risk', 'family', 'previous', 'existing', 'medication', 'allergies', 'lifestyle']
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

  // Each area should have at least two detailed responses for thoroughness
  const hasEnoughResponses = Object.values(areaResponses).every(count => count >= 2);
  
  // Check for contradictions
  const contradictions = findContradictions(responses);
  const hasContradictions = contradictions.length > 0;

  // Only ready if we have enough responses and no contradictions
  return hasEnoughResponses && !hasContradictions;
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
      
      In Phase 2:
      1. Ask detailed follow-up questions based on the initial responses
      2. If you detect any contradictions in the responses, ask clarifying questions to resolve them
      3. Ensure you have at least 2 detailed responses for each assessment area
      4. Pay special attention to severity, timing, and progression of symptoms
      5. Verify any concerning or unusual combinations of symptoms
      6. Set readyForDiagnosis to true ONLY when:
         - You have gathered enough detailed information (at least 8 responses)
         - You have at least 2 detailed responses for each assessment area
         - There are no contradictions in the responses
         - You have verified any unusual symptom combinations
         - You are confident you have enough information for an accurate diagnosis

      Format response as JSON with:
      {
        "questions": [{"text": "question", "options": ["option1",...,"option5","Other"]}],
        "assessedAreas": {"location": bool,...},
        "totalPredictedQuestions": number,
        "currentQuestionNumber": number,
        "readyForDiagnosis": bool
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
      parsedResponse.questions = await Promise.all(parsedResponse.questions.map(async (question: any) => {
        let options = Array.isArray(question.options) ? question.options : [];
        
        // Remove any "Other" options that ChatGPT might have included
        options = options.filter((opt: string) => !opt.toLowerCase().includes('other'));
        
        // If we have fewer than 5 options, ask ChatGPT to generate more
        if (options.length < 5) {
          const moreOptionsResponse = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
              {
                role: "system",
                content: "You are helping to generate additional answer options for a medical assessment question. Provide options that are relevant to the question context. Return ONLY a JSON array of strings containing exactly the number of additional options needed, with no other text."
              },
              {
                role: "user",
                content: `Question: "${question.text}"\nExisting options: ${JSON.stringify(options)}\nNumber of additional options needed: ${5 - options.length}`
              }
            ],
            temperature: 0.7
          });

          try {
            const content = moreOptionsResponse.choices[0].message.content;
            if (content) {
              const additionalOptions = JSON.parse(content);
              if (Array.isArray(additionalOptions)) {
                options.push(...additionalOptions);
              }
            }
          } catch (error) {
            console.error('Error parsing additional options:', error);
          }
        }

        // If we have more than 5 options, keep only the first 5
        options = options.slice(0, 5);
        
        // Add "Other" option
        options.push('Other');
        
        return {
          ...question,
          options: options
        };
      }));

      // In phase 2, check if we have enough information for diagnosis
      if (isPhase2) {
        const responseCount = (previousResponses || []).length;
        const hasEnoughResponses = responseCount >= 8; // Minimum responses needed
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
