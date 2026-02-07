import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Play, BookOpen, Clock, ChevronRight } from "lucide-react";
import { fases, type Modulo } from "@/data/consultoriaContent";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";

/**
 * Página de Consultoria Educacional — Estilo Netflix
 * 
 * Navegação livre entre fases e módulos.
 * Sem controle de progresso, sem bloqueios.
 * Conteúdo definido em src/data/consultoriaContent.ts
 */
const Consultoria = () => {
  const [selectedModule, setSelectedModule] = useState<Modulo | null>(null);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 lg:ml-[72px]">
        <AppHeader />

        <AnimatePresence mode="wait">
          {selectedModule ? (
            <ModuleDetailView
              key={selectedModule.id}
              modulo={selectedModule}
              onBack={() => setSelectedModule(null)}
            />
          ) : (
            <ModulesOverview
              key="overview"
              onSelectModule={setSelectedModule}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ===== OVERVIEW — Lista de fases e módulos ===== */
const ModulesOverview = ({ onSelectModule }: { onSelectModule: (m: Modulo) => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.25 }}
    className="p-4 md:p-8 max-w-7xl mx-auto space-y-10"
  >
    {/* Header */}
    <div className="space-y-2">
      <h1 className="text-2xl md:text-3xl font-bold text-foreground">
        Consultoria Estratégica de Disparos
      </h1>
      <p className="text-muted-foreground text-sm md:text-base">
        Aprenda a operar com segurança, controle e escala
      </p>
    </div>

    {/* Fases */}
    {fases.map((fase, faseIndex) => (
      <section key={faseIndex} className="space-y-4">
        {/* Fase header */}
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg md:text-xl font-semibold text-foreground">
            {fase.fase}
          </h2>
          <span className="text-xs text-muted-foreground font-medium bg-muted/50 px-2 py-0.5 rounded-full">
            {fase.descricao}
          </span>
        </div>

        {/* Módulos — scroll horizontal */}
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent -mx-4 px-4 md:mx-0 md:px-0">
          {fase.modulos.map((modulo) => (
            <ModuleCard
              key={modulo.id}
              modulo={modulo}
              onClick={() => onSelectModule(modulo)}
            />
          ))}
        </div>
      </section>
    ))}
  </motion.div>
);

/* ===== CARD — Módulo individual ===== */
const ModuleCard = ({ modulo, onClick }: { modulo: Modulo; onClick: () => void }) => (
  <motion.button
    onClick={onClick}
    whileHover={{ scale: 1.03, y: -4 }}
    whileTap={{ scale: 0.98 }}
    className="group flex-shrink-0 w-[260px] md:w-[300px] rounded-xl border border-border/50 bg-card overflow-hidden text-left transition-shadow duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
  >
    {/* Thumbnail area */}
    <div className="relative h-36 bg-gradient-to-br from-primary/20 via-primary/10 to-muted/30 flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
      <div className="relative z-10 w-14 h-14 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
        <Play size={24} className="text-primary ml-0.5" />
      </div>
      <span className="absolute top-3 left-3 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
        {modulo.id}
      </span>
    </div>

    {/* Info */}
    <div className="p-4 space-y-2">
      <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
        {modulo.titulo}
      </h3>
      <p className="text-xs text-muted-foreground line-clamp-2">
        {modulo.descricao}
      </p>
      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
        <span className="flex items-center gap-1">
          <BookOpen size={12} />
          {modulo.aulas.length} {modulo.aulas.length === 1 ? "aula" : "aulas"}
        </span>
        <ChevronRight size={14} className="ml-auto text-primary/50 group-hover:text-primary transition-colors" />
      </div>
    </div>
  </motion.button>
);

/* ===== DETAIL — Visualização do módulo com aulas e vídeos ===== */
const ModuleDetailView = ({ modulo, onBack }: { modulo: Modulo; onBack: () => void }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    transition={{ duration: 0.25 }}
    className="p-4 md:p-8 max-w-5xl mx-auto space-y-8"
  >
    {/* Back button + header */}
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Voltar para módulos
      </button>

      <div className="space-y-1">
        <span className="text-xs font-bold text-primary">MÓDULO {modulo.id}</span>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {modulo.titulo}
        </h1>
        <p className="text-muted-foreground">{modulo.descricao}</p>
      </div>
    </div>

    {/* Lista de aulas */}
    <div className="space-y-6">
      {modulo.aulas.map((aula, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="space-y-3"
        >
          {/* Aula header */}
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
              {i + 1}
            </span>
            <h3 className="font-medium text-foreground text-sm md:text-base">
              {aula.titulo}
            </h3>
          </div>

          {/* Video embed */}
          <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border/50 bg-muted/30">
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube-nocookie.com/embed/${aula.videoId}`}
              title={aula.titulo}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

export default Consultoria;
