'use client';

import React from 'react';
import { motion } from 'framer-motion';
import styles from '@/styles/Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <motion.div
          className={styles.content}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
        >
          {/* Main branding section */}
          <div className={styles.brandingSection}>
            <motion.div
              className={styles.organizer}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h3 className={styles.organizerName}>ISL ENGINEERING COLLEGE</h3>
              <div className={styles.divider}></div>
              <p className={styles.presentsText}>
                <span className={styles.nexusVyoma}>NEXUS VYOMA</span>
                <span className={styles.presents}>PRESENTS</span>
              </p>
            </motion.div>

            {/* Event title */}
            <motion.div
              className={styles.eventTitle}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <span className={styles.nexusText}>NEXUS</span>
              <span className={styles.cipherText}>CIPHER</span>
            </motion.div>
          </div>

          {/* Decorative line */}
          <motion.div
            className={styles.decorativeLine}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.6 }}
          />

          {/* Bottom section */}
          <div className={styles.bottomSection}>
            <motion.p
              className={styles.copyright}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              © 2026 NEXUS CYPHER CTF. All rights reserved.
            </motion.p>

            <motion.p
              className={styles.tagline}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 1 }}
            >
              Hack. Learn. Conquer.
            </motion.p>
          </div>

          {/* Background decorative elements */}
          <div className={styles.bgDecoration}>
            <span className={styles.bgDot}></span>
            <span className={styles.bgDot}></span>
            <span className={styles.bgDot}></span>
            <span className={styles.bgDot}></span>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
