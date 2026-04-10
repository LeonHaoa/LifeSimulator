"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { useLocale } from "@/lib/i18n/client-locale";

export function WelcomeScreen() {
  const { messages } = useLocale();

  return (
    <div className="welcome-root">
      <motion.div
        className="welcome-frame"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <Image
          src="/welcome-hero.png"
          alt={messages.welcome.heroAlt}
          fill
          priority
          sizes="(max-width: 1200px) 100vw, 1200px"
          className="object-cover"
        />
        <div className="welcome-cta">
          <LocaleSwitcher />
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            <Link href="/life" className="welcome-btn">
              {messages.welcome.start}
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
