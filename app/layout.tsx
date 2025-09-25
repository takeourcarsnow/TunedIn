import type { Metadata } from 'next';
import './styles/globals.css';

export const metadata: Metadata = {
  title: 'TunedIn - Post Less. Feel More.',
  themeColor: '#0b0d10',
  description: 'Post Less. Feel More.',
  openGraph: {
    images: [{ url: '/assets/logo.png' }]
  },
  icons: {
    icon: [
      { url: '/assets/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/assets/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/assets/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/assets/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [{ url: '/assets/apple-touch-icon.png', sizes: '180x180' }],
    shortcut: '/favicon.ico'
  },
  manifest: '/site.webmanifest'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="twitter:image" content="https://TunedIn.space/assets/logo.png" />
        <style>{`.announcement-bar{display:none!important;}`}</style>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(!localStorage.getItem('announcementDismissed')){document.addEventListener('DOMContentLoaded',function(){var ann=document.getElementById('announcement-bar');if(ann) ann.style.display='';});}}catch(e){}`
          }}
        />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="preconnect" href="https://img.youtube.com" />
        <link rel="preconnect" href="https://i.scdn.co" />
        <link rel="preconnect" href="https://soundcloud.com" />
      </head>
      <body>
        <a className="sr-only" href="#app">Skip to content</a>
        {children}
        <noscript>
          <div className="notice warn">This app requires JavaScript.</div>
        </noscript>
      </body>
    </html>
  );
}
