import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import styles from './home.module.css';
import GalleryClient from './GalleryClient';
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(price);
  };

  return (
    <main>
      <section className={styles.hero}>
        {settings.coverPhotoUrl && (
          <>
            <img src={settings.coverPhotoUrl} alt="Portada" className={styles.heroBackground} />
            <div className={styles.heroOverlay}></div>
          </>
        )}
        <div className={styles.heroContent}>
          {settings.avatarPhotoUrl && (
            <div className={styles.avatarContainer}>
              <img src={settings.avatarPhotoUrl} alt="Novios" className={styles.avatarImage} />
            </div>
          )}
          <h1 className={styles.heroTitle}>{settings.coupleNames}</h1>
          <p className={styles.heroSubtitle}>
            Nuestra mayor alegría es compartir este día con ustedes.
            Si desean tener un detalle adicional, hemos preparado esta lista con mucho amor.
          </p>
        </div>
        
        <div className={styles.scrollDown}>
          <svg viewBox="0 0 24 24">
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
          </svg>
        </div>
      </section>

      <WeddingCountdown weddingDate={settings.weddingDate || ''} coupleNames={settings.coupleNames} />

      <div className="container">
        
        {/* Gallery Section */}
        {galleryArray.length > 0 && (
          <ScrollReveal>
            <section>
              <h2 className={styles.sectionTitle}>Nuestra Historia</h2>
              <GalleryClient images={galleryArray} />
            </section>
          </ScrollReveal>
        )}

        <ScrollReveal delay={100}>
          <section className={styles.instructionsSection}>
            <h2 className={styles.sectionTitle}>¿Cómo funciona?</h2>
            <div className={styles.stepsGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>1</div>
              <h3>Elige un Regalo</h3>
              <p>Explora nuestra lista de regalos a continuación y selecciona el detalle que más te guste dándole clic a "Regalar".</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>2</div>
              <h3>Transfiere el Monto</h3>
              <p>Realiza una transferencia bancaria a la cuenta de los novios por el valor del regalo seleccionado.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>3</div>
              <h3>Confirma tu Regalo</h3>
              <p>Ingresa tu nombre y el número de comprobante de transferencia en la plataforma para que podamos agradecerte.</p>
            </div>
          </div>
        </section>
        </ScrollReveal>

        <section id="regalos">
          <ScrollReveal delay={50}>
            <h2 className={styles.sectionTitle}>Lista de Regalos</h2>
          </ScrollReveal>
          <div className={styles.grid}>
            {gifts.map((gift) => {
              const isAvailable = gift.status === 'AVAILABLE';
              const statusClass = gift.status === 'AVAILABLE' 
                ? styles.statusAvailable 
                : gift.status === 'PENDING_CONFIRMATION' 
                  ? styles.statusPending 
                  : styles.statusGifted;
                  
              const statusText = gift.status === 'AVAILABLE' 
                ? 'Disponible' 
                : gift.status === 'PENDING_CONFIRMATION' 
                  ? 'Reservado' 
                  : 'Regalado';

              return (
                <ScrollReveal key={gift.id} delay={gifts.indexOf(gift) * 60}>
                  <div className={`${styles.card} ${!isAvailable ? styles.cardGifted : ''}`}>
                  <div className={styles.cardImageContainer}>
                    <div className={`${styles.statusBadge} ${statusClass}`}>
                      {statusText}
                    </div>
                    {gift.image_url ? (
                      <img src={gift.image_url} alt={gift.title} className={styles.cardImage} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', backgroundColor: '#eee' }}></div>
                    )}
                  </div>
                  <div className={styles.cardContent}>
                    <h3 className={styles.cardTitle}>{gift.title}</h3>
                    <div className={styles.cardPrice}>{formatPrice(gift.price)}</div>
                    {gift.description && <p className={styles.cardDescription}>{gift.description}</p>}
                    
                    {isAvailable ? (
                      <Link href={`/gift/${gift.id}`} className={`btn-primary ${styles.btnGift}`}>
                        Regalar
                      </Link>
                    ) : (
                      <button className={`btn-primary ${styles.btnGift}`} disabled>
                        No Disponible
                      </button>
                    )}
                  </div>
                  </div>
                </ScrollReveal>
              );
            })}
            
            {gifts.length === 0 && (
              <p style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 0', color: '#666' }}>
                No hay regalos en la lista todavía.
              </p>
            )}
          </div>
        </section>

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
