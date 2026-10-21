"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export type AboutFaqItem = {
  question: string;
  answer: string;
};

export function AboutFaq({ items }: { items: AboutFaqItem[] }) {
  return (
    <Accordion className="w-full">
      {items.map((item, index) => (
        <AccordionItem
          key={item.question}
          value={`faq-${index}`}
          className="border-b border-border"
        >
          <AccordionTrigger className="py-5 text-heading-lg sm:py-6">
            {item.question}
          </AccordionTrigger>
          <AccordionContent>
            <p className="max-w-[62ch] pb-6 text-body text-muted-foreground">
              {item.answer}
            </p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
