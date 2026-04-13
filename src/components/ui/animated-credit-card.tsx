import * as React from "react"
import { motion, useMotionValue, useTransform } from "framer-motion"
import { Wifi } from "lucide-react"

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
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [-100, 100], [10, -10])
  const rotateY = useTransform(x, [-100, 100], [-10, 10])

  const handleMouseMove = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    x.set(event.clientX - centerX)
    y.set(event.clientY - centerY)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

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
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <motion.div
          className="w-full h-full"
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 shadow-2xl shadow-emerald-500/30"
            style={{ backfaceVisibility: "hidden" }}
          >
            {/* Shimmer */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            />

            <div className="relative z-10 flex flex-col justify-between h-full p-5 sm:p-6">
              {/* Top */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-7 rounded bg-amber-300/80 shadow-inner" />
                  <Wifi className="h-5 w-5 text-white/60 rotate-90" />
                </div>
                <span className="text-white/60 text-xs font-medium tracking-widest">CREDIT</span>
              </div>

              {/* Number */}
              <div className="mt-auto mb-4">
                <p className="text-white text-lg sm:text-xl font-mono tracking-[0.2em] drop-shadow">
                  {formatDisplay(cardNumber)}
                </p>
              </div>

              {/* Bottom */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-white/50 text-[9px] uppercase tracking-wider mb-0.5">Card Holder</p>
                  <p className="text-white text-sm font-semibold tracking-wide truncate max-w-[200px]">
                    {cardHolder || "SEU NOME AQUI"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/50 text-[9px] uppercase tracking-wider mb-0.5">Expires</p>
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
            {/* Magnetic strip */}
            <div className="w-full h-12 bg-black/70 mt-6" />

            {/* Signature + CVV */}
            <div className="px-6 mt-5">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-9 bg-white/20 rounded" />
                <div className="bg-white rounded px-3 py-1.5 min-w-[56px] text-center">
                  <p className="text-gray-900 font-mono font-bold tracking-widest text-sm">•••</p>
                </div>
              </div>
            </div>

            <div className="px-6 mt-6 space-y-1">
              <p className="text-white/40 text-[9px]">This card is property of issuing bank</p>
              <p className="text-white/40 text-[9px]">Customer Service: 1-800-VISA</p>
            </div>
          </div>
        </motion.div>

        {/* Floating orbs */}
        <motion.div
          className="absolute -top-3 -right-3 w-16 h-16 rounded-full bg-emerald-400/15 blur-xl"
          animate={{ y: [0, -8, 0], x: [0, 5, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-3 -left-3 w-20 h-20 rounded-full bg-emerald-300/10 blur-xl"
          animate={{ y: [0, 6, 0], x: [0, -4, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
      </motion.div>
    </div>
  )
}
