import { useState } from "react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { VideoModal } from "./VideoModal";
import demoCover from "@/assets/wiize-demo-cover.png";
import { Play, Sparkles } from "lucide-react";

export const DemoScrollSection = ({ onSignupClick }: { onSignupClick?: () => void }) => {
  const [open, setOpen] = useState(false);

  return (
    <section className="relative overflow-hidden -mt-12 md:-mt-20">
      {/* Bolinhas + glow — sem gradiente sólido para unificar com o Hero */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.14]"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "18px 18px",
          maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 600'%3E%3Cellipse cx='350' cy='220' rx='180' ry='200' fill='white'/%3E%3Cellipse cx='370' cy='420' rx='80' ry='120' fill='white'/%3E%3Cellipse cx='550' cy='180' rx='200' ry='180' fill='white'/%3E%3Cellipse cx='560' cy='380' rx='100' ry='100' fill='white'/%3E%3Cellipse cx='750' cy='250' rx='180' ry='150' fill='white'/%3E%3Cellipse cx='800' cy='400' rx='60' ry='80' fill='white'/%3E%3Cellipse cx='900' cy='300' rx='120' ry='100' fill='white'/%3E%3Cellipse cx='1000' cy='350' rx='80' ry='120' fill='white'/%3E%3Cellipse cx='200' cy='250' rx='100' ry='80' fill='white'/%3E%3C/svg%3E")`,
          WebkitMaskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 600'%3E%3Cellipse cx='350' cy='220' rx='180' ry='200' fill='white'/%3E%3Cellipse cx='370' cy='420' rx='80' ry='120' fill='white'/%3E%3Cellipse cx='550' cy='180' rx='200' ry='180' fill='white'/%3E%3Cellipse cx='560' cy='380' rx='100' ry='100' fill='white'/%3E%3Cellipse cx='750' cy='250' rx='180' ry='150' fill='white'/%3E%3Cellipse cx='800' cy='400' rx='60' ry='80' fill='white'/%3E%3Cellipse cx='900' cy='300' rx='120' ry='100' fill='white'/%3E%3Cellipse cx='1000' cy='350' rx='80' ry='120' fill='white'/%3E%3Cellipse cx='200' cy='250' rx='100' ry='80' fill='white'/%3E%3C/svg%3E")`,
          maskSize: "cover",
          WebkitMaskSize: "cover",
          maskPosition: "center",
          WebkitMaskPosition: "center",
        }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] md:w-[1200px] h-[800px] bg-gradient-glow opacity-[0.50] pointer-events-none" />

      <div className="relative z-10">
        <ContainerScroll
          titleComponent={
            <div className="space-y-4 px-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                <Sparkles size={12} className="fill-primary" />
                Demonstração ao vivo
              </span>
              <h2 className="font-display text-4xl md:text-6xl xl:text-7xl font-bold tracking-tight uppercase leading-[0.95] text-foreground">
                VEJA A WIIZE
                <br />
                <span className="text-shimmer-highlight">EM AÇÃO</span>
              </h2>
            </div>
          }
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group relative h-full w-full overflow-hidden rounded-2xl"
            aria-label="Assistir demonstração da Wiize"
          >
            <img
              src={demoCover}
              alt="Demonstração da plataforma Wiize"
              loading="lazy"
              className="h-full w-full object-cover object-left-top transition-transform duration-500 group-hover:scale-[1.02]"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                <div className="relative flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/40 group-hover:scale-110 transition-transform duration-300">
                  <Play size={28} className="fill-current ml-1" />
                </div>
              </div>
            </div>
          </button>
        </ContainerScroll>
      </div>

      <VideoModal open={open} onOpenChange={setOpen} onSignupClick={onSignupClick} />
    </section>
  );
};
