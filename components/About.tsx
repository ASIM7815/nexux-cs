'use client';

import React from 'react';
import { motion } from 'framer-motion';
import styles from '@/styles/About.module.css';

export default function About() {
  return (
    <section className={styles.aboutSection} id="about">
      <div className={styles.container}>
        <motion.div
          className={styles.content}
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className={styles.headerWrapper}>
            <motion.h2
              className={styles.heading}
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              WHAT IS CAPTURE THE FLAG?
            </motion.h2>
            <div className={styles.glowLine}></div>
          </div>

          <motion.div
            className={styles.textContent}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <p className={styles.paragraph}>
              <span className={styles.highlight}>Capture the Flag (CTF)</span> is an intense 
              cybersecurity competition where hackers, developers, and security enthusiasts 
              battle against time and challenges to find hidden "flags" within vulnerable systems.
            </p>

            <p className={styles.paragraph}>
              <span className={styles.accentText}>NEXUS CYPHER</span> brings you a premium 
              CTF experience designed to test your skills in real-world security scenarios. 
              Whether you're breaking encryption, exploiting web vulnerabilities, or analyzing 
              digital forensics, every challenge pushes your limits.
            </p>

            <div className={styles.featuresGrid}>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>⚡</span>
                <span className={styles.featureText}>Real-time scoring</span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>🏆</span>
                <span className={styles.featureText}>Competitive rankings</span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>🎯</span>
                <span className={styles.featureText}>Multiple difficulty levels</span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>💡</span>
                <span className={styles.featureText}>Learn by hacking</span>
              </div>
            </div>
          </motion.div>

          {/* Decorative quote */}
          <motion.div
            className={styles.quote}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <span className={styles.quoteText}>
              "Every system has a weakness. Find it. Exploit it. Capture the flag."
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
