export interface QuestionResponse {
  question: string;
  answer: string;
  questionData: {
    text: string;
    options: string[];
  };
}

export interface DiagnosisVector {
  condition: string;
  vector: number[];
  responses: QuestionResponse[];
}

export interface DiagnosisMatch {
  condition: string;
  similarity: number;
  confidence: number;
  responses: QuestionResponse[];
}
