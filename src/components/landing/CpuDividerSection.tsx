import { motion } from "framer-motion";
import { CpuArchitecture } from "@/components/ui/cpu-architecture";
import openaiLogo from "@/assets/logos/openai.svg";
import metaLogo from "@/assets/logos/meta.svg";
import whatsappLogo from "@/assets/logos/whatsapp.svg";
import googleLogo from "@/assets/logos/google.svg";

const endpointLogos = [
  { src: openaiLogo, alt: "OpenAI", position: "left-[3%] top-[12%]" },
  { src: googleLogo, alt: "Google", position: "right-[5%] top-[2%]" },
  { src: whatsappLogo, alt: "WhatsApp", position: "left-[10%] bottom-[18%]" },
  { src: metaLogo, alt: "Meta", position: "right-[2%] bottom-[10%]" },
  { src: openaiLogo, alt: "OpenAI", position: "right-[30%] top-[5%]" },
  { src: googleLogo, alt: "Google", position: "left-[28%] bottom-[5%]" },
  { src: whatsappLogo, alt: "WhatsApp", position: "right-[15%] bottom-[55%]" },
  { src: metaLogo, alt: "Meta", position: "left-[12%] top-[55%]" },
];

export const CpuDividerSection = () => {
  return (
    <section className="relative -my-4 md:-my-6 overflow-hidden w-full">
      {/* Fading edges */}
      <div className="absolute inset-y-0 left-0 w-20 md:w-32 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, hsl(var(--background)), transparent)' }} />
      <div className="absolute inset-y-0 right-0 w-20 md:w-32 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, hsl(var(--background)), transparent)' }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="container mx-auto px-4 max-w-5xl relative"
      >
        {/* Logos at endpoints */}
        {endpointLogos.map((logo, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
            className={`absolute ${logo.position} z-20 hidden md:flex items-center justify-center`}
          >
            <div className="w-7 h-7 rounded-full bg-card/80 border border-border/50 flex items-center justify-center backdrop-blur-sm shadow-lg shadow-black/20">
              <img src={logo.src} alt={logo.alt} className="w-3.5 h-3.5 opacity-70" />
            </div>
          </motion.div>
        ))}

        <div className="opacity-60">
          <CpuArchitecture
            text="WIIZE AI"
            width="100%"
            height="100%"
            className="text-muted-foreground/40"
          />
        </div>
      </motion.div>
    </section>
  );
};
