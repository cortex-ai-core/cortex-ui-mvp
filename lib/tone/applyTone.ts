// /lib/tone/applyTone.ts

export type ToneMode =
  | "neutral"
  | "ceo"
  | "advisory"
  | "recruiting"
  | "cybersecurity"
  | "datamanagement"
  | "ventures";

export function applyTone(content: string, toneMode: ToneMode): string {
  switch (toneMode) {
    case "ceo":
      return `**CEO Mode — Strategic Precision**\n\n${content}`;

    case "advisory":
      return `**Advisory Insight:**\n${content}`;

    case "recruiting":
      return `**Recruiting Lens:**\n${content}`;

    case "cybersecurity":
      return `**Cybersecurity Assessment:**\n${content}`;

    case "datamanagement":
      return `**Data Management Perspective:**\n${content}`;

    case "ventures":
      return `**Venture Analysis:**\n${content}`;

    case "neutral":
    default:
      return content;
  }
}
