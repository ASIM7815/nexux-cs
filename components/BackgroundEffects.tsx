'use client';

import React, { useState, useEffect } from 'react';
import styles from '@/styles/BackgroundEffects.module.css';

export default function BackgroundEffects() {
  // Japanese cyberpunk text for side decorations
  const japaneseText = ['ハッキング', 'サイバー', 'セキュリティ', 'コード', 'ネオン', '未来', 'デジタル'];
  
  // Generate random values on client side only
  const [buildingHeights, setBuildingHeights] = useState<number[]>([]);
  const [rainDrops, setRainDrops] = useState<Array<{left: number; duration: number; delay: number; opacity: number}>>([]);
  const [particles, setParticles] = useState<Array<{left: number; top: number; duration: number; delay: number}>>([]);
  
  useEffect(() => {
    // Generate random values only on client side
    setBuildingHeights(Array.from({ length: 20 }, () => Math.random() * 60 + 20));
    
    setRainDrops(Array.from({ length: 50 }, () => ({
      left: Math.random() * 100,
      duration: Math.random() * 0.5 + 0.5,
      delay: Math.random() * 2,
      opacity: Math.random() * 0.3 + 0.1
    })));
    
    setParticles(Array.from({ length: 30 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 5
    })));
  }, []);
  
  return (
    <div className={styles.backgroundContainer}>
      {/* Cyberpunk cityscape sky */}
      <div className={styles.cityScapeSky}></div>
      
      {/* Neon buildings layer */}
      <div className={styles.buildingsLayer}>
        <div className={styles.buildingRow}>
          {buildingHeights.map((height, i) => (
            <div key={i} className={styles.building} style={{ 
              height: `${height}%`,
              animationDelay: `${i * 0.3}s`
            }}></div>
          ))}
        </div>
      </div>
      
      {/* Glowing windows on buildings */}
      <div className={styles.windowsOverlay}></div>
      
      {/* Japanese text decorations - Left side */}
      <div className={styles.japaneseTextLeft}>
        {japaneseText.map((text, i) => (
          <div key={i} className={styles.japaneseChar} style={{
            animationDelay: `${i * 0.5}s`
          }}>
            {text}
          </div>
        ))}
      </div>
      
      {/* Japanese text decorations - Right side */}
      <div className={styles.japaneseTextRight}>
        {japaneseText.reverse().map((text, i) => (
          <div key={i} className={styles.japaneseChar} style={{
            animationDelay: `${i * 0.5}s`
          }}>
            {text}
          </div>
        ))}
      </div>
      
      {/* Main gradient background layers */}
      <div className={styles.gradientLayer1}></div>
      <div className={styles.gradientLayer2}></div>
      <div className={styles.gradientLayer3}></div>
      
      {/* Animated grid pattern - cyber floor */}
      <div className={styles.gridPattern}></div>
      
      {/* Rain effect */}
      <div className={styles.rainContainer}>
        {rainDrops.map((drop, i) => (
          <div 
            key={i} 
            className={styles.rainDrop}
            style={{
              left: `${drop.left}%`,
              animationDuration: `${drop.duration}s`,
              animationDelay: `${drop.delay}s`,
              opacity: drop.opacity
            }}
          ></div>
        ))}
      </div>
      
      {/* Floating particles/dust */}
      <div className={styles.particlesContainer}>
        {particles.map((particle, i) => (
          <div 
            key={i} 
            className={styles.particle}
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`
            }}
          ></div>
        ))}
      </div>
      
      {/* Vignette overlay */}
      <div className={styles.vignette}></div>
      
      {/* Noise texture */}
      <div className={styles.noiseTexture}></div>
      
      {/* Reflective wet street effect */}
      <div className={styles.wetStreet}></div>
    </div>
  );
}
