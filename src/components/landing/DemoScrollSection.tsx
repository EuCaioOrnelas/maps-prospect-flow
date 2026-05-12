import { useState } from "react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { VideoModal } from "./VideoModal";
import demoCover from "@/assets/wiize-demo-cover.png";
import { Play } from "lucide-react";

export const DemoScrollSection = ({ onSignupClick }: { onSignupClick?: () => void }) => {
  const [open, setOpen] = useState(false);

  return (
    <section className="relative bg-background overflow-hidden">
      <ContainerScroll
        titleComponent={
          <div className="space-y-3 px-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Play size={12} className="fill-primary" />
              Demonstração ao vivo
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
              Veja a Wiize <br />
              <span className="text-4xl md:text-[5rem] font-bold mt-1 leading-none bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
                em ação
              </span>
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              Da captação ao fechamento — em uma única plataforma com IA.
            </p>
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

      <VideoModal open={open} onOpenChange={setOpen} onSignupClick={onSignupClick} />
    </section>
  );
};
