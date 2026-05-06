import Link from 'next/link';
import styles from './home.module.css';
import ScrollReveal from '@/components/ScrollReveal';

interface Gift {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price: number;
  stock: number;
  timesGifted: number;
  timesPending: number;
}

function getStatus(gift: Gift) {
  if (gift.timesGifted >= gift.stock)
    return { text: 'Regalado', type: 'gifted' as const };
  if (gift.timesGifted + gift.timesPending >= gift.stock)
    return { text: 'Reservado', type: 'reserved' as const };
  return { text: 'Disponible', type: 'available' as const };
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    minimumFractionDigits: 0,
  }).format(price);
}

export default function GiftGrid({ gifts }: { gifts: Gift[] }) {
  return (
    <div className={styles.grid}>
      {gifts.map((gift, idx) => {
        const status = getStatus(gift);
        const isAvailable = status.type === 'available';

        const badgeClass =
          status.type === 'available'
            ? styles.statusAvailable
            : status.type === 'reserved'
            ? styles.statusReserved
            : styles.statusGifted;

        const cardInner = (
          <>
            <div className={styles.cardImageContainer}>
              <div className={`${styles.statusBadge} ${badgeClass}`}>
                <span className={styles.statusDot} />
                {status.text}
              </div>
              {gift.image_url ? (
                <img src={gift.image_url} alt={gift.title} className={styles.cardImage} />
              ) : (
                <div className={styles.cardImagePlaceholder}>
                  <svg viewBox="0 0 24 24" className={styles.placeholderIcon}>
                    <path d="M20 6h-2.18c.07-.44.18-.88.18-1a3 3 0 0 0-6 0c0 .12.11.56.18 1H10c-.07-.44-.18-.88-.18-1a3 3 0 0 0-6 0c0 .12.11.56.18 1H2v16h20V6zm-6-1a1 1 0 0 1 1 1c0 .12-.09.56-.18 1h-1.64C13.09 6.56 13 6.12 13 6a1 1 0 0 1 1-1zm-8 0a1 1 0 0 1 1 1c0 .12-.09.56-.18 1H5.18C5.09 6.56 5 6.12 5 6a1 1 0 0 1 1-1zm14 15H4V8h16v12z" />
                  </svg>
                </div>
              )}
            </div>

            <div className={styles.cardContent}>
              <div className={styles.cardTop}>
                <h3 className={styles.cardTitle}>{gift.title}</h3>
                {gift.description && (
                  <p className={styles.cardDescription}>{gift.description}</p>
                )}
              </div>
              <div className={styles.cardBottom}>
                <div className={styles.cardPrice}>{formatPrice(gift.price)}</div>
                <div className={`btn-primary ${styles.btnGift} ${!isAvailable ? styles.btnDisabled : ''}`}>
                  {isAvailable ? 'Regalar' : status.type === 'gifted' ? '¡Completado!' : 'Reservado'}
                </div>
              </div>
            </div>
          </>
        );

        return (
          <ScrollReveal key={gift.id} delay={idx * 40 > 400 ? 400 : idx * 40}>
            {isAvailable ? (
              <Link href={`/gift/${gift.id}`} className={styles.card}>
                {cardInner}
              </Link>
            ) : (
              <div className={`${styles.card} ${styles.cardGifted}`}>
                {cardInner}
              </div>
            )}
          </ScrollReveal>
        );
      })}

      {gifts.length === 0 && (
        <div className={styles.emptyState}>
          <span className={styles.emptyStateIcon}>🎁</span>
          <p>No hay regalos en la lista todavía.</p>
        </div>
      )}
    </div>
  );
}
