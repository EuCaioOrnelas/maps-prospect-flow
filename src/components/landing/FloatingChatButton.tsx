import { MessageCircle, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import wianAvatar from "@/assets/wian-avatar-sm.jpg";

const DISMISS_KEY = "wiize_wian_popup_dismissed";

export const FloatingChatButton = () => {
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    let opened = false;
    const open = () => {
      if (opened) return;
      opened = true;
      setShowPopup(true);
    };

    // Idle timer: 50s
    const timer = setTimeout(open, 50000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPopup(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  return (
    <>
      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed bottom-20 sm:bottom-24 right-3 sm:right-6 z-50 w-[min(320px,calc(100vw-1.5rem))]"
          >
            <Link
              to="/contato"
              onClick={() => setShowPopup(false)}
              aria-label="Abrir chat com a Wian"
              className="relative block rounded-panel bg-white shadow-2xl shadow-black/20 border border-black/5 overflow-hidden cursor-pointer hover:shadow-black/25 transition-shadow"
            >
              {/* Close */}
              <button
                onClick={handleClose}
                aria-label="Fechar"
                className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-neutral-600 transition-colors"
              >
                <X size={14} />
              </button>

              {/* Header with avatar + gradient */}
              <div className="relative px-4 pt-4 pb-3 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={wianAvatar}
                      alt="Wian"
                      width={44}
                      height={44}
                      decoding="async"
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-sm bg-neutral-100"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900 leading-tight">Wian</p>
                    <p className="text-[11px] text-green-600 leading-tight">Suporte Inteligente • Online</p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-black/10 to-transparent" />

              {/* Chat bubbles */}
              <div className="px-4 py-4 space-y-2 bg-white">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-neutral-100 rounded-sm rounded-tl-sm px-3 py-2 max-w-[90%]"
                >
                  <p className="text-sm text-neutral-800 leading-snug">
                    👋 Olá! Sou a Wian, Suporte Inteligente da Wiize.
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-neutral-100 rounded-sm rounded-tl-sm px-3 py-2 max-w-[90%]"
                >
                  <p className="text-sm text-neutral-800 leading-snug">
                    Posso responder suas dúvidas sobre planos, funcionalidades e integrações.
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.0 }}
                  className="bg-neutral-100 rounded-sm rounded-tl-sm px-3 py-2 max-w-[90%]"
                >
                  <p className="text-sm text-neutral-800 leading-snug">
                    Como posso ajudar você? 😊
                  </p>
                </motion.div>
              </div>

              {/* CTA */}
              <div className="px-4 pb-4 pt-1">
                <span className="flex items-center justify-center gap-2 w-full py-2.5 rounded-hover bg-primary text-primary-foreground font-medium text-sm shadow-sm">
                  <MessageCircle size={16} />
                  Iniciar conversa
                </span>
              </div>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <Link
        to="/contato"
        aria-label="Falar com a Wiize"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform"
      >
        <MessageCircle size={24} />
      </Link>
    </>
  );
};
