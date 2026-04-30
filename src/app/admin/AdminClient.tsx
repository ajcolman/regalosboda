'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import styles from './admin.module.css';

interface Gift {
  id: string;
  title: string;
  description: string | null;
  price: number;
  status: string;
  transfer_reference: string | null;
}

interface Settings {
  id: string;
  coupleNames: string;
  coverPhotoUrl: string | null;
  avatarPhotoUrl: string | null;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  bankDocument: string;
  bankAlias: string;
  galleryImages: string | null;
}

export default function AdminClient({ initialGifts, initialSettings }: { initialGifts: Gift[], initialSettings: Settings }) {
  const [gifts, setGifts] = useState<Gift[]>(initialGifts);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  
  // Gallery input state
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  
  let galleryArray: string[] = [];
  try {
    if (settings.galleryImages) {
      let parsed = JSON.parse(settings.galleryImages);
      // Handle double stringification
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      if (Array.isArray(parsed)) {
        galleryArray = parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse gallery images', e);
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(price);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setLoading(true);
        try {
          const parsedGifts = results.data.map((row: any) => ({
            title: row.titulo || row.title,
            description: row.descripcion || row.description || '',
            image_url: row.imagen || row.image_url || '',
            price: row.precio || row.price || 0,
          }));

          const res = await fetch('/api/gifts/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsedGifts),
          });

          if (res.ok) {
            alert('CSV cargado con éxito');
            window.location.reload();
          } else {
            alert('Error al cargar CSV');
          }
        } catch (error) {
          alert('Error processing file');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const updateStatus = async (id: string, newStatus: string) => {
    if (!confirm(`¿Seguro que deseas marcar como ${newStatus}?`)) return;
    try {
      const res = await fetch(`/api/gifts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setGifts(gifts.map(g => g.id === id ? { ...g, status: newStatus } : g));
      }
    } catch (e) {
      alert('Error al actualizar estado');
    }
  };

  const deleteGift = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este regalo?')) return;
    try {
      const res = await fetch(`/api/gifts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setGifts(gifts.filter(g => g.id !== id));
      }
    } catch (e) {
      alert('Error al eliminar');
    }
  };

  const saveSettings = async (updates: Partial<Settings>) => {
    setSettingsLoading(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        alert('Configuración guardada correctamente');
      } else {
        alert('Error al guardar la configuración');
      }
    } catch (e) {
      alert('Error de conexión');
    } finally {
      setSettingsLoading(false);
    }
  };

  const addGalleryImage = () => {
    if (!newGalleryUrl.trim()) return;
    const newArray = [...galleryArray, newGalleryUrl.trim()];
    saveSettings({ galleryImages: JSON.stringify(newArray) as any });
    setNewGalleryUrl('');
  };

  const removeGalleryImage = (index: number) => {
    const newArray = galleryArray.filter((_, i) => i !== index);
    saveSettings({ galleryImages: JSON.stringify(newArray) as any });
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
      window.location.href = '/admin/login';
    } catch (e) {
      console.error(e);
      window.location.href = '/admin/login';
    }
  };

  const downloadTemplate = () => {
    const csvContent = "title,description,price,image_url\nRegalo Ejemplo,Descripción del regalo,150000,https://ejemplo.com/imagen.jpg";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_regalos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Mantenimiento de Regalos</h1>
        <button 
          className={styles.logoutBtn} 
          onClick={handleLogout}
        >
          Cerrar Sesión
        </button>
      </header>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        
        {/* Settings Box */}
        <div className={styles.settingsBox} style={{flex: '1', minWidth: '300px', background: 'var(--surface)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)'}}>
          <h3 style={{marginBottom: '1.5rem', fontFamily: 'var(--font-sans)'}}>Datos de la Boda</h3>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <div>
              <label style={{display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem'}}>Nombres de los Novios</label>
              <input type="text" value={settings.coupleNames} onChange={e => setSettings({...settings, coupleNames: e.target.value})} style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)'}} />
            </div>
            <div>
              <label style={{display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem'}}>URL de Foto Principal (Portada)</label>
              <input type="text" value={settings.coverPhotoUrl || ''} onChange={e => setSettings({...settings, coverPhotoUrl: e.target.value})} placeholder="https://..." style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)'}} />
            </div>
            <div>
              <label style={{display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem'}}>URL de Foto Avatar (Circular)</label>
              <input type="text" value={settings.avatarPhotoUrl || ''} onChange={e => setSettings({...settings, avatarPhotoUrl: e.target.value})} placeholder="https://..." style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)'}} />
            </div>
            
            <hr style={{margin: '1rem 0', borderColor: 'var(--border)'}} />
            <h4 style={{fontSize: '1rem'}}>Datos Bancarios</h4>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
              <div>
                <label style={{display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem'}}>Banco</label>
                <input type="text" value={settings.bankName} onChange={e => setSettings({...settings, bankName: e.target.value})} style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)'}} />
              </div>
              <div>
                <label style={{display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem'}}>Nro Cuenta</label>
                <input type="text" value={settings.bankAccount} onChange={e => setSettings({...settings, bankAccount: e.target.value})} style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)'}} />
              </div>
              <div>
                <label style={{display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem'}}>Titular</label>
                <input type="text" value={settings.bankHolder} onChange={e => setSettings({...settings, bankHolder: e.target.value})} style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)'}} />
              </div>
              <div>
                <label style={{display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem'}}>C.I. / RUC</label>
                <input type="text" value={settings.bankDocument} onChange={e => setSettings({...settings, bankDocument: e.target.value})} style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)'}} />
              </div>
              <div style={{gridColumn: '1 / -1'}}>
                <label style={{display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem'}}>Alias</label>
                <input type="text" value={settings.bankAlias || ''} onChange={e => setSettings({...settings, bankAlias: e.target.value})} style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)'}} />
              </div>
            </div>
            
            <button className="btn-primary" onClick={() => saveSettings(settings)} disabled={settingsLoading} style={{marginTop: '1rem'}}>
              {settingsLoading ? 'Guardando...' : 'Guardar Configuraciones'}
            </button>
          </div>
        </div>

        {/* Gallery Box */}
        <div style={{flex: '1', minWidth: '300px', background: 'var(--surface)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)'}}>
          <h3 style={{marginBottom: '1.5rem', fontFamily: 'var(--font-sans)'}}>Galería de Fotos</h3>
          <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1rem'}}>
            <input type="text" placeholder="URL de la imagen" value={newGalleryUrl} onChange={e => setNewGalleryUrl(e.target.value)} style={{flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border)'}} />
            <button className="btn-primary" onClick={addGalleryImage}>Añadir</button>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem'}}>
            {galleryArray.map((img, index) => (
              <div key={index} style={{position: 'relative', paddingTop: '100%', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden'}}>
                <img src={img} alt={`Gallery ${index}`} style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover'}} />
                <button onClick={() => removeGalleryImage(index)} style={{position: 'absolute', top: '5px', right: '5px', background: '#e53935', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px'}}>X</button>
              </div>
            ))}
            {galleryArray.length === 0 && <p style={{gridColumn: '1/-1', color: 'var(--text-muted)', fontSize: '0.85rem'}}>No hay fotos en la galería.</p>}
          </div>
        </div>

      </div>

      <div className={styles.actions}>
        <div className={styles.uploadSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Carga Masiva (CSV)</h3>
            <button onClick={downloadTemplate} className={styles.actionBtn} style={{ fontSize: '0.9rem', marginBottom: 0 }}>
              Descargar Plantilla
            </button>
          </div>
          <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>
            El archivo CSV debe contener las columnas: <code>title, description, image_url, price</code>
          </p>
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileUpload} 
            className={styles.fileInput}
            disabled={loading}
          />
          {loading && <span style={{fontSize: '0.85rem'}}>Procesando...</span>}
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Regalo</th>
              <th>Precio</th>
              <th>Estado</th>
              <th>Referencia Transferencia</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {gifts.map(gift => (
              <tr key={gift.id}>
                <td>
                  <strong>{gift.title}</strong>
                </td>
                <td>{formatPrice(gift.price)}</td>
                <td>
                  <span className={`${styles.statusBadge} ${styles[`status-${gift.status}`]}`}>
                    {gift.status}
                  </span>
                </td>
                <td>
                  {gift.transfer_reference ? (
                    <code style={{background: 'var(--border)', color: 'var(--foreground)', padding: '2px 6px', borderRadius: '4px'}}>
                      {gift.transfer_reference}
                    </code>
                  ) : '-'}
                </td>
                <td>
                  {gift.status === 'PENDING_CONFIRMATION' && (
                    <button className={styles.actionBtn} onClick={() => updateStatus(gift.id, 'GIFTED')}>
                      Aprobar
                    </button>
                  )}
                  {gift.status !== 'AVAILABLE' && (
                    <button className={styles.actionBtn} onClick={() => updateStatus(gift.id, 'AVAILABLE')}>
                      Liberar
                    </button>
                  )}
                  <button className={`${styles.actionBtn} ${styles.danger}`} onClick={() => deleteGift(gift.id)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {gifts.length === 0 && (
              <tr>
                <td colSpan={5} style={{textAlign: 'center', color: 'var(--text-muted)'}}>No hay regalos registrados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
