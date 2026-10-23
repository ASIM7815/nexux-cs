'use client';

import React from 'react';
import { motion } from 'framer-motion';
import styles from '@/styles/Categories.module.css';

export default function Categories() {
  const categories = [
    {
      id: 'web',
      title: 'WEB EXPLOITATION',
      icon: (
        <svg viewBox="0 0 100 100" className={styles.svgIcon}>
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
          <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4" />
          <line x1="50" y1="10" x2="50" y2="25" stroke="currentColor" strokeWidth="2" />
          <line x1="50" y1="75" x2="50" y2="90" stroke="currentColor" strokeWidth="2" />
          <line x1="10" y1="50" x2="25" y2="50" stroke="currentColor" strokeWidth="2" />
          <line x1="75" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
      description: 'Break through web applications, find SQL injections, XSS vulnerabilities, and exploit authentication flaws.',
      color: 'primary',
    },
    {
      id: 'crypto',
      title: 'CRYPTOGRAPHY',
      icon: (
        <svg viewBox="0 0 100 100" className={styles.svgIcon}>
          <rect x="30" y="40" width="40" height="45" rx="4" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M35 40 V30 Q35 20 45 20 L55 20 Q65 20 65 30 V40" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="50" cy="60" r="6" fill="currentColor" />
          <line x1="50" y1="66" x2="50" y2="75" stroke="currentColor" strokeWidth="3" />
        </svg>
      ),
      description: 'Crack encryption algorithms, decode ciphers, break cryptographic protocols, and uncover hidden messages.',
      color: 'secondary',
    },
    {
      id: 'forensics',
      title: 'FORENSICS',
      icon: (
        <svg viewBox="0 0 100 100" className={styles.svgIcon}>
          <circle cx="50" cy="45" r="25" fill="none" stroke="currentColor" strokeWidth="3" />
          <line x1="68" y1="63" x2="85" y2="80" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M40 40 Q45 45 50 40 Q55 35 60 40" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M40 50 L45 55 L55 45 L60 50" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
      description: 'Analyze memory dumps, investigate disk images, recover deleted files, and uncover digital evidence.',
      color: 'accent',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.25,
        delayChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 60, rotateX: -15 },
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 80,
        damping: 15,
      },
    },
  };

  return (
    <section className={styles.categoriesSection} id="categories">
      <div className={styles.container}>
        <motion.div
          className={styles.sectionHeader}
          initial={{ opacity: 0, y: -30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className={styles.sectionTitle}>COMPETITION TRACKS</h2>
          <p className={styles.sectionSubtitle}>Master the art of hacking across three disciplines</p>
          <div className={styles.titleUnderline}></div>
        </motion.div>

        <motion.div
          className={styles.cardsGrid}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {categories.map((category) => (
            <motion.div
              key={category.id}
              className={`${styles.categoryCard} ${styles[category.color]}`}
              variants={cardVariants}
              whileHover={{
                y: -15,
                scale: 1.02,
                transition: { type: 'spring', stiffness: 300, damping: 20 },
              }}
            >
              <div className={styles.cardInner}>
                {/* Icon */}
                <motion.div
                  className={styles.iconWrapper}
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.8, ease: 'easeInOut' }}
                >
                  {category.icon}
                </motion.div>

                {/* Title */}
                <h3 className={styles.categoryTitle}>{category.title}</h3>

                {/* Description */}
                <p className={styles.categoryDescription}>{category.description}</p>

                {/* Decorative elements */}
                <div className={styles.cardCorners}>
                  <span className={styles.corner1}></span>
                  <span className={styles.corner2}></span>
                  <span className={styles.corner3}></span>
                  <span className={styles.corner4}></span>
                </div>

                {/* Hover glow effect */}
                <div className={styles.hoverGlow}></div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
