import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import styles from './home.module.css';
import GalleryClient from './GalleryClient';
import GiftGrid from './GiftGrid';
import ScrollReveal from '@/components/ScrollReveal';
import WeddingCountdown from '@/components/WeddingCountdown';

export const revalidate = 0;

export default async function Home() {
  const gifts = await prisma.gift.findMany({
    orderBy: { createdAt: 'desc' },
  });

  let settings = await prisma.settings.findFirst();
  if (!settings) {
    settings = await prisma.settings.create({ data: {} });
  }

  let galleryArray: string[] = [];
  try {
    if (settings.galleryImages) {
      let parsed = JSON.parse(settings.galleryImages);
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      if (Array.isArray(parsed)) {
        galleryArray = parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse gallery array', e);
  }

  const visibleGifts = gifts.filter(g => g.isVisible);

  return (
    <main>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        {settings.coverPhotoUrl && (
          <>
            <img src={settings.coverPhotoUrl} alt="Portada" className={styles.heroBackground} />
            <div className={styles.heroOverlay} />
          </>
        )}
        <div className={styles.heroContent}>
          {settings.avatarPhotoUrl && (
            <div className={styles.avatarContainer}>
              <img src={settings.avatarPhotoUrl} alt="Novios" className={styles.avatarImage} />
            </div>
          )}
          <h1 className={styles.heroTitle}>{settings.coupleNames}</h1>
          <div className={styles.heroDivider} />
          <p className={styles.heroSubtitle}>
            Nuestra mayor alegría es compartir este día con ustedes.
            Si desean tenernos un detalle, hemos preparado esta lista con mucho amor.
          </p>
        </div>
        <div className={styles.scrollDown}>
          <svg viewBox="0 0 24 24">
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
          </svg>
        </div>
      </section>

      {/* ── Countdown ── */}
      <WeddingCountdown weddingDate={settings.weddingDate || ''} coupleNames={settings.coupleNames} />

      <div className="container">

        {/* ── Gallery ── */}
        {galleryArray.length > 0 && (
          <ScrollReveal>
            <section className={styles.gallerySection}>
              <h2 className={styles.sectionTitle}>Nuestra Historia</h2>
              <p className={styles.sectionSubtitle}>Momentos que atesoran nuestra historia juntos</p>
              <GalleryClient images={galleryArray} />
            </section>
          </ScrollReveal>
        )}

        {/* ── How it works ── */}
        <ScrollReveal delay={100}>
          <section className={styles.instructionsSection}>
            <h2 className={styles.sectionTitle}>¿Cómo funciona?</h2>
            <p className={styles.sectionSubtitle}>Tres simples pasos para hacernos llegar tu regalo</p>
            <div className={styles.stepsGrid}>
              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>1</div>
                <h3>Elige un Regalo</h3>
                <p>Explora nuestra lista y selecciona el detalle que más te guste. Dale clic al botón "Regalar".</p>
              </div>
              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>2</div>
                <h3>Transfiere el Monto</h3>
                <p>Realiza una transferencia bancaria a la cuenta indicada por el monto del regalo elegido.</p>
              </div>
              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>3</div>
                <h3>Confirma tu Regalo</h3>
                <p>Ingresa tu nombre y el número de comprobante para que podamos agradecerte personalmente.</p>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* ── Gift List ── */}
        <section id="regalos" className={styles.giftsSection}>
          <ScrollReveal delay={50}>
            <h2 className={styles.sectionTitle}>Lista de Regalos</h2>
            <p className={styles.sectionSubtitle}>
              Cada detalle, por pequeño que sea, llena nuestro corazón de gratitud
            </p>
          </ScrollReveal>
          <GiftGrid gifts={visibleGifts} />
        </section>

        {/* ── Thanks ── */}
        <ScrollReveal delay={100}>
          <section className={styles.thanksSection}>
            <div className={styles.thanksCard}>
              <div className={styles.thanksHeart}>♥</div>
              <h2 className={styles.thanksTitle}>¡Gracias de Corazón!</h2>
              <p className={styles.thanksText}>
                Su presencia y cariño son el regalo más grande que podemos recibir.
                Cada detalle que nos brindan nos ayuda a construir el hogar y los sueños
                que hemos soñado juntos. Los queremos mucho.
              </p>
              <p className={styles.thanksSignature}>{settings.coupleNames}</p>
            </div>
          </section>
        </ScrollReveal>

      </div>
    </main>
  );
}
