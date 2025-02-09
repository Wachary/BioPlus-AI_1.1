import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { responses } = body;

    if (!responses || !Array.isArray(responses)) {
      return NextResponse.json(
        { error: 'Responses array is required' },
        { status: 400 }
      );
    }

    // Format responses for the prompt
    const formattedResponses = responses
      .map((r: any) => `Q: ${r.question}\nA: ${r.answer}`)
      .join('\n');

    const prompt = `You are a medical AI assistant providing a preliminary assessment based on patient responses. Your role is to analyze the symptoms objectively and avoid making assumptions.

Here are the patient's responses:
${formattedResponses}

IMPORTANT GUIDELINES:
1. Analyze the symptoms OBJECTIVELY without bias
2. DO NOT default to anxiety or psychological conditions unless there is strong evidence
3. Consider physical conditions first when physical symptoms are present
4. Look for patterns and clusters of symptoms that typically occur together
5. Consider both common and less common conditions that match the symptoms
6. If confidence is below 40%, indicate that more information is needed
7. If symptoms are vague or non-specific, indicate "Insufficient Information"

Based on these responses, please:
1. Determine the most likely condition that explains ALL or MOST of the symptoms
2. Assess the confidence level (0-100)
3. Provide recommendations based on severity

Format your response as JSON with the following structure:
{
  "condition": "string",
  "confidence": number,
  "recommendations": [
    {
      "text": "string",
      "type": "urgent|important|general"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4-1106-preview", // Using GPT-4 for better medical reasoning
      temperature: 0.5, // Lower temperature for more consistent results
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    const parsedResponse = JSON.parse(responseContent);
    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error('Error in diagnose route:', error);
    return NextResponse.json(
      { error: 'Failed to process diagnosis request' },
      { status: 500 }
    );
  }
}
