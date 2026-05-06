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
  status: string;
  timesPending: number;
}

interface Settings {
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  bankDocument: string;
  bankAlias: string;
}

export default function GiftDetailClient({ gift, settings }: { gift: Gift, settings: Settings }) {
  const [reference, setReference] = useState('');
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Validar si el comprobante ya existe
      const checkRes = await fetch(`/api/gifts/validate-ref?ref=${encodeURIComponent(reference)}`);
      const { exists } = await checkRes.json();
      
      if (exists) {
        setError('Este número de comprobante ya ha sido utilizado para otro regalo. Por favor, verifica los datos.');
        setLoading(false);
        return;
      }

      // 2. Proceder con la confirmación
      const newReference = gift.transfer_reference 
        ? `${gift.transfer_reference} | [${guestName}] ${reference}`
        : `[${guestName}] ${reference}`;

      const res = await fetch(`/api/gifts/${gift.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PENDING_CONFIRMATION',
          timesPending: gift.timesPending + 1,
          transfer_reference: newReference
        })
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        setError('Ocurrió un error al confirmar. Intenta nuevamente.');
      }
    } catch (err) {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.successMessage}>
            <h2>¡Muchas gracias, {guestName || 'querido invitado'}!</h2>
            <p>Hemos recibido la confirmación de tu regalo: <strong>{gift.title}</strong>.</p>
            <p>Tu detalle nos llena de alegría y será muy especial para nuestra nueva etapa.</p>
            <Link href="/#regalos" className={styles.backLink}>Volver a la lista de regalos</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Link href="/#regalos" style={{display: 'inline-block', marginBottom: '1rem', color: 'var(--primary-dark)', fontWeight: 600}}>&larr; Volver</Link>
      <div className={styles.card}>
        <div className={styles.imageContainer}>
          {gift.image_url ? (
            <img src={gift.image_url} alt={gift.title} className={styles.image} />
          ) : (
             <div style={{ width: '100%', height: '100%', backgroundColor: '#eee' }}></div>
          )}
        </div>
        <div className={styles.content}>
          <h1 className={styles.title}>{gift.title}</h1>
          <div className={styles.price}>{formatPrice(gift.price)}</div>
          {gift.description && <p className={styles.description}>{gift.description}</p>}
          
          <div className={styles.bankDetails}>
            <h4>Datos para transferencia</h4>
            <p><strong>Banco:</strong> {settings.bankName}</p>
            <p><strong>Cuenta:</strong> {settings.bankAccount}</p>
            <p><strong>Titular:</strong> {settings.bankHolder}</p>
            <p><strong>Cédula/RUC:</strong> {settings.bankDocument}</p>
            {settings.bankAlias && <p><strong>Alias:</strong> {settings.bankAlias}</p>}
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <label htmlFor="guestName">Tu Nombre Completo</label>
              <input
                type="text"
                id="guestName"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
                placeholder="Ej. Juan Pérez"
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="reference">Nro. de Comprobante / Referencia</label>
              <input
                type="text"
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                required
                placeholder="Ingresa el número de operación"
              />
            </div>
            {error && <p style={{ color: '#d32f2f', fontSize: '0.9rem' }}>{error}</p>}
            <button type="submit" className="btn-primary" disabled={loading} style={{marginTop: '1rem'}}>
              {loading ? 'Confirmando...' : 'Confirmar Regalo'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
