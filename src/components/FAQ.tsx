import { ChevronDown, HelpCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQS = [
  {
    q: "What's a healthy blood glucose range?",
    a: "For most non-pregnant adults: fasting 80–130 mg/dL, and under 180 mg/dL 1–2 hours after meals. Targets vary — check with your doctor.",
  },
  {
    q: "What causes a sudden high reading?",
    a: "Common triggers include carb-heavy meals, stress, illness, dehydration, missed medication, and reduced physical activity.",
  },
  {
    q: "What should I do if my reading is below 70?",
    a: "Use the 15-15 rule: eat 15 g of fast carbs (juice, glucose tablets), wait 15 minutes, recheck. Repeat if still low and seek help if symptoms persist.",
  },
  {
    q: "How often should I check my sugar?",
    a: "Type 1 patients often check 4+ times a day. Type 2 frequency varies. Follow your care plan — if unsure, ask your doctor.",
  },
  {
    q: "Does exercise lower glucose?",
    a: "Usually yes — moderate activity can lower glucose for hours afterward. Monitor closely if you take insulin.",
  },
  {
    q: "Can I trust the AI insights here?",
    a: "Insights are generated from your logged readings to highlight patterns. They are not a medical diagnosis — always discuss changes with your doctor.",
  },
];

export function FAQ() {
  return (
    <div className="glass-card rounded-2xl p-6 border border-border">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="w-5 h-5 text-accent" />
        <h2 className="text-lg font-semibold">Diabetes FAQ</h2>
      </div>
      <Accordion type="single" collapsible className="w-full">
        {FAQS.map((f, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger className="text-sm text-left hover:text-primary transition-colors">{f.q}</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
