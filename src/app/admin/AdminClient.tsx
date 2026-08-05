'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import styles from './admin.module.css';
import ImageDropzone from '@/components/ImageDropzone';
import { deriveStatusField } from '@/lib/giftStatus';

interface Gift {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price: number;
  status: string;
  stock: number;
  timesGifted: number;
  timesPending: number;
  isVisible: boolean;
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
  weddingDate: string | null;
}

type AdminTab = 'gifts' | 'settings' | 'gallery';

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    minimumFractionDigits: 0,
  }).format(price);
}

function translateStatus(status: string) {
  switch (status) {
    case 'AVAILABLE':            return 'Disponible';
    case 'PENDING_CONFIRMATION': return 'Por Confirmar';
    case 'GIFTED':               return 'Regalado';
    default:                     return status;
  }
}

export default function AdminClient({
  initialGifts,
  initialSettings,
}: {
  initialGifts: Gift[];
  initialSettings: Settings;
}) {
  const [gifts, setGifts]     = useState<Gift[]>(initialGifts);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [activeTab, setActiveTab] = useState<AdminTab>('gifts');
  const [loading, setLoading]     = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [editingGift, setEditingGift]   = useState<Partial<Gift> | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [newGalleryUrl, setNewGalleryUrl] = useState('');

  // ── Gallery array ──
  let galleryArray: string[] = [];
  try {
    if (settings.galleryImages) {
      let parsed = JSON.parse(settings.galleryImages);
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      if (Array.isArray(parsed)) galleryArray = parsed;
    }
  } catch { /* ignore */ }

  // ── Stats ──
  const totalValue    = gifts.reduce((s, g) => s + g.price * g.stock, 0);
  const receivedValue = gifts.reduce((s, g) => s + g.price * g.timesGifted, 0);
  const pendingValue  = gifts.reduce((s, g) => s + g.price * g.timesPending, 0);
  const giftedCount   = gifts.filter(g => g.timesGifted >= g.stock).length;
  const progressPct   = gifts.length > 0 ? Math.round((giftedCount / gifts.length) * 100) : 0;

  // ── Handlers ──
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setLoading(true);
        try {
          const parsed = (results.data as Record<string, string>[]).map(row => ({
            title:     row.titulo || row.title,
            description: row.descripcion || row.description || '',
            image_url: row.imagen || row.image_url || '',
            price:     row.precio || row.price || 0,
            stock:     row.stock ? parseInt(row.stock) : 1,
            isVisible: row.visible !== undefined
              ? row.visible.toLowerCase() === 'si' || row.visible.toLowerCase() === 'true'
              : true,
          }));
          const res = await fetch('/api/gifts/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed),
          });
          if (res.ok) {
            alert('CSV cargado con éxito');
            window.location.reload();
          } else {
            alert('Error al cargar CSV');
          }
        } catch {
          alert('Error procesando el archivo');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const patchCounters = async (id: string, updates: Partial<Gift>) => {
    try {
      const res = await fetch(`/api/gifts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setGifts(gifts.map(g => g.id === id ? updated : g));
      } else {
        alert('Error al actualizar estado');
      }
    } catch { alert('Error al actualizar estado'); }
  };

  /** Confirma una unidad pendiente: pasa de "por confirmar" a "regalada". */
  const approveGift = async (id: string) => {
    const gift = gifts.find(g => g.id === id);
    if (!gift || gift.timesPending <= 0) return;
    if (!confirm('¿Confirmar que recibiste esta transferencia?')) return;
    await patchCounters(id, {
      timesGifted:  gift.timesGifted + 1,
      timesPending: gift.timesPending - 1,
    });
  };

  /** Libera una unidad: primero descuenta las pendientes, luego las ya regaladas. */
  const releaseGift = async (id: string) => {
    const gift = gifts.find(g => g.id === id);
    if (!gift) return;
    if (gift.timesPending > 0) {
      if (!confirm('¿Rechazar esta reserva y liberar la unidad?')) return;
      await patchCounters(id, { timesPending: gift.timesPending - 1 });
    } else if (gift.timesGifted > 0) {
      if (!confirm('¿Deshacer un regalo confirmado y liberar la unidad?')) return;
      await patchCounters(id, { timesGifted: gift.timesGifted - 1 });
    }
  };

  const deleteGift = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este regalo?')) return;
    try {
      const res = await fetch(`/api/gifts/${id}`, { method: 'DELETE' });
      if (res.ok) setGifts(gifts.filter(g => g.id !== id));
    } catch { alert('Error al eliminar'); }
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
    } catch { alert('Error de conexión'); }
    finally { setSettingsLoading(false); }
  };

  const handleSaveGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGift) return;
    setModalLoading(true);
    try {
      const isEditing = !!editingGift.id;
      const url    = isEditing ? `/api/gifts/${editingGift.id}` : '/api/gifts';
      const method = isEditing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingGift),
      });
      if (res.ok) {
        const saved = await res.json();
        if (isEditing) setGifts(gifts.map(g => g.id === saved.id ? { ...g, ...saved } : g));
        else           setGifts([saved, ...gifts]);
        setIsModalOpen(false);
      } else {
        alert('Error al guardar el regalo');
      }
    } catch { alert('Error de conexión'); }
    finally { setModalLoading(false); }
  };

  const addGalleryImage = () => {
    if (!newGalleryUrl.trim()) return;
    const updated = [...galleryArray, newGalleryUrl.trim()];
    saveSettings({ galleryImages: JSON.stringify(updated) });
    setNewGalleryUrl('');
  };

  const uploadGalleryImage = (url: string) => {
    const updated = [...galleryArray, url];
    saveSettings({ galleryImages: JSON.stringify(updated) });
  };

  const removeGalleryImage = (index: number) => {
    const updated = galleryArray.filter((_, i) => i !== index);
    saveSettings({ galleryImages: JSON.stringify(updated) });
  };

  const handleLogout = async () => {
    try { await fetch('/api/auth', { method: 'DELETE' }); } catch { /* ignore */ }
    window.location.href = '/admin/login';
  };

  const downloadTemplate = () => {
    const csv  = 'title,description,price,image_url,stock,visible\nRegalo Ejemplo,Descripción,150000,https://ejemplo.com/img.jpg,1,si';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_regalos.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ─────────────────────────────────────────────────
  return (
    <div className={styles.adminRoot}>
      {/* ── Topbar ── */}
      <header className={styles.topbar}>
        <div className={styles.brandMark}>
          <div className={styles.brandIcon}>
            <svg viewBox="0 0 24 24">
              <path d="M20 7h-1V6a4 4 0 0 0-8 0v1H7a1 1 0 0 0-1 1v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a1 1 0 0 0-1-1zm-7-1a2 2 0 0 1 4 0v1h-4V6zm6 14H9V9h10v11z"/>
            </svg>
          </div>
          <div>
            <div className={styles.brandName}>{settings.coupleNames || 'Lista de Regalos'}</div>
            <div className={styles.brandSub}>Panel de administración</div>
          </div>
        </div>
        <div className={styles.topbarRight}>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className={styles.mainContent}>

        {/* ── Stats Row ── */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={`${styles.statIconWrap} ${styles.statIconBlue}`}>
              <svg viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{formatPrice(totalValue)}</div>
              <div className={styles.statLabel}>Valor Total Lista</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIconWrap} ${styles.statIconGreen}`}>
              <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{formatPrice(receivedValue)}</div>
              <div className={styles.statLabel}>Total Recibido</div>
              <div className={styles.statProgress}>
                <div className={styles.statProgressFill} style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIconWrap} ${styles.statIconOrange}`}>
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statValue} style={{ color: 'var(--warning)' }}>{formatPrice(pendingValue)}</div>
              <div className={styles.statLabel}>Por Confirmar</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIconWrap} ${styles.statIconPrimary}`}>
              <svg viewBox="0 0 24 24"><path d="M20 6h-2.18c.07-.44.18-.88.18-1a3 3 0 0 0-6 0c0 .12.11.56.18 1H10c-.07-.44-.18-.88-.18-1a3 3 0 0 0-6 0c0 .12.11.56.18 1H2v16h20V6zm-6-1a1 1 0 0 1 1 1c0 .12-.09.56-.18 1h-1.64C13.09 6.56 13 6.12 13 6a1 1 0 0 1 1-1zm-8 0a1 1 0 0 1 1 1c0 .12-.09.56-.18 1H5.18C5.09 6.56 5 6.12 5 6a1 1 0 0 1 1-1zm14 15H4V8h16v12z"/></svg>
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{giftedCount} / {gifts.length}</div>
              <div className={styles.statLabel}>Regalos Completados</div>
              <div className={styles.statProgress}>
                <div className={styles.statProgressFill} style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <nav className={styles.tabNav}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'gifts' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('gifts')}
          >
            Regalos
            <span className={styles.tabBadge}>{gifts.length}</span>
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'settings' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Configuración
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'gallery' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('gallery')}
          >
            Galería
            <span className={styles.tabBadge}>{galleryArray.length}</span>
          </button>
        </nav>

        {/* ═══════════════════════════
            TAB: REGALOS
            ═══════════════════════════ */}
        {activeTab === 'gifts' && (
          <>
            {/* Toolbar */}
            <div className={styles.giftsToolbar}>
              <div className={styles.giftsToolbarLeft}>
                <h3 className={styles.cardTitle}>Regalos Registrados</h3>
                <button
                  className={styles.btnSmPrimary}
                  onClick={() => {
                    setEditingGift({ title: '', description: '', price: 0, image_url: '', stock: 1, isVisible: true });
                    setIsModalOpen(true);
                  }}
                >
                  + Nuevo Regalo
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button className={styles.btnGhost} onClick={downloadTemplate}>
                  ↓ Plantilla CSV
                </button>
                <label className={styles.btnOutline} style={{ cursor: 'pointer', marginBottom: 0 }}>
                  {loading ? (
                    <span className={styles.csvStatus}><span className={styles.csvDot} /> Procesando…</span>
                  ) : (
                    'Cargar CSV'
                  )}
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    disabled={loading}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>

            <p className={styles.csvHint}>
              Columnas del CSV:{' '}
              <code>title</code> <code>description</code> <code>price</code>{' '}
              <code>image_url</code> <code>stock</code> <code>visible</code>
            </p>

            {/* Table */}
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Regalo</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th>Recibido</th>
                    <th>Visible</th>
                    <th>Estado</th>
                    <th>Ref. Transferencia</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {gifts.map(gift => (
                    <tr key={gift.id}>
                      <td>
                        <div className={styles.giftCell}>
                          {gift.image_url ? (
                            <img src={gift.image_url} alt={gift.title} className={styles.tableThumbnail} />
                          ) : (
                            <div className={styles.tableThumbnail} />
                          )}
                          <span className={styles.giftName}>{gift.title}</span>
                        </div>
                      </td>
                      <td className={styles.priceCell}>{formatPrice(gift.price)}</td>
                      <td className={styles.stockCell}>
                        <span className={styles.stockPill}>{gift.stock}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 600 }}>{gift.timesGifted}</span>
                        <span style={{ color: 'var(--text-light)' }}> / {gift.stock}</span>
                      </td>
                      <td>
                        <span className={`${styles.visibilityBadge} ${gift.isVisible ? styles.visibilityOn : styles.visibilityOff}`}>
                          {gift.isVisible ? '● Visible' : '○ Oculto'}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles[`status-${deriveStatusField(gift)}`]}`}>
                          <span className={styles.statusDot} />
                          {translateStatus(deriveStatusField(gift))}
                          {gift.timesPending > 0 && ` (${gift.timesPending})`}
                        </span>
                      </td>
                      <td>
                        {gift.transfer_reference ? (
                          <span className={styles.refCode} title={gift.transfer_reference}>
                            {gift.transfer_reference}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--border)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <div className={styles.actionsCell}>
                          <button className={styles.actionBtn} onClick={() => { setEditingGift({ ...gift }); setIsModalOpen(true); }}>
                            Editar
                          </button>
                          {gift.timesPending > 0 && (
                            <button className={styles.actionBtn} onClick={() => approveGift(gift.id)}>
                              Aprobar
                            </button>
                          )}
                          {(gift.timesPending > 0 || gift.timesGifted > 0) && (
                            <button className={styles.actionBtn} onClick={() => releaseGift(gift.id)}>
                              {gift.timesPending > 0 ? 'Rechazar' : 'Liberar'}
                            </button>
                          )}
                          <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={() => deleteGift(gift.id)}>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {gifts.length === 0 && (
                    <tr>
                      <td colSpan={8} className={styles.tableEmpty}>
                        No hay regalos registrados. Usa "Cargar CSV" o "+ Nuevo Regalo" para agregar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ═══════════════════════════
            TAB: CONFIGURACIÓN
            ═══════════════════════════ */}
        {activeTab === 'settings' && (
          <div className={styles.settingsGrid}>
            {/* Wedding data */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderLeft}>
                  <h3 className={styles.cardTitle}>Datos de la Boda</h3>
                </div>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nombres de los Novios</label>
                  <input type="text" className={styles.input} value={settings.coupleNames}
                    onChange={e => setSettings({ ...settings, coupleNames: e.target.value })}
                    placeholder="Ej: Melissa & Julio" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Fecha de la Boda</label>
                  <input type="datetime-local" className={styles.input} value={settings.weddingDate || ''}
                    onChange={e => setSettings({ ...settings, weddingDate: e.target.value })} />
                </div>
                <div className={styles.formGroup} style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
                  <label className={styles.label}>Foto Portada (Hero) - Aspecto 16:9</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginTop: '0.25rem' }}>
                    <ImageDropzone 
                      aspectRatio="16:9" 
                      onUploadComplete={(url) => setSettings({ ...settings, coverPhotoUrl: url })} 
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 'fit-content' }}>Enlace actual:</span>
                      <input type="text" className={styles.input} value={settings.coverPhotoUrl || ''}
                        onChange={e => setSettings({ ...settings, coverPhotoUrl: e.target.value })}
                        placeholder="https://..." style={{ fontSize: '0.8rem', padding: '6px 10px' }} />
                    </div>
                  </div>
                </div>
                <div className={styles.formGroup} style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
                  <label className={styles.label}>Foto Avatar (Circular) - Aspecto 1:1</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginTop: '0.25rem' }}>
                    <ImageDropzone 
                      aspectRatio="circle" 
                      onUploadComplete={(url) => setSettings({ ...settings, avatarPhotoUrl: url })} 
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 'fit-content' }}>Enlace actual:</span>
                      <input type="text" className={styles.input} value={settings.avatarPhotoUrl || ''}
                        onChange={e => setSettings({ ...settings, avatarPhotoUrl: e.target.value })}
                        placeholder="https://..." style={{ fontSize: '0.8rem', padding: '6px 10px' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bank data */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderLeft}>
                  <h3 className={styles.cardTitle}>Datos Bancarios</h3>
                </div>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.inputRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Banco</label>
                    <input type="text" className={styles.input} value={settings.bankName}
                      onChange={e => setSettings({ ...settings, bankName: e.target.value })} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Nro. Cuenta</label>
                    <input type="text" className={styles.input} value={settings.bankAccount}
                      onChange={e => setSettings({ ...settings, bankAccount: e.target.value })} />
                  </div>
                </div>
                <div className={styles.inputRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Titular</label>
                    <input type="text" className={styles.input} value={settings.bankHolder}
                      onChange={e => setSettings({ ...settings, bankHolder: e.target.value })} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>C.I. / RUC</label>
                    <input type="text" className={styles.input} value={settings.bankDocument}
                      onChange={e => setSettings({ ...settings, bankDocument: e.target.value })} />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Alias</label>
                  <input type="text" className={styles.input} value={settings.bankAlias || ''}
                    onChange={e => setSettings({ ...settings, bankAlias: e.target.value })} />
                </div>
              </div>
            </div>

            {/* Save button spanning full width */}
            <div style={{ gridColumn: '1 / -1' }}>
              <button
                className="btn-primary"
                onClick={() => saveSettings(settings)}
                disabled={settingsLoading}
                style={{ minWidth: '220px' }}
              >
                {settingsLoading ? 'Guardando…' : 'Guardar Configuración'}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════
            TAB: GALERÍA
            ═══════════════════════════ */}
        {activeTab === 'gallery' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderLeft}>
                <h3 className={styles.cardTitle}>Galería de Fotos</h3>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {galleryArray.length} fotos
              </span>
            </div>
            <div className={styles.cardBody}>
              <div style={{ marginBottom: '1.25rem' }}>
                <ImageDropzone 
                  aspectRatio="free" 
                  onUploadComplete={uploadGalleryImage}
                  label="Subir foto a la Galería"
                />
              </div>
              <div className={styles.galleryInputRow}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="O pega aquí la URL de la imagen…"
                  value={newGalleryUrl}
                  onChange={e => setNewGalleryUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addGalleryImage())}
                />
                <button className="btn-primary" onClick={addGalleryImage} style={{ padding: '0 1.5rem', flexShrink: 0 }}>
                  Añadir
                </button>
              </div>

              <div className={styles.galleryGrid}>
                {galleryArray.map((img, i) => (
                  <div key={i} className={styles.galleryItem}>
                    <img src={img} alt={`Foto ${i + 1}`} />
                    <div className={styles.galleryOverlay}>
                      <button className={styles.btnDeleteIcon} onClick={() => removeGalleryImage(i)} title="Eliminar foto">
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                {galleryArray.length === 0 && (
                  <p className={styles.galleryEmpty}>
                    No hay fotos todavía. ¡Añade algunas pegando URLs arriba!
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Gift Modal ── */}
      {isModalOpen && editingGift && (
        <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{editingGift.id ? 'Editar Regalo' : 'Nuevo Regalo'}</h2>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveGift}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Título *</label>
                  <input type="text" className={styles.input} required
                    value={editingGift.title || ''}
                    onChange={e => setEditingGift({ ...editingGift, title: e.target.value })} />
                </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Precio (Gs.) *</label>
                    <input type="number" className={styles.input} required
                      value={editingGift.price ?? ''}
                      onChange={e => setEditingGift({ ...editingGift, price: e.target.value === '' ? 0 : Number(e.target.value) })} />
                  </div>
                <div className={styles.inputRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Stock *</label>
                    <input type="number" className={styles.input} required min="1"
                      value={editingGift.stock ?? ''}
                      onChange={e => setEditingGift({ ...editingGift, stock: e.target.value === '' ? 0 : Number(e.target.value) })} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Visible en lista</label>
                    <select className={styles.input}
                      value={editingGift.isVisible ? 'true' : 'false'}
                      onChange={e => setEditingGift({ ...editingGift, isVisible: e.target.value === 'true' })}>
                      <option value="true">Sí — Visible</option>
                      <option value="false">No — Ocultar</option>
                    </select>
                  </div>
                </div>
                <div className={styles.inputRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Regalados (confirmados)</label>
                    <input type="number" className={styles.input} min="0"
                      value={editingGift.timesGifted ?? ''}
                      onChange={e => setEditingGift({ ...editingGift, timesGifted: e.target.value === '' ? 0 : Number(e.target.value) })} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Pendientes de confirmar</label>
                    <input type="number" className={styles.input} min="0"
                      value={editingGift.timesPending ?? ''}
                      onChange={e => setEditingGift({ ...editingGift, timesPending: e.target.value === '' ? 0 : Number(e.target.value) })} />
                  </div>
                </div>
                <div className={styles.formGroup} style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
                  <label className={styles.label}>Imagen del Regalo - Aspecto 4:3</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginTop: '0.25rem' }}>
                    <ImageDropzone 
                      aspectRatio="free" 
                      onUploadComplete={(url) => setEditingGift({ ...editingGift, image_url: url })} 
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 'fit-content' }}>Enlace actual:</span>
                      <input type="text" className={styles.input}
                        value={editingGift.image_url || ''}
                        onChange={e => setEditingGift({ ...editingGift, image_url: e.target.value })}
                        placeholder="https://..." style={{ fontSize: '0.8rem', padding: '6px 10px' }} />
                    </div>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Descripción</label>
                  <textarea className={styles.input} rows={3}
                    value={editingGift.description || ''}
                    onChange={e => setEditingGift({ ...editingGift, description: e.target.value })} />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnGhost} onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={modalLoading}>
                  {modalLoading ? 'Guardando…' : 'Guardar Regalo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
