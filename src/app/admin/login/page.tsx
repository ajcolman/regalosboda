'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './login.module.css';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push('/admin');
      } else {
        const data = await res.json();
        setError(data.error || 'Contraseña incorrecta');
      }
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      {/* Left decorative panel */}
      <div className={styles.leftPanel}>
        <div className={styles.leftContent}>
          <span className={styles.leftHeart}>♥</span>
          <h1 className={styles.leftTitle}>Lista de Regalos</h1>
          <div className={styles.leftDivider} />
          <p className={styles.leftText}>
            Panel de administración para gestionar la lista de regalos de boda.
            Solo personas autorizadas pueden acceder.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className={styles.rightPanel}>
        <div className={styles.loginBox}>
          {/* Mobile brand */}
          <div className={styles.mobileBrand}>
            <span className={styles.mobileBrandIcon}>♥</span>
          </div>

          <h2 className={styles.title}>Panel Privado</h2>
          <p className={styles.subtitle}>Ingresa la contraseña para continuar</p>

          <form className={styles.form} onSubmit={handleLogin}>
            <div className={styles.inputGroup}>
              <label htmlFor="password">Contraseña</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoFocus
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className={styles.error}>⚠ {error}</p>
            )}
            <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={loading}>
              {loading ? 'Verificando…' : 'Entrar al Panel'}
            </button>
          </form>

          <Link href="/" className={styles.backToSite}>
            ← Volver al sitio
          </Link>
        </div>
      </div>
    </div>
  );
}
