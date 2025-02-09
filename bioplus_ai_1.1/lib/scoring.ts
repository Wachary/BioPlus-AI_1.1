interface Symptom {
  name: string;
  severity: number; // 1-10
  duration: number; // in days
}

interface Condition {
  name: string;
  symptoms: Array<{
    name: string;
    weight: number; // 0-1
  }>;
}

export function calculateConfidenceScore(
  userSymptoms: Symptom[],
  condition: Condition
): number {
  let totalScore = 0;
  let maxPossibleScore = 0;

  // Calculate weighted score based on symptom matching and severity
  condition.symptoms.forEach(conditionSymptom => {
    const matchingSymptom = userSymptoms.find(
      s => s.name.toLowerCase() === conditionSymptom.name.toLowerCase()
    );

    if (matchingSymptom) {
      // Factor in both the presence of the symptom and its severity
      totalScore += (matchingSymptom.severity / 10) * conditionSymptom.weight;
    }
    maxPossibleScore += conditionSymptom.weight;
  });

  // Convert to percentage
  const confidenceScore = (totalScore / maxPossibleScore) * 100;

  // Round to 2 decimal places
  return Math.round(confidenceScore * 100) / 100;
}

export function shouldBreakQuestionnaire(confidenceScores: number[]): boolean {
  // Break if any condition has >90% confidence
  return confidenceScores.some(score => score > 90);
}

export function prioritizeNextQuestions(
  currentConfidenceScores: Array<{ condition: string; score: number }>,
  remainingSymptoms: Array<{ symptom: string; weight: number }>
): Array<{ symptom: string; priority: number }> {
  // Sort symptoms by their potential impact on confidence scores
  return remainingSymptoms
    .map(symptom => ({
      symptom: symptom.symptom,
      priority: calculateQuestionPriority(symptom, currentConfidenceScores)
    }))
    .sort((a, b) => b.priority - a.priority);
}

function calculateQuestionPriority(
  symptom: { symptom: string; weight: number },
  confidenceScores: Array<{ condition: string; score: number }>
): number {
  // Higher priority for symptoms that could significantly impact conditions
  // with mid-range confidence scores (40-80%)
  const relevantConditions = confidenceScores.filter(
    score => score.score >= 40 && score.score <= 80
  );

  return symptom.weight * relevantConditions.length;
}
