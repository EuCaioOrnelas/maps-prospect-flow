import {
 Accordion,
 AccordionContent,
 AccordionItem,
 AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Link } from "react-router-dom";

import { faqs } from "./faqData";
export { faqJsonLd } from "./faqData";

export const FAQSection = () => {
 const { ref, isVisible } = useScrollAnimation();
 
 return (
 <section 
 id="faq" 
 className="py-16 md:py-24 relative overflow-hidden w-full"
 ref={ref as React.RefObject<HTMLElement>}
 >
 <div className="absolute left-1/2 top-8 h-40 w-[26rem] -translate-x-1/2 rounded-full bg-gradient-glow opacity-10 soft-glow" />
 
 <div className="container mx-auto px-4 relative z-10 max-w-6xl">
 <div 
 className={`text-center mb-10 sm:mb-16 transition-all duration-700 ${
 isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
 }`}
 >
 <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-hover glass mb-4 sm:mb-6">
 <HelpCircle size={16} className="text-primary" />
 <span className="text-xs sm:text-sm text-muted-foreground">Dúvidas Frequentes</span>
 </div>
 <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4 px-2 text-foreground">
 Perguntas Frequentes
 </h2>
 <p className="text-sm sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
 Tudo sobre a Wiize e a sua máquina de vendas B2B
 </p>
 </div>

 <div className="max-w-3xl mx-auto">
 <div className={`transition-all duration-500 ${
 isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
 }`}>
 <Accordion type="single" collapsible className="divide-y divide-border/40">
 {faqs.map((faq, index) => (
 <AccordionItem
 key={index}
 value={`item-${index}`}
 className="border-none"
 >
 <AccordionTrigger className="text-left font-display font-semibold hover:no-underline py-5 text-sm sm:text-base">
 {faq.question}
 </AccordionTrigger>
 <AccordionContent className="text-muted-foreground pb-5 leading-relaxed text-sm sm:text-base">
 {faq.answer}
 </AccordionContent>
 </AccordionItem>
 ))}
 </Accordion>
 </div>

 <div className="flex justify-center mt-8">
 <Link to="/ajuda/faq">
 <Button variant="hero" size="lg">
 Ver todas as perguntas
 </Button>
 </Link>
 </div>
 </div>
 </div>
 </section>
 );
};
