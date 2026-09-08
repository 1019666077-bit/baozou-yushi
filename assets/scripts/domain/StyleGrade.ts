export type StyleGrade = "C" | "B" | "A" | "S";

export const STYLE_GRADE_THRESHOLDS = {
  B: 40,
  A: 80,
  S: 130,
} as const;

export function styleGradeFor(points: number): StyleGrade {
  const safe = Math.max(0, points);
  if (safe >= STYLE_GRADE_THRESHOLDS.S) return "S";
  if (safe >= STYLE_GRADE_THRESHOLDS.A) return "A";
  if (safe >= STYLE_GRADE_THRESHOLDS.B) return "B";
  return "C";
}

export function styleGradeLabel(grade: StyleGrade): string {
  return `${grade}级`;
}
