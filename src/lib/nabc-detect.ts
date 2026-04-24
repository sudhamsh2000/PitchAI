import type { NABCSection } from "@/types/pitch";

const ORDER: NABCSection[] = ["need", "approach", "benefits", "competition"];

/** Light keyword signals — enough for live “did they mention it yet” hints. */
const SIGNALS: Record<NABCSection, RegExp> = {
  need:
    /\b(need|problem|pain|urgent|gap|wedge|wedge issue|tired of|suffer|struggle|expensive mistake|waste|losing|why now|unmet)\b/i,
  approach:
    /\b(approach|how we|product|build|stack|engineer|flow|ui|ux|ml|ai|data|api|automat|architect|platform|we ship|our solution)\b/i,
  benefits:
    /\b(benefit|outcome|save|faster|cheaper|roi|revenue|margin|acv|retention|ltv|reduce cost|increase|prove|pilot|metric|result)\b/i,
  competition:
    /\b(compet|incumbent|alternative|status quo|notion|sheets?|excel|substitute|legacy|incumbents?|build vs buy|vs\.|moat|different|only we)\b/i,
};

export function detectNABCInText(text: string): Record<NABCSection, boolean> {
  if (!text.trim()) {
    return { need: false, approach: false, benefits: false, competition: false };
  }
  return {
    need: SIGNALS.need.test(text),
    approach: SIGNALS.approach.test(text),
    benefits: SIGNALS.benefits.test(text),
    competition: SIGNALS.competition.test(text),
  };
}

export function nabcCurrentStage(
  detected: Record<NABCSection, boolean>,
): NABCSection {
  for (const s of ORDER) {
    if (!detected[s]) return s;
  }
  return "competition";
}

export function nabcAllComplete(detected: Record<NABCSection, boolean>): boolean {
  return ORDER.every((s) => detected[s]);
}
