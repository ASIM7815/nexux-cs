'use client';

import React from 'react';
import { motion } from 'framer-motion';
import styles from '@/styles/CTAButton.module.css';

export default function CTAButton() {
  return (
    <motion.a
      href="/participantauth"
      className={styles.ctaButton}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 17,
      }}
    >
      <span className={styles.buttonText}>GO TO ARENA</span>
      <span className={styles.buttonIcon}>→</span>
      
      {/* Animated border effect */}
      <motion.span
        className={styles.borderTop}
        initial={{ scaleX: 0 }}
        whileHover={{ scaleX: 1 }}
        transition={{ duration: 0.3 }}
      />
      <motion.span
        className={styles.borderRight}
        initial={{ scaleY: 0 }}
        whileHover={{ scaleY: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      />
      <motion.span
        className={styles.borderBottom}
        initial={{ scaleX: 0 }}
        whileHover={{ scaleX: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      />
      <motion.span
        className={styles.borderLeft}
        initial={{ scaleY: 0 }}
        whileHover={{ scaleY: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      />
    </motion.a>
  );
}
