export type GlucoseStatus = "low" | "normal" | "high";

export interface StatusInfo {
  status: GlucoseStatus;
  label: string;
  title: string;
  tone: "destructive" | "success" | "warning";
  suggestions: string[];
}

export const MEAL_CONTEXTS = [
  { value: "fasting", label: "Fasting" },
  { value: "before_meal", label: "Before meal" },
  { value: "after_meal", label: "After meal" },
  { value: "bedtime", label: "Bedtime" },
  { value: "random", label: "Random" },
] as const;

export type MealContext = typeof MEAL_CONTEXTS[number]["value"];

export function classify(value: number): StatusInfo {
  if (value < 70) {
    return {
      status: "low",
      label: "Low",
      title: "Hypoglycemia",
      tone: "warning",
      suggestions: [
        "Eat glucose tablets or sugar immediately",
        "Drink fruit juice or a sugary drink",
        "Avoid heavy exercise until levels rise",
        "Recheck in 15 minutes",
      ],
    };
  }
  if (value <= 140) {
    return {
      status: "normal",
      label: "Normal",
      title: "In a healthy range",
      tone: "success",
      suggestions: [
        "Maintain a balanced diet",
        "Continue regular exercise",
        "Stay hydrated throughout the day",
        "Keep monitoring as scheduled",
      ],
    };
  }
  return {
    status: "high",
    label: "High",
    title: "Hyperglycemia",
    tone: "destructive",
    suggestions: [
      "Reduce sugar and refined carb intake",
      "Do light exercise (walk for 15–20 min)",
      "Drink water and avoid sugary drinks",
      "Consult your doctor if readings stay high",
    ],
  };
}
