'use client';

import { useState } from 'react';
import styles from './home.module.css';

export default function GalleryClient({ images }: { images: string[] }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const close = () => setSelectedIndex(null);
  
  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex + 1) % images.length);
    }
  };
  
  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex - 1 + images.length) % images.length);
    }
  };

  return (
    <>
      <div className={styles.galleryGrid}>
        {images.map((imgUrl, idx) => (
          <div 
            key={idx} 
            className={styles.galleryImageContainer} 
            onClick={() => setSelectedIndex(idx)} 
            style={{ cursor: 'pointer' }}
          >
            <img src={imgUrl} alt={`Gallery ${idx}`} className={styles.galleryImage} />
          </div>
        ))}
      </div>

      {selectedIndex !== null && (
        <div className={styles.lightbox} onClick={close}>
          <button className={styles.lightboxClose} onClick={close}>&times;</button>
          
          <button className={styles.lightboxPrev} onClick={prev}>&#10094;</button>
          
          <img 
            src={images[selectedIndex]} 
            alt="Gallery Fullscreen" 
            className={styles.lightboxImg} 
            onClick={(e) => e.stopPropagation()} 
          />
          
          <button className={styles.lightboxNext} onClick={next}>&#10095;</button>
        </div>
      )}
    </>
  );
}
