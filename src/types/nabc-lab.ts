export interface NABCRubricScores {
  hook: number;
  need: number;
  approach: number;
  benefits: number;
  competition: number;
  risks: number;
  riskMitigationStrategies: number;
}

export interface NABCEvaluation {
  rubric: NABCRubricScores;
  strengths: string[];
  weaknesses: string[];
  recommendedImprovements: string[];
  summary: string;
}

export interface NABCWrittenReport {
  title: string;
  executiveSummary: string;
  scoreBreakdown: Array<{
    category: string;
    score: number;
    rationale: string;
  }>;
  strengths: string[];
  weaknesses: string[];
  recommendedImprovements: string[];
  conclusion: string;
}

export interface NABCComparisonReport {
  transcriptSummary: string;
  videoSummary: string;
  similarities: string[];
  differences: string[];
  whyDifferencesExist: string[];
  finalReflection: string;
}
