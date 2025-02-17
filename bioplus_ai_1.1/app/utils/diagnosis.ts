import { OpenAI } from 'openai';
import { QuestionResponse, DiagnosisVector, DiagnosisMatch } from '../types/diagnosis';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Converts a response's answer to a numerical value based on its position in options
 */
function answerToVector(response: QuestionResponse): number {
  const { answer, questionData } = response;
  
  // Handle 'Other' responses
  if (answer === 'Other' || !questionData.options.includes(answer)) {
    return 0.5; // Neutral value for custom/other responses
  }

  // Get the index (0-based) and convert to a value between 0 and 1
  const optionIndex = questionData.options.indexOf(answer);
  return (optionIndex + 1) / (questionData.options.length);
}

/**
 * Generates a vector representation of responses
 */
function generateResponseVector(responses: QuestionResponse[]): number[] {
  return responses.map(answerToVector);
}

/**
 * Calculates cosine similarity between two vectors
 */
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) return 0;
  if (vec1.length === 0) return 0;

  // Calculate dot product
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  
  // Calculate magnitudes
  const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));

  // Avoid division by zero
  if (mag1 === 0 || mag2 === 0) return 0;

  // Normalize the result to be between 0 and 1
  return (dotProduct / (mag1 * mag2) + 1) / 2;
}

/**
 * Generates diagnosis vectors for potential conditions using GPT-4
 */
async function generateDiagnosisVectors(responses: QuestionResponse[]): Promise<DiagnosisVector[]> {
  const prompt = `Based on these patient responses, list the top 3 most likely diagnoses. For each diagnosis, answer the same questions as if a typical patient with that condition was responding.

Patient Responses:
${responses.map(r => `Q: ${r.question}\nA: ${r.answer}`).join('\n')}

Format your response as JSON:
{
  "diagnoses": [
    {
      "condition": "string",
      "responses": [
        {
          "question": "string",
          "answer": "string"
        }
      ]
    }
  ]
}`;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-4-1106-preview",
    temperature: 0.2,
    response_format: { type: "json_object" }
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('No response from OpenAI');

  const result = JSON.parse(content);
  
  return result.diagnoses.map((diagnosis: any) => ({
    condition: diagnosis.condition,
    responses: diagnosis.responses.map((r: any, i: number) => ({
      ...r,
      questionData: responses[i].questionData
    })),
    vector: generateResponseVector(diagnosis.responses.map((r: any, i: number) => ({
      ...r,
      questionData: responses[i].questionData
    })))
  }));
}

/**
 * Calculates confidence based on:
 * 1. Baseline confidence (50%)
 * 2. Normalized similarity score (0-50%)
 */
function calculateConfidence(similarity: number, responses: QuestionResponse[]): number {
  // Start with baseline confidence of 50%
  const baselineConfidence = 50;
  
  // Add normalized similarity score (0-50%)
  const similarityConfidence = similarity * 50;
  
  // Total confidence is baseline + similarity contribution
  const confidence = baselineConfidence + similarityConfidence;

  // Ensure confidence is between 0 and 100
  return Math.round(Math.min(Math.max(confidence, 0), 100));
}

/**
 * Main function to find the top 3 diagnosis matches using vector similarity
 */
export async function findTopDiagnoses(responses: QuestionResponse[]): Promise<DiagnosisMatch[]> {
  // Generate user's response vector
  const userVector = generateResponseVector(responses);

  // Get potential diagnosis vectors
  const diagnosisVectors = await generateDiagnosisVectors(responses);

  // Calculate similarities and find top matches
  const matches = diagnosisVectors.map(diagnosis => {
    // Ensure vectors are of the same length
    const diagnosisVector = diagnosis.vector.slice(0, userVector.length);
    const similarity = cosineSimilarity(userVector, diagnosisVector);
    const confidence = calculateConfidence(similarity, responses);

    return {
      condition: diagnosis.condition,
      similarity,
      confidence,
      responses: diagnosis.responses
    };
  });

  // Sort by confidence and return top 3
  return matches
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}
