import { motion } from "framer-motion";
import { CpuArchitecture } from "@/components/ui/cpu-architecture";

export const CpuDividerSection = () => {
  return (
    <section className="relative -my-4 md:-my-6 overflow-hidden w-full">
      <div className="absolute inset-y-0 left-0 w-20 md:w-32 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, hsl(var(--background)), transparent)' }} />
      <div className="absolute inset-y-0 right-0 w-20 md:w-32 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, hsl(var(--background)), transparent)' }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="container mx-auto px-4 max-w-6xl relative"
      >
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
