'use client';

import { useState, useEffect } from 'react';
import styles from '../app/home.module.css';

interface Props {
  weddingDate: string; // ISO e.g. "2025-11-15T18:00:00"
  coupleNames: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

function calculate(target: string): TimeLeft {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / 1000 / 60) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    isPast: false,
  };
}

export default function WeddingCountdown({ weddingDate, coupleNames }: Props) {
  const [time, setTime] = useState<TimeLeft>(calculate(weddingDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(calculate(weddingDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [weddingDate]);

  if (time.isPast) {
    return (
      <section className={styles.countdownSection}>
        <p className={styles.countdownPast}>¡El gran día ha llegado! 🎊</p>
      </section>
    );
  }

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <section className={styles.countdownSection}>
      <p className={styles.countdownLabel}>Faltan para nuestra boda</p>
      <div className={styles.countdownGrid}>
        <div className={styles.countdownUnit}>
          <span className={styles.countdownNumber}>{time.days}</span>
          <span className={styles.countdownCaption}>Días</span>
        </div>
        <span className={styles.countdownSep}>:</span>
        <div className={styles.countdownUnit}>
          <span className={styles.countdownNumber}>{pad(time.hours)}</span>
          <span className={styles.countdownCaption}>Horas</span>
        </div>
        <span className={styles.countdownSep}>:</span>
        <div className={styles.countdownUnit}>
          <span className={styles.countdownNumber}>{pad(time.minutes)}</span>
          <span className={styles.countdownCaption}>Min</span>
        </div>
        <span className={styles.countdownSep}>:</span>
        <div className={styles.countdownUnit}>
          <span className={styles.countdownNumber}>{pad(time.seconds)}</span>
          <span className={styles.countdownCaption}>Seg</span>
        </div>
      </div>
    </section>
  );
}
