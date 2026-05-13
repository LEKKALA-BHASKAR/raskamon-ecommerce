import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SplashScreen = ({ visible }) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0f2620]"
        >
          {/* Background subtle pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }} />

          {/* Glow behind logo */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.3 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute w-64 h-64 rounded-full blur-3xl bg-[var(--sattva-gold)]"
          />

          <div className="relative flex flex-col items-center">
            {/* Logo container with animations */}
            <motion.div
              initial={{ scale: 0.3, opacity: 0, rotateY: -90 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              {/* Ring animation */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.2, opacity: [0, 0.5, 0] }}
                transition={{ duration: 1.5, delay: 0.3, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full border-2 border-[var(--sattva-gold)]"
                style={{ margin: '-20px' }}
              />

              <motion.img
                src="/LOGO-1.jpeg"
                alt="Dr MediScie"
                className="w-28 h-28 object-contain rounded-2xl shadow-2xl"
                initial={{ filter: 'brightness(0)' }}
                animate={{ filter: 'brightness(1)' }}
                transition={{ duration: 0.6, delay: 0.3 }}
              />
            </motion.div>

            {/* Brand name */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-6 font-heading text-2xl font-bold text-white tracking-wide"
            >
              Dr MediScie
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="mt-2 text-white/60 text-xs tracking-[0.3em] uppercase font-medium"
            >
              Ayurvedic Wellness
            </motion.p>

            {/* Loading bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 w-32 h-[2px] rounded-full bg-white/10 overflow-hidden"
            >
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1, delay: 0.6, ease: 'easeInOut', repeat: 1 }}
                className="h-full w-1/2 rounded-full bg-gradient-to-r from-transparent via-[var(--sattva-gold)] to-transparent"
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
