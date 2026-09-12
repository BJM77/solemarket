'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Leaf } from "lucide-react";
import { useEffect, useState } from "react";

export default function Hero({ productCount, error }: { productCount: number | null, error: string | null }) {
  const count = productCount ?? 0;
  const [co2Saved, setCo2Saved] = useState(0);

  // Animate CO2 counter
  useEffect(() => {
    const target = count * 14; // 14kg per sneaker
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCo2Saved(target);
        clearInterval(timer);
      } else {
        setCo2Saved(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [count]);

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-900">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="container-wide relative z-10 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 mb-6"
            >
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-semibold">Australia's Sneaker Marketplace</span>
            </motion.div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-6">
              Buy & Sell{" "}
              <span className="gradient-text">Authentic Sneakers</span>
            </h1>

            {/* Description */}
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0">
              Benched is Australia's trusted sneaker marketplace with over{" "}
              <span className="font-bold text-foreground">{count.toLocaleString()}</span> kicks to discover.{" "}
              <span className="text-green-600 dark:text-green-400 font-semibold">
                Every second-hand purchase saves ~14kg CO₂
              </span>{" "}
              and thousands of liters of water.
            </p>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 mb-10 max-w-xl mx-auto lg:mx-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="glass-card p-4 rounded-xl text-center"
              >
                <div className="text-2xl sm:text-3xl font-bold gradient-text">{count.toLocaleString()}</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">Sneakers Listed</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="glass-card p-4 rounded-xl text-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800"
              >
                <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400">
                  <Leaf className="h-4 w-4" />
                  <span className="text-2xl sm:text-3xl font-bold">{co2Saved.toLocaleString()}</span>
                </div>
                <div className="text-xs sm:text-sm text-green-700 dark:text-green-300 mt-1">kg CO₂ Saved</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="glass-card p-4 rounded-xl text-center"
              >
                <div className="flex items-center justify-center gap-1">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-2xl sm:text-3xl font-bold text-primary">100%</span>
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">Verified</div>
              </motion.div>
            </div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Button asChild size="lg" className="btn-premium text-lg px-8 py-6 rounded-xl">
                <Link href="/browse">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Start Exploring
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 rounded-xl border-2 hover-lift">
                <Link href="/consign">Sell Your Kicks</Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Right Column - Hero Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative hidden lg:block"
          >
            <div className="relative float">
              {/* Placeholder for sneaker image - you can replace with actual image */}
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur-sm border-2 border-primary/20 flex items-center justify-center">
                <div className="text-6xl opacity-50">👟</div>
              </div>

              {/* Floating badges */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 }}
                className="absolute top-10 -left-6 glass-card px-4 py-2 rounded-xl"
              >
                <div className="text-xs text-muted-foreground">Trending</div>
                <div className="text-sm font-bold">Jordan 1s</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2 }}
                className="absolute bottom-10 -right-6 glass-card px-4 py-2 rounded-xl bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
              >
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <Leaf className="h-4 w-4" />
                  <span className="text-sm font-bold">Eco-Friendly</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
          <path d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z" fill="currentColor" className="text-background" />
        </svg>
      </div>
    </section>
  );
}
