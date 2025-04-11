"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { MobileNav } from "./mobile-nav";
import { Badge } from "./ui/badge";
import { Globe, Menu } from "lucide-react";
import { motion } from "framer-motion";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslations } from "@/components/translations-context";

export function Header() {
  const { t } = useTranslations();
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm"
    >
      <div className="p-4 h-16 sm:h-20 flex items-center justify-between gap-2">
        <MobileNav />
        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center"
        >
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-10 w-[160px] sm:h-12 sm:w-[200px]">
              <Image
                src="/sully-logo.avif"
                alt="Sully.ai Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>
        </motion.nav>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-3 items-center justify-end"
        >
          <LanguageSwitcher />
          <ThemeSwitcher />
          <Button
            variant="outline"
            size="sm"
            asChild
            className="hidden md:flex"
          >
            <Link href="/history">
              <Globe className="mr-2 h-4 w-4" />
              History
            </Link>
          </Button>
        </motion.div>
      </div>
    </motion.header>
  );
}
