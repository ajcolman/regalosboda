'use client';

import { useState, useRef, useEffect } from 'react';

interface ImageEditorProps {
  imageSrc: string;
  aspectRatio: 'circle' | '16:9' | 'free';
  onCrop: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

export default function ImageEditor({ imageSrc, aspectRatio, onCrop, onCancel }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  // Dimensiones del visor de edición (viewport)
  const VIEWPORT_WIDTH = 450;
  const VIEWPORT_HEIGHT = 350;

  // Cargar la imagen cuando cambie el src
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Evitar problemas de CORS si vienen de URLs externas
    img.src = imageSrc;
    img.onload = () => {
      setImage(img);
      // Resetear zoom y posición
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
  }, [imageSrc]);

  // Redibujar el canvas cuando cambie el estado
  useEffect(() => {
    if (!canvasRef.current || !image) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Limpiar canvas
    ctx.clearRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    // Guardar contexto para dibujar la imagen base
    ctx.save();

    // Encontrar dimensiones iniciales de la imagen para que encaje centrada
    const imgRatio = image.width / image.height;
    const viewRatio = VIEWPORT_WIDTH / VIEWPORT_HEIGHT;
    
    let drawWidth = VIEWPORT_WIDTH;
    let drawHeight = VIEWPORT_HEIGHT;

    if (imgRatio > viewRatio) {
      drawHeight = VIEWPORT_WIDTH / imgRatio;
    } else {
      drawWidth = VIEWPORT_HEIGHT * imgRatio;
    }

    // Centrar por defecto
    const centerX = VIEWPORT_WIDTH / 2;
    const centerY = VIEWPORT_HEIGHT / 2;

    // Aplicar transformaciones: traslación al centro, zoom, desplazamiento del usuario
    ctx.translate(centerX + offset.x, centerY + offset.y);
    ctx.scale(zoom, zoom);
    
    // Dibujar imagen centrada en el origen transformado
    ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    // Dibujar la máscara de recorte y el overlay semi-transparente
    drawOverlay(ctx);

  }, [image, zoom, offset]);

  // Dibujar el overlay oscuro con la "ventana" clara de recorte
  const drawOverlay = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';

    // Definir la caja de recorte según la relación de aspecto
    const cropBox = getCropBoxDimensions();

    // Dibujar máscara exterior usando path "evenodd"
    ctx.beginPath();
    ctx.rect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    if (aspectRatio === 'circle') {
      ctx.arc(VIEWPORT_WIDTH / 2, VIEWPORT_HEIGHT / 2, cropBox.width / 2, 0, Math.PI * 2, true);
    } else {
      ctx.rect(
        VIEWPORT_WIDTH / 2 - cropBox.width / 2,
        VIEWPORT_HEIGHT / 2 - cropBox.height / 2,
        cropBox.width,
        cropBox.height
      );
    }
    
    ctx.closePath();
    ctx.fill('evenodd');

