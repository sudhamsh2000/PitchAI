import type { PitchMode } from "@/types/pitch";

export const PITCH_MODES: { id: PitchMode; label: string; hint: string }[] = [
  {
    id: "investor",
    label: "Investor Mode",
    hint: "Aggressive, skeptical, focused on traction and economics.",
  },
  {
    id: "hackathon",
    label: "Hackathon Mode",
    hint: "Fast, structured, demo-first and time-boxed.",
  },
  {
    id: "healthcare",
    label: "Healthcare Mode",
    hint: "Accuracy, evidence, compliance, and patient safety.",
  },
  {
    id: "beginner",
    label: "Beginner Mode",
    hint: "Guided prompts with softer tone but still concrete.",
  },
];

export function modeInstruction(mode: PitchMode): string {
  switch (mode) {
    case "investor":
      return `Mode: INVESTOR. Be direct and skeptical. Ask about market size, defensibility, revenue, unit economics, and why now. Challenge hand-wavy claims.`;
    case "hackathon":
      return `Mode: HACKATHON. Move quickly. Emphasize problem-solution fit, demo, and what was built in limited time. Keep questions tight.`;
    case "healthcare":
      return `Mode: HEALTHCARE. Prioritize clinical validity, regulatory path, evidence, safety, and stakeholder trust. Flag vague medical claims.`;
    case "beginner":
      return `Mode: BEGINNER. Use shorter questions and clearer scaffolding, but still demand concrete examples and numbers where possible.`;
    default:
      return "";
  }
}
