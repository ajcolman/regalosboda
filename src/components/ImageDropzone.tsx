'use client';

import { useState, useRef } from 'react';
import ImageEditor from './ImageEditor';

interface ImageDropzoneProps {
  aspectRatio: 'circle' | '16:9' | 'free';
  onUploadComplete: (url: string) => void;
  label?: string;
  className?: string;
}

export default function ImageDropzone({ aspectRatio, onUploadComplete, label, className }: ImageDropzoneProps) {
  const [editorImage, setEditorImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [tempFilename, setTempFilename] = useState('image.webp');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Procesar archivo seleccionado
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido.');
      return;
    }
    
    // Generar nombre descriptivo
    const extension = file.name.split('.').pop() || 'webp';
    const cleanName = file.name
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    setTempFilename(`${cleanName}_${Date.now()}.${extension}`);

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setEditorImage(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Enviar el blob recortado a nuestro endpoint de carga
  const handleCroppedImage = async (blob: Blob) => {
    setEditorImage(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/upload?filename=${encodeURIComponent(tempFilename)}`, {
        method: 'POST',
        headers: {
          'Content-Type': blob.type,
        },
        body: blob,
      });

      if (!response.ok) {
        throw new Error('Error al subir imagen');
      }

      const data = await response.json();
      onUploadComplete(data.url);
    } catch (error) {
      console.error('Error uploading cropped image:', error);
      alert('Ocurrió un error al subir la imagen. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      {label && <label style={styles.label}>{label}</label>}
      
      <div
        onClick={handleClick}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        style={{
          ...styles.dropzone,
          borderColor: isDragActive ? 'var(--primary, #db2777)' : '#d1d5db',
          backgroundColor: isDragActive ? 'rgba(219, 39, 119, 0.04)' : '#fafafa',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />

        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <span style={styles.loadingText}>Subiendo e indexando imagen...</span>
          </div>
        ) : (
          <div style={styles.content}>
            <svg style={styles.uploadIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p style={styles.text}>
              <strong>Sube un archivo</strong> o arrástralo aquí
            </p>
            <p style={styles.subtext}>
              Formatos aceptados: PNG, JPG, WEBP.
            </p>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {editorImage && (
        <ImageEditor
          imageSrc={editorImage}
          aspectRatio={aspectRatio}
          onCrop={handleCroppedImage}
          onCancel={() => setEditorImage(null)}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.35rem',
  },
  label: {
    fontSize: '0.78rem',
    fontWeight: 700,
    color: 'var(--text-muted, #6b7280)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.6px',
  },
  dropzone: {
    border: '2px dashed #d1d5db',
    borderRadius: '10px',
    padding: '1.25rem',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'all 0.15s ease-in-out',
    minHeight: '110px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.25rem',
  },
  uploadIcon: {
    width: '28px',
    height: '28px',
    color: '#9ca3af',
  },
  text: {
    margin: 0,
    fontSize: '0.85rem',
    color: '#4b5563',
  },
  subtext: {
    margin: 0,
    fontSize: '0.75rem',
    color: '#9ca3af',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.5rem',
  },
  loadingText: {
    fontSize: '0.8rem',
    color: '#4b5563',
    fontWeight: 500,
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '2.5px solid #e5e7eb',
    borderTopColor: 'var(--primary, #db2777)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};
