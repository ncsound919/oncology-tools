"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";

export default function ScrollUx() {
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
      setProgress(pct);
      setShowTop(scrollTop > 800);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* top progress bar */}
      <div className="fixed left-0 top-0 z-[60] h-0.5 w-full pointer-events-none">
        <div
          className="h-full transition-[width] duration-75 ease-out"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #4FD1C0 0%, #9E8CF2 50%, #E8664F 100%)",
            boxShadow: "0 0 8px rgba(79,209,192,0.5)",
          }}
        />
      </div>

      {/* back to top */}
      <AnimatePresence>
        {showTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-[#262D34] bg-[#0D1013]/90 backdrop-blur-md text-[#4FD1C0] shadow-xl transition-all hover:border-[#4FD1C0]/60 hover:bg-[#161B20] hover:shadow-[0_0_20px_rgba(79,209,192,0.3)]"
            aria-label="Back to top"
          >
            <ArrowUp className="h-4.5 w-4.5" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
