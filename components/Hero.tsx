'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import styles from '@/styles/Hero.module.css';
import CTAButton from './CTAButton';

export default function Hero() {
  return (
    <section className={styles.heroSection}>
      <div className={styles.heroContent}>
        {/* Animated Logo */}
        <motion.div
          className={styles.logoContainer}
          initial={{ opacity: 0, scale: 0.8, y: -50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            duration: 1,
            ease: [0.6, -0.05, 0.01, 0.99],
          }}
        >
          <Image
            src="/nexus-cipher-logo.png"
            alt="Nexus Cipher - Capture the Flag"
            width={1400}
            height={300}
            priority
            className={styles.logo}
          />
        </motion.div>

        {/* Tagline */}
        <motion.p
          className={styles.tagline}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.8,
            delay: 0.5,
            ease: 'easeOut',
          }}
        >
          <span className={styles.bracket}>[</span>
          {' '}Identify vulnerabilities, find the flaws, compete for highest score...{' '}
          <span className={styles.bracket}>]</span>
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.8,
            delay: 0.8,
            ease: 'easeOut',
          }}
        >
          <CTAButton />
        </motion.div>

        {/* Decorative Elements */}
        <div className={styles.decorativeLines}>
          <motion.div
            className={styles.lineLeft}
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{
              duration: 1.5,
              delay: 1.2,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className={styles.lineRight}
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{
              duration: 1.5,
              delay: 1.2,
              ease: 'easeInOut',
            }}
          />
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className={styles.scrollIndicator}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 1,
          delay: 2,
        }}
      >
        <motion.div
          className={styles.scrollArrow}
          animate={{ y: [0, 10, 0] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          ↓
        </motion.div>
        <span className={styles.scrollText}>Scroll to explore</span>
      </motion.div>
    </section>
  );
}
