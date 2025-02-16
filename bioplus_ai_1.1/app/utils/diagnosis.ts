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
  const optionIndex = questionData.options.indexOf(answer);
  return optionIndex === -1 ? 0 : (optionIndex + 1) / questionData.options.length;
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

  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));

  if (mag1 === 0 || mag2 === 0) return 0;
  return dotProduct / (mag1 * mag2);
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
 * Calculates confidence based on multiple factors:
 * 1. Vector similarity with known condition patterns
 * 2. Response completeness and quality
 * 3. Symptom consistency and specificity
 * 4. Number of matching symptoms
 */
function calculateConfidence(similarity: number, responses: QuestionResponse[]): number {
  // Start with base confidence from vector similarity (0-100)
  let confidence = similarity * 100;

  // 1. Response Quality Score (0-1)
  const responseQuality = responses.reduce((score, r) => {
    // Penalize vague or uncertain answers
    if (r.answer.toLowerCase().includes('not sure') || 
        r.answer.toLowerCase().includes('maybe') ||
        r.answer.toLowerCase().includes("don't know")) {
      score -= 0.1;
    }
    // Reward specific, detailed answers
    if (r.answer.length > 10 && !r.answer.toLowerCase().includes('not sure')) {
      score += 0.05;
    }
    return score;
  }, 1);

  // 2. Symptom Consistency Score (0-1)
  const symptomGroups = responses.reduce((groups, r) => {
    const answer = r.answer.toLowerCase();
    // Group related symptoms (e.g., pain-related, timing-related)
    if (answer.includes('pain') || answer.includes('ache')) groups.pain = (groups.pain || 0) + 1;
    if (answer.includes('time') || answer.includes('duration')) groups.timing = (groups.timing || 0) + 1;
    if (answer.includes('severity') || answer.includes('intensity')) groups.severity = (groups.severity || 0) + 1;
    return groups;
  }, {} as Record<string, number>);
  
  const consistencyScore = Object.values(symptomGroups).length > 0 ? 
    Object.values(symptomGroups).reduce((a, b) => a + b, 0) / responses.length : 0.5;

  // 3. Response Completeness (0-1)
  const completenessScore = responses.filter(r => r.answer && r.answer.length > 0).length / responses.length;

  // 4. Calculate final confidence score
  confidence *= (
    responseQuality * 0.3 +    // 30% weight for response quality
    consistencyScore * 0.3 +   // 30% weight for symptom consistency
    completenessScore * 0.4    // 40% weight for completeness
  );

  // 5. Additional adjustments
  if (responses.length < 3) confidence *= 0.8; // Penalize very short assessments
  if (similarity < 0.3) confidence *= 0.7;     // Penalize very low similarity matches

  // Ensure confidence is between 0 and 100
  return Math.round(Math.min(Math.max(confidence, 0), 100));
}

/**
 * Main function to find the best diagnosis match using vector similarity
 */
export async function findBestDiagnosisMatch(responses: QuestionResponse[]): Promise<DiagnosisMatch> {
  // Generate user's response vector
  const userVector = generateResponseVector(responses);

  // Get potential diagnosis vectors
  const diagnosisVectors = await generateDiagnosisVectors(responses);

  // Calculate similarities and find best match
  const matches = diagnosisVectors.map(diagnosis => {
    const similarity = cosineSimilarity(userVector, diagnosis.vector);
    const confidence = calculateConfidence(similarity, responses);

    return {
      condition: diagnosis.condition,
      similarity,
      confidence,
      responses: diagnosis.responses
    };
  });

  // Sort by similarity and return best match
  matches.sort((a, b) => b.similarity - a.similarity);
  return matches[0];
}
