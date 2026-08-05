'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './gift.module.css';

interface Gift {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price: number;
}

interface Settings {
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  bankDocument: string;
  bankAlias: string;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    minimumFractionDigits: 0,
  }).format(price);
}

export default function GiftDetailClient({ gift, settings }: { gift: Gift; settings: Settings }) {
  const [reference, setReference] = useState('');
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(field);
    setTimeout(() => setCopied(''), 2200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const checkRes = await fetch(`/api/gifts/validate-ref?ref=${encodeURIComponent(reference)}`);
      const { exists } = await checkRes.json();

      if (exists) {
        setError('Este número de comprobante ya fue utilizado. Por favor, verifica los datos.');
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/gifts/${gift.id}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestName, reference }),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Ocurrió un error al confirmar. Intenta nuevamente.');
      }
    } catch {
      setError('Error de conexión. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.successPage}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>
            <svg viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          </div>
          <h2 className={styles.successTitle}>
            ¡Muchas gracias, {guestName || 'querido invitado'}!
          </h2>
          <p className={styles.successText}>
            Recibimos la confirmación de tu regalo: <strong>{gift.title}</strong>.
          </p>
          <p className={styles.successText}>
            Tu detalle llena nuestros corazones de alegría y será muy especial para esta nueva etapa que comenzamos juntos.
          </p>
          <span className={styles.successHeart}>♥</span>
          <Link href="/#regalos" className={styles.successBackLink}>
            ← Volver a la lista de regalos
          </Link>
        </div>
      </div>
    );
  }

  const bankFields: { key: string; label: string; value: string; copyable?: boolean }[] = [
    { key: 'bank',    label: 'Banco',   value: settings.bankName },
    { key: 'account', label: 'Cuenta',  value: settings.bankAccount,                   copyable: true },
    { key: 'holder',  label: 'Titular', value: settings.bankHolder },
    { key: 'doc',     label: 'Cédula',  value: settings.bankDocument.replace(/\./g, ''), copyable: true },
    ...(settings.bankAlias ? [{ key: 'alias', label: 'Alias', value: settings.bankAlias, copyable: true }] : []),
  ];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/#regalos" className={styles.backLink}>
          ← Volver a la lista
        </Link>

        <div className={styles.card}>
          {/* Image panel */}
          <div className={styles.imagePanel}>
            {gift.image_url ? (
              <img src={gift.image_url} alt={gift.title} className={styles.image} />
            ) : (
              <div className={styles.imagePlaceholder}>
                <svg viewBox="0 0 24 24">
                  <path d="M20 6h-2.18c.07-.44.18-.88.18-1a3 3 0 0 0-6 0c0 .12.11.56.18 1H10c-.07-.44-.18-.88-.18-1a3 3 0 0 0-6 0c0 .12.11.56.18 1H2v16h20V6zm-6-1a1 1 0 0 1 1 1c0 .12-.09.56-.18 1h-1.64C13.09 6.56 13 6.12 13 6a1 1 0 0 1 1-1zm-8 0a1 1 0 0 1 1 1c0 .12-.09.56-.18 1H5.18C5.09 6.56 5 6.12 5 6a1 1 0 0 1 1-1zm14 15H4V8h16v12z" />
                </svg>
              </div>
            )}
          </div>

          {/* Content panel */}
          <div className={styles.content}>
            <h1 className={styles.title}>{gift.title}</h1>
            <div className={styles.price}>{formatPrice(gift.price)}</div>
            {gift.description && <p className={styles.description}>{gift.description}</p>}
            <hr className={styles.divider} />

            {/* Bank details */}
            <div className={styles.bankCard}>
              <div className={styles.bankHeader}>
                <div className={styles.bankHeaderIcon}>
                  <svg viewBox="0 0 24 24">
                    <path d="M2 10v3h1v7h3v-7h2v7h3v-7h2v7h3v-7h1v-3L12 3 2 10zm10 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
                  </svg>
                </div>
                <h4 className={styles.bankTitle}>Datos para transferencia</h4>
              </div>

              <div className={styles.bankGrid}>
                {bankFields.map(({ key, label, value, copyable }) => (
                  <div key={key} className={styles.bankRow}>
                    <span className={styles.bankLabel}>{label}</span>
                    <div className={styles.bankValueGroup}>
                      <span className={styles.bankValue}>{value}</span>
                      {copyable && (
                        <button
                          className={`${styles.copyBtn} ${copied === key ? styles.copyBtnCopied : ''}`}
                          onClick={() => copyToClipboard(value, key)}
                        >
                          {copied === key ? '✓ Copiado' : 'Copiar'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Confirmation form */}
            <p className={styles.formTitle}>Confirmar transferencia</p>
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.inputGroup}>
                <label htmlFor="guestName">Tu nombre completo</label>
                <input
                  type="text"
                  id="guestName"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  required
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="reference">Nro. de comprobante / referencia</label>
                <input
                  type="text"
                  id="reference"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  required
                  placeholder="Número de operación de la transferencia"
                />
              </div>
              {error && (
                <p className={styles.errorMsg}>
                  ⚠ {error}
                </p>
              )}
              <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={loading}>
                {loading ? 'Confirmando...' : 'Confirmar Regalo'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
