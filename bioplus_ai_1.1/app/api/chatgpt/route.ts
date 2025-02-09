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

    // Only check assessment areas in phase 1
    const assessedAreas = !isPhase2 ? getAssessedAreas(previousResponses || []) : null;
    const initialAssessmentComplete = !isPhase2 ? isInitialAssessmentComplete(assessedAreas) : true;

    // Create system message based on phase
    const systemMessage = {
      role: 'system',
      content: `You are a medical assessment AI assistant. Your role is to ask relevant follow-up questions about the user's symptoms to gather comprehensive information for diagnosis. Always provide exactly 5 answer options plus an "Other" option.

      Based on the user's responses, estimate the total number of questions needed and track the current question number. Include this in your response.

      Previous responses: ${JSON.stringify(previousResponses)}
      Current phase: ${isPhase2 ? 'Phase 2 (Detailed Assessment)' : 'Phase 1 (Initial Assessment)'}

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
        "currentQuestionNumber": number
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
                ? 'Make it specific and predictive based on the collected information.' 
                : `Focus on uncovered areas: ${
                    Object.entries(assessedAreas || {})
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

      // Only include assessedAreas in phase 1
      const response = {
        ...parsedResponse,
        ...(isPhase2 ? {} : { assessedAreas }),
        isPhase2
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
