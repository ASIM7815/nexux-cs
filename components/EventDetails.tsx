'use client';

import React from 'react';
import { motion } from 'framer-motion';
import styles from '@/styles/EventDetails.module.css';

export default function EventDetails() {
  const eventData = [
    {
      id: 'date',
      icon: '📅',
      label: 'DATE',
      value: '12 NOV',
    },
    {
      id: 'time',
      icon: '⏰',
      label: 'TIME',
      value: '10 - 3',
    },
    {
      id: 'venue',
      icon: '📍',
      label: 'VENUE',
      value: 'SEMINAR HALL',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 15,
      },
    },
  };

  return (
    <section className={styles.eventSection} id="event-details">
      <motion.div
        className={styles.sectionHeader}
        initial={{ opacity: 0, y: -30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className={styles.sectionTitle}>EVENT DETAILS</h2>
        <div className={styles.titleUnderline}></div>
      </motion.div>

      <motion.div
        className={styles.cardsContainer}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        {eventData.map((item) => (
          <motion.div
            key={item.id}
            className={styles.card}
            variants={cardVariants}
            whileHover={{ 
              y: -10,
              transition: { type: 'spring', stiffness: 300 }
            }}
          >
            <div className={styles.cardCorners}>
              <span className={styles.cornerTL}></span>
              <span className={styles.cornerTR}></span>
              <span className={styles.cornerBL}></span>
              <span className={styles.cornerBR}></span>
            </div>
            
            <div className={styles.cardIcon}>{item.icon}</div>
            <div className={styles.cardLabel}>{item.label}</div>
            <div className={styles.cardValue}>{item.value}</div>
            
            <div className={styles.cardGlow}></div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
