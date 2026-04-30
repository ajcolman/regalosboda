import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import styles from './home.module.css';

export const revalidate = 0;

export default async function Home() {
  const gifts = await prisma.gift.findMany({
    orderBy: { createdAt: 'desc' },
  });

  let settings = await prisma.settings.findFirst();
  if (!settings) {
    settings = await prisma.settings.create({ data: {} });
  }

  const galleryArray: string[] = settings.galleryImages ? JSON.parse(settings.galleryImages) : [];

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
          <h1 className={styles.heroTitle}>{settings.coupleNames}</h1>
          <p className={styles.heroSubtitle}>
            Nuestra mayor alegría es compartir este día con ustedes.
            Si desean tener un detalle adicional, hemos preparado esta lista con mucho amor.
          </p>
        </div>
      </section>

      <div className="container">
        
        {/* Gallery Section */}
        {galleryArray.length > 0 && (
          <section>
            <h2 className={styles.sectionTitle}>Nuestra Historia</h2>
            <div className={styles.galleryGrid}>
              {galleryArray.map((imgUrl, idx) => (
                <div key={idx} className={styles.galleryImageContainer}>
                  <img src={imgUrl} alt={`Gallery ${idx}`} className={styles.galleryImage} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className={styles.sectionTitle}>Lista de Regalos</h2>
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
                <div key={gift.id} className={`${styles.card} ${!isAvailable ? styles.cardGifted : ''}`}>
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
              );
            })}
            
            {gifts.length === 0 && (
              <p style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 0', color: '#666' }}>
                No hay regalos en la lista todavía.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
