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
          <AccordionTrigger className="py-5 text-[15px] sm:py-6 sm:text-base">
            {item.question}
          </AccordionTrigger>
          <AccordionContent>
            <p className="max-w-[62ch] pb-6 text-[15px] leading-7 text-muted-foreground">
              {item.answer}
            </p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
