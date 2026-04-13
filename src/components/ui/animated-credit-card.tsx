import * as React from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"
import { Wifi } from "lucide-react"
import logoIconNew from "@/assets/logo-icon-new.png"

interface AnimatedCreditCardProps {
  cardNumber: string
  cardHolder: string
  expiryDate: string
  isFlipped: boolean
}

export default function AnimatedCreditCard({
  cardNumber,
  cardHolder,
  expiryDate,
  isFlipped,
}: AnimatedCreditCardProps) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useSpring(0, { stiffness: 80, damping: 20 })
  const rotateY = useSpring(0, { stiffness: 80, damping: 20 })

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      const x = (e.clientX - centerX) / centerX
      const y = (e.clientY - centerY) / centerY
      rotateY.set(x * 12)
      rotateX.set(-y * 8)
    }
    const handleMouseLeave = () => {
      rotateX.set(0)
      rotateY.set(0)
    }
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseleave", handleMouseLeave)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [rotateX, rotateY])

  const formatDisplay = (num: string) => {
    const clean = num.replace(/\s/g, "")
    const padded = clean.padEnd(16, "•")
    return `${padded.slice(0, 4)} ${padded.slice(4, 8)} ${padded.slice(8, 12)} ${padded.slice(12, 16)}`
  }

  return (
    <div className="w-full flex justify-center" style={{ perspective: 1000 }}>
      <motion.div
        className="relative w-full max-w-[380px] aspect-[1.586/1] cursor-pointer select-none"
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      >
        <motion.div
          className="w-full h-full"
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 shadow-2xl shadow-emerald-500/20"
            style={{ backfaceVisibility: "hidden" }}
          >
            {/* Shimmer */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            />

            <div className="relative z-10 flex flex-col justify-between h-full p-5 sm:p-6">
              {/* Top — Wiize logo */}
              <div className="flex items-center justify-between">
                <img src={logoIconNew} alt="Wiize" className="h-7 w-7 object-contain rounded opacity-40" />
                <span className="text-white/50 text-xs font-medium tracking-widest">CRÉDITO</span>
              </div>

              {/* Middle — Chip + Contactless */}
              <div className="flex items-center gap-2">
                <div className="w-10 h-7 rounded bg-amber-300/80 shadow-inner" />
                <Wifi className="h-5 w-5 text-white/60 rotate-90" />
              </div>

              {/* Number */}
              <div className="mb-3">
                <p className="text-white text-lg sm:text-xl font-mono tracking-[0.2em] drop-shadow">
                  {formatDisplay(cardNumber)}
                </p>
              </div>

              {/* Bottom */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-white/50 text-[9px] uppercase tracking-wider mb-0.5">Titular</p>
                  <p className="text-white text-sm font-semibold tracking-wide truncate max-w-[200px]">
                    {cardHolder || "SEU NOME AQUI"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/50 text-[9px] uppercase tracking-wider mb-0.5">Validade</p>
                  <p className="text-white text-sm font-semibold">
                    {expiryDate || "••/••"}
                  </p>
                </div>
                <span className="text-white text-xl font-bold italic tracking-wider">VISA</span>
              </div>
            </div>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950 shadow-2xl"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className="w-full h-12 bg-black/70 mt-6" />
            <div className="px-6 mt-5">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-9 bg-white/20 rounded" />
                <div className="bg-white rounded px-3 py-1.5 min-w-[56px] text-center">
                  <p className="text-gray-900 font-mono font-bold tracking-widest text-sm">•••</p>
                </div>
              </div>
            </div>
            <div className="px-6 mt-6 space-y-1">
              <p className="text-white/40 text-[9px]">Este cartão é propriedade do banco emissor</p>
              <p className="text-white/40 text-[9px]">Atendimento: 0800-VISA</p>
            </div>
          </div>
        </motion.div>

        {/* Subtle floating orbs */}
        <motion.div
          className="absolute -top-3 -right-3 w-12 h-12 rounded-full bg-emerald-400/10 blur-xl pointer-events-none"
          animate={{ y: [0, -8, 0], x: [0, 5, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-2 -left-2 w-14 h-14 rounded-full bg-emerald-300/5 blur-xl pointer-events-none"
          animate={{ y: [0, 6, 0], x: [0, -4, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
      </motion.div>
    </div>
  )
}
