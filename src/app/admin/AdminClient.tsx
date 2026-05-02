'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import styles from './admin.module.css';

interface Gift {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
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
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGift, setEditingGift] = useState<Partial<Gift> | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

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

  const openNewGiftModal = () => {
    setEditingGift({ title: '', description: '', price: 0, image_url: '' });
    setIsModalOpen(true);
  };

  const openEditGiftModal = (gift: Gift) => {
    setEditingGift({ ...gift });
    setIsModalOpen(true);
  };

  const handleSaveGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGift) return;
    
    setModalLoading(true);
    try {
      const isEditing = !!editingGift.id;
      const url = isEditing ? `/api/gifts/${editingGift.id}` : '/api/gifts';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingGift),
      });

      if (res.ok) {
        const savedGift = await res.json();
        if (isEditing) {
          setGifts(gifts.map(g => g.id === savedGift.id ? { ...g, ...savedGift } : g));
        } else {
          setGifts([savedGift, ...gifts]);
        }
        setIsModalOpen(false);
      } else {
        alert('Error al guardar el regalo');
      }
    } catch (error) {
      alert('Error de conexión');
    } finally {
      setModalLoading(false);
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

  const translateStatus = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'Disponible';
      case 'PENDING_CONFIRMATION': return 'Por Confirmar';
      case 'GIFTED': return 'Regalado';
      default: return status;
    }
  };

  const totalValue = gifts.reduce((acc, gift) => acc + gift.price, 0);
  const receivedValue = gifts.filter(g => g.status === 'GIFTED').reduce((acc, gift) => acc + gift.price, 0);
  const pendingValue = gifts.filter(g => g.status === 'PENDING_CONFIRMATION').reduce((acc, gift) => acc + gift.price, 0);

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

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatPrice(totalValue)}</div>
          <div className={styles.statLabel}>Valor Total Lista</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatPrice(receivedValue)}</div>
          <div className={styles.statLabel}>Total Recibido</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{color: '#ffa726'}}>{formatPrice(pendingValue)}</div>
          <div className={styles.statLabel}>Por Confirmar</div>
        </div>
      </div>

      <div className={styles.dashboardGrid}>
        
        {/* Settings Box */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Configuración General</h3>
          
          <h4 className={styles.cardSectionTitle}>Datos de la Boda</h4>
          <div className={styles.formGroup}>
            <label className={styles.label}>Nombres de los Novios</label>
            <input type="text" className={styles.input} value={settings.coupleNames} onChange={e => setSettings({...settings, coupleNames: e.target.value})} placeholder="Ej: Melissa & Julio" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>URL Foto Portada (Hero)</label>
            <input type="text" className={styles.input} value={settings.coverPhotoUrl || ''} onChange={e => setSettings({...settings, coverPhotoUrl: e.target.value})} placeholder="https://..." />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>URL Foto Avatar (Circular)</label>
            <input type="text" className={styles.input} value={settings.avatarPhotoUrl || ''} onChange={e => setSettings({...settings, avatarPhotoUrl: e.target.value})} placeholder="https://..." />
          </div>
          
          <h4 className={styles.cardSectionTitle}>Datos Bancarios</h4>
          <div className={styles.inputRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Banco</label>
              <input type="text" className={styles.input} value={settings.bankName} onChange={e => setSettings({...settings, bankName: e.target.value})} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nro Cuenta</label>
              <input type="text" className={styles.input} value={settings.bankAccount} onChange={e => setSettings({...settings, bankAccount: e.target.value})} />
            </div>
          </div>
          <div className={styles.inputRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Titular</label>
              <input type="text" className={styles.input} value={settings.bankHolder} onChange={e => setSettings({...settings, bankHolder: e.target.value})} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>C.I. / RUC</label>
              <input type="text" className={styles.input} value={settings.bankDocument} onChange={e => setSettings({...settings, bankDocument: e.target.value})} />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Alias</label>
            <input type="text" className={styles.input} value={settings.bankAlias || ''} onChange={e => setSettings({...settings, bankAlias: e.target.value})} />
          </div>
          
          <button className={`btn-primary ${styles.btnSave}`} onClick={() => saveSettings(settings)} disabled={settingsLoading}>
            {settingsLoading ? 'Guardando...' : 'Guardar Configuraciones'}
          </button>
        </div>

        {/* Gallery Box */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Galería de Fotos</h3>
          <div className={styles.galleryInputRow}>
            <input type="text" className={styles.input} placeholder="Pega aquí la URL de la imagen..." value={newGalleryUrl} onChange={e => setNewGalleryUrl(e.target.value)} />
            <button className="btn-primary" onClick={addGalleryImage} style={{padding: '0 1.5rem'}}>Añadir</button>
          </div>
          
          <div className={styles.galleryGrid}>
            {galleryArray.map((img, index) => (
              <div key={index} className={styles.galleryItem}>
                <img src={img} alt={`Gallery ${index}`} />
                <div className={styles.galleryOverlay}>
                  <button onClick={() => removeGalleryImage(index)} className={styles.btnDeleteIcon} title="Eliminar foto">✕</button>
                </div>
              </div>
            ))}
            {galleryArray.length === 0 && (
              <p style={{gridColumn: '1/-1', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0'}}>
                No hay fotos en la galería. ¡Añade algunas!
              </p>
            )}
          </div>
        </div>

      </div>

      <div className={styles.uploadSection}>
        <div className={styles.uploadHeader}>
          <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
            <h3 className={styles.cardTitle} style={{margin: 0}}>Regalos Registrados</h3>
            <button className="btn-primary" onClick={openNewGiftModal} style={{padding: '0.4rem 1rem', fontSize: '0.9rem'}}>
              + Nuevo Regalo
            </button>
          </div>
          <button onClick={downloadTemplate} className={styles.btnOutline}>
            Descargar Plantilla CSV
          </button>
        </div>
        <p>También puedes cargar masivamente usando un archivo CSV (columnas: <code>title, description, image_url, price</code>)</p>
        <input 
          type="file" 
          accept=".csv" 
          onChange={handleFileUpload} 
          className={styles.fileInput}
          disabled={loading}
        />
        {loading && <span style={{fontSize: '0.9rem', color: 'var(--primary)'}}>Procesando y cargando regalos...</span>}
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Regalo</th>
              <th>Precio</th>
              <th>Estado</th>
              <th>Ref. Transferencia</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {gifts.map(gift => (
              <tr key={gift.id}>
                <td>
                  <div className={styles.giftTitleCell}>
                    {gift.image_url ? (
                      <img src={gift.image_url} alt={gift.title} className={styles.tableThumbnail} />
                    ) : (
                      <div className={styles.tableThumbnail}></div>
                    )}
                    <span className={styles.giftTitle}>{gift.title}</span>
                  </div>
                </td>
                <td style={{fontWeight: 500}}>{formatPrice(gift.price)}</td>
                <td>
                  <span className={`${styles.statusBadge} ${styles[`status-${gift.status}`]}`}>
                    {translateStatus(gift.status)}
                  </span>
                </td>
                <td>
                  {gift.transfer_reference ? (
                    <span className={styles.referenceCode}>{gift.transfer_reference}</span>
                  ) : <span style={{color: 'var(--border)'}}>—</span>}
                </td>
                <td>
                  <div className={styles.actionsCell}>
                    <button className={styles.actionPill} onClick={() => openEditGiftModal(gift)}>
                      Editar
                    </button>
                    {gift.status === 'PENDING_CONFIRMATION' && (
                      <button className={styles.actionPill} onClick={() => updateStatus(gift.id, 'GIFTED')}>
                        Aprobar
                      </button>
                    )}
                    {gift.status !== 'AVAILABLE' && (
                      <button className={styles.actionPill} onClick={() => updateStatus(gift.id, 'AVAILABLE')}>
                        Liberar
                      </button>
                    )}
                    <button className={`${styles.actionPill} ${styles.danger}`} onClick={() => deleteGift(gift.id)}>
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {gifts.length === 0 && (
              <tr>
                <td colSpan={5} style={{textAlign: 'center', color: 'var(--text-muted)', padding: '3rem'}}>
                  No hay regalos registrados aún. Usa la carga masiva CSV para agregar algunos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Gift Modal */}
      {isModalOpen && editingGift && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{editingGift.id ? 'Editar Regalo' : 'Nuevo Regalo'}</h2>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveGift}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Título *</label>
                  <input type="text" className={styles.input} required value={editingGift.title || ''} onChange={e => setEditingGift({...editingGift, title: e.target.value})} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Precio (GS.) *</label>
                  <input type="number" className={styles.input} required value={editingGift.price || ''} onChange={e => setEditingGift({...editingGift, price: Number(e.target.value)})} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>URL de la Imagen</label>
                  <input type="text" className={styles.input} value={editingGift.image_url || ''} onChange={e => setEditingGift({...editingGift, image_url: e.target.value})} placeholder="https://..." />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Descripción</label>
                  <textarea className={styles.input} rows={3} value={editingGift.description || ''} onChange={e => setEditingGift({...editingGift, description: e.target.value})}></textarea>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnOutline} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={modalLoading}>
                  {modalLoading ? 'Guardando...' : 'Guardar Regalo'}
               </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
