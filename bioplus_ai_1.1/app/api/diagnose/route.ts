import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { findTopDiagnoses } from '@/app/utils/diagnosis';
import { QuestionResponse } from '@/app/types/diagnosis';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { responses } = body;

    if (!responses || !Array.isArray(responses)) {
      return NextResponse.json(
        { error: 'Invalid request format. Responses array is required.' },
        { status: 400 }
      );
    }

    // Validate response format
    const isValidResponse = responses.every((response: QuestionResponse) => 
      response.question && 
      response.answer && 
      response.questionData?.options
    );

    if (!isValidResponse) {
      return NextResponse.json(
        { error: 'Invalid response format. Each response must include question, answer, and questionData with options.' },
        { status: 400 }
      );
    }

    // Get top 3 diagnoses
    const diagnoses = await findTopDiagnoses(responses);

    // Format patient responses for GPT context
    const formattedResponses = responses
      .map((r: QuestionResponse) => `Q: ${r.question}\nA: ${r.answer}`)
      .join('\n');

    // Get detailed recommendations for each diagnosis
    const recommendationsPromises = diagnoses.map(async (diagnosis) => {
      const recommendationsPrompt = `As a medical AI assistant, analyze these patient responses and provide specific recommendations for a diagnosis of ${diagnosis.condition}.

Patient Responses:
${formattedResponses}

Key Metrics:
- Diagnosis: ${diagnosis.condition}
- Similarity Score: ${Math.round(diagnosis.similarity * 100)}%
- Initial Confidence: ${Math.round(diagnosis.confidence)}%

Based on this information, provide detailed recommendations considering:
1. The severity and urgency of the condition
2. Immediate actions or lifestyle changes needed
3. When to seek professional medical attention
4. Any warning signs to watch for

Format your response as JSON with this EXACT structure:
{
  "condition": "${diagnosis.condition}",
  "confidence": ${diagnosis.confidence},
  "similarity": ${diagnosis.similarity},
  "recommendations": [
    {
      "text": "Clear, actionable recommendation",
      "urgency": "high|medium|low"
    }
  ]
}

IMPORTANT:
- Each recommendation must be clear and actionable
- Urgency levels must be one of: high, medium, or low
- Include 3-5 specific recommendations
- Maintain all numerical values (confidence, similarity) from the input
- DO NOT change the diagnosis or metrics provided`;

      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: recommendationsPrompt }],
        model: "gpt-4-1106-preview",
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response from OpenAI');
      }

      const recommendations = JSON.parse(responseContent);

      // Validate the response format
      if (!recommendations.condition || 
          typeof recommendations.confidence !== 'number' ||
          typeof recommendations.similarity !== 'number' ||
          !Array.isArray(recommendations.recommendations)) {
        throw new Error('Invalid recommendations format from OpenAI');
      }

      return recommendations;
    });

    const recommendations = await Promise.all(recommendationsPromises);

    return NextResponse.json({ diagnoses: recommendations });
  } catch (error) {
    console.error('Error in diagnose route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process diagnosis request' },
      { status: 500 }
    );
  }
}