    // Dibujar contorno de la caja de recorte
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]); // Línea punteada elegante
    ctx.beginPath();
    
    if (aspectRatio === 'circle') {
      ctx.arc(VIEWPORT_WIDTH / 2, VIEWPORT_HEIGHT / 2, cropBox.width / 2, 0, Math.PI * 2);
    } else {
      ctx.rect(
        VIEWPORT_WIDTH / 2 - cropBox.width / 2,
        VIEWPORT_HEIGHT / 2 - cropBox.height / 2,
        cropBox.width,
        cropBox.height
      );
    }
    ctx.stroke();
  };

  // Obtener dimensiones de la caja de recorte en el visor
  const getCropBoxDimensions = () => {
    if (aspectRatio === 'circle') {
      return { width: 220, height: 220 };
    } else if (aspectRatio === '16:9') {
      return { width: 360, height: 202.5 }; // 16:9 escalado
    } else {
      return { width: 280, height: 210 }; // 4:3 para regalos por defecto
    }
  };

  // Manejo de eventos de mouse y touch para arrastrar (pan)
  const handleStartDrag = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handleDrag = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setOffset({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  };

  const handleEndDrag = () => {
    setIsDragging(false);
  };

  // Generar la imagen final recortada
  const handleConfirm = () => {
    if (!image) return;

    // Obtener las dimensiones del destino final
    let targetWidth = 800;
    let targetHeight = 800;

    if (aspectRatio === '16:9') {
      targetWidth = 1200;
      targetHeight = 675;
    } else if (aspectRatio === 'free') {
      targetWidth = 800;
      targetHeight = 600;
    }

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = targetWidth;
    exportCanvas.height = targetHeight;
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    // Calcular las transformaciones relativas basadas en el visor
    const cropBox = getCropBoxDimensions();
    
    // Relación entre las dimensiones del canvas de exportación y la caja de recorte
    const scaleFactor = targetWidth / cropBox.width;

    exportCtx.fillStyle = '#ffffff';
    exportCtx.fillRect(0, 0, targetWidth, targetHeight);

    // Dibujar la imagen recortada aplicando la misma escala y offsets
    exportCtx.save();
    
    // Mover origen al centro del canvas de exportación
    exportCtx.translate(targetWidth / 2, targetHeight / 2);
    
    // Aplicar la escala combinada del zoom del usuario y el factor de exportación
    exportCtx.scale(zoom * scaleFactor, zoom * scaleFactor);

    // Calcular dimensiones bases
    const imgRatio = image.width / image.height;
    const viewRatio = VIEWPORT_WIDTH / VIEWPORT_HEIGHT;
    
    let drawWidth = VIEWPORT_WIDTH;
    let drawHeight = VIEWPORT_HEIGHT;

    if (imgRatio > viewRatio) {
      drawHeight = VIEWPORT_WIDTH / imgRatio;
    } else {
      drawWidth = VIEWPORT_HEIGHT * imgRatio;
    }

    // Dibujar aplicando el offset relativo a la escala del canvas
    exportCtx.drawImage(
      image,
      (-drawWidth / 2) + (offset.x / zoom),
      (-drawHeight / 2) + (offset.y / zoom),
      drawWidth,
      drawHeight
    );
    exportCtx.restore();

    // Convertir a blob comprimido WebP (o JPEG si no es soportado) de calidad 82%
    exportCanvas.toBlob(
      (blob) => {
        if (blob) {
          onCrop(blob);
        }
      },
      'image/webp',
      0.82
    );
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h3 style={styles.title}>Ajustar y Recortar Imagen</h3>
        <p style={styles.subtitle}>Arrastra para posicionar y usa la barra inferior para hacer zoom.</p>
        
        <div 
          style={styles.canvasContainer}
          onMouseDown={(e) => handleStartDrag(e.clientX, e.clientY)}
          onMouseMove={(e) => handleDrag(e.clientX, e.clientY)}
          onMouseUp={handleEndDrag}
          onMouseLeave={handleEndDrag}
          onTouchStart={(e) => {
            if (e.touches[0]) {
              handleStartDrag(e.touches[0].clientX, e.touches[0].clientY);
            }
          }}
          onTouchMove={(e) => {
            if (e.touches[0]) {
              handleDrag(e.touches[0].clientX, e.touches[0].clientY);
            }
          }}
          onTouchEnd={handleEndDrag}
        >
          <canvas
            ref={canvasRef}
            width={VIEWPORT_WIDTH}
            height={VIEWPORT_HEIGHT}
            style={styles.canvas}
          />
        </div>

        <div style={styles.controls}>
          <div style={styles.zoomControl}>
            <span style={styles.icon}>🔍-</span>
            <input
              type="range"
              min="0.5"
              max="4"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              style={styles.slider}
            />
            <span style={styles.icon}>🔍+</span>
          </div>

          <div style={styles.actions}>
            <button type="button" onClick={onCancel} style={styles.btnCancel}>
              Cancelar
            </button>
            <button type="button" onClick={handleConfirm} style={styles.btnConfirm}>
              Confirmar Recorte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Estilos CSS-in-JS para evitar dependencias CSS externas y asegurar consistencia
const styles = {
  modalOverlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    padding: '1rem',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '1.5rem',
    width: '100%',
    maxWidth: '490px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  title: {
    margin: '0 0 0.25rem 0',
    fontFamily: 'inherit',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#111827',
  },
  subtitle: {
    margin: '0 0 1.25rem 0',
    fontSize: '0.875rem',
    color: '#6b7280',
    textAlign: 'center' as const,
  },
  canvasContainer: {
    position: 'relative' as const,
    width: '100%',
    maxWidth: '450px',
    height: '350px',
    backgroundColor: '#1f2937',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'move',
    boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    touchAction: 'none', // Previene el scroll por defecto en móviles al arrastrar
  },
  canvas: {
    display: 'block',
    width: '100%',
    height: '100%',
  },
  controls: {
    width: '100%',
    marginTop: '1.25rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  zoomControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    width: '100%',
  },
  icon: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#4b5563',
    userSelect: 'none' as const,
  },
  slider: {
    flex: 1,
    height: '6px',
    borderRadius: '3px',
    backgroundColor: '#e5e7eb',
    outline: 'none',
    cursor: 'pointer',
    accentColor: 'var(--primary)',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    width: '100%',
    justifyContent: 'flex-end',
  },
  btnCancel: {
    padding: '0.625rem 1.25rem',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  btnConfirm: {
    padding: '0.625rem 1.25rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'var(--primary, #db2777)',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
    boxShadow: '0 4px 6px -1px rgba(219, 39, 119, 0.2)',
    transition: 'all 0.15s ease',
  },
};
