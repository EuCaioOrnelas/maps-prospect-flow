import { CpuArchitecture } from "@/components/ui/cpu-architecture";

export const CpuDividerSection = () => {
  return (
    <section className="relative py-8 md:py-12 overflow-hidden w-full">
      {/* Fading edges */}
      <div className="absolute inset-y-0 left-0 w-24 md:w-40 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, hsl(var(--background)), transparent)' }} />
      <div className="absolute inset-y-0 right-0 w-24 md:w-40 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, hsl(var(--background)), transparent)' }} />

      <div className="container mx-auto px-4 max-w-5xl opacity-40">
        <CpuArchitecture
          text="AI"
          width="100%"
          height="100%"
          className="text-muted-foreground/30"
        />
      </div>
    </section>
  );
};
