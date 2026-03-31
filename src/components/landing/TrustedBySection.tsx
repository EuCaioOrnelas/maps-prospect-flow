import { motion } from "framer-motion";
import googleLogo from "@/assets/logos/google.svg";
import metaLogo from "@/assets/logos/meta.svg";
import instagramLogo from "@/assets/logos/instagram.svg";
import stripeLogo from "@/assets/logos/stripe.svg";
import asaasLogo from "@/assets/logos/asaas.svg";
import vercelLogo from "@/assets/logos/vercel.svg";
import openaiLogo from "@/assets/logos/openai.svg";
import whatsappLogo from "@/assets/logos/whatsapp.svg";
import notionLogo from "@/assets/logos/notion.svg";

const brands = [
  { name: "Google", logo: googleLogo },
  { name: "Meta", logo: metaLogo },
  { name: "Instagram", logo: instagramLogo },
  { name: "Stripe", logo: stripeLogo },
  { name: "Asaas", logo: asaasLogo },
  { name: "Vercel", logo: vercelLogo },
  { name: "OpenAI", logo: openaiLogo },
  { name: "WhatsApp", logo: whatsappLogo },
  { name: "Notion", logo: notionLogo },
];

const marqueeItems = [...brands, ...brands];

export const TrustedBySection = () => {
  return (
    <section className="relative border-y border-border/40 bg-muted/30 overflow-hidden">
      <div className="text-center pt-6 pb-3">
        <p className="text-[10px] sm:text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground/50">
          Empresas que confiam na Wiize
        </p>
      </div>

      <div className="relative py-5">
        <motion.div
          className="flex w-max min-w-max whitespace-nowrap items-center"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            duration: 30,
            ease: "linear",
            repeat: Infinity,
            repeatType: "loop",
          }}
        >
          {marqueeItems.map((brand, i) => (
            <div
              key={`${brand.name}-${i}`}
              className="inline-flex items-center justify-center px-8 sm:px-12 shrink-0 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500"
              title={brand.name}
            >
              <img
                src={brand.logo}
                alt={brand.name}
                className="h-5 sm:h-6 w-auto max-w-[120px] sm:max-w-[140px] object-contain"
              />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
