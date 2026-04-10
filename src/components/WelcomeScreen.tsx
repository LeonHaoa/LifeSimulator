"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GameAmbientBg } from "@/components/GameAmbientBg";

/**
 * Plain <img> avoids next/image dev-bundler chunk edges that can trigger
 * "__webpack_modules__[moduleId] is not a function" on hard refresh in some setups.
 */
export function WelcomeScreen() {
  return (
    <div className="welcome-root">
      <GameAmbientBg variant="welcome" />
      <motion.div
        className="welcome-frame"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- avoid next/image dev chunk bugs on hard refresh */}
        <img
          src="/welcome-hero.png"
          alt="Life Simulator 欢迎页"
          className="object-cover"
          width={1920}
          height={1080}
          decoding="async"
          fetchPriority="high"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        />
        <div className="welcome-cta">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            <Link href="/life" className="welcome-btn">
              开局
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
