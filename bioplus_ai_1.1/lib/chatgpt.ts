import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface QuestionGenerationParams {
  symptoms: string[];
  previousResponses: Array<{
    question: string;
    answer: string;
  }>;
}

export async function generateNextQuestions(params: QuestionGenerationParams) {
  const { symptoms, previousResponses } = params;

  // Create a context-aware prompt
  const prompt = `Based on the following symptoms: ${symptoms.join(', ')}
Previous responses:
${previousResponses.map(r => `Q: ${r.question}\nA: ${r.answer}`).join('\n')}

Generate 3 relevant follow-up questions that would help determine a potential diagnosis. 
Questions should be specific and closed-ended.
Format as JSON array of objects with 'text' and 'options' fields.`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4-turbo-preview",
      response_format: { type: "json_object" },
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Error generating questions:', error);
    throw error;
  }
}

export async function analyzeResponses(responses: Array<{ question: string; answer: string }>) {
  const prompt = `Analyze these symptoms and responses:
${responses.map(r => `Q: ${r.question}\nA: ${r.answer}`).join('\n')}

Provide a preliminary analysis with:
1. Potential conditions
2. Confidence level for each condition (percentage)
3. Recommended next steps
Format as JSON object.`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4-turbo-preview",
      response_format: { type: "json_object" },
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Error analyzing responses:', error);
    throw error;
  }
}
