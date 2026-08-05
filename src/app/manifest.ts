import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Melissa & Julio — Lista de Regalos',
    short_name: 'Melissa & Julio',
    description: 'Lista de regalos de la boda de Melissa & Julio',
    // Arranca en la portada: los invitados tambien pueden instalar el sitio.
    // Al tocar una notificacion el service worker abre /admin directamente.
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FAF9F6',
    theme_color: '#8C6A46',
    lang: 'es',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
