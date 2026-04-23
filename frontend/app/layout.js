import './globals.css'
import Toaster from '../components/Toaster'
import ClientLayoutWrapper from '../components/ClientLayoutWrapper'

export const metadata = {
  title: 'CAI2RUS — Business OS',
  description: 'CRM · Operations · Finance — Powered by CAI2RUS System Integrator',
}

// Runs before React hydrates: applies saved theme AND locale (RTL/font) instantly.
const initScript = `(function(){
  try {
    // Theme
    var t = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.classList.add('no-transition');
    setTimeout(function(){ document.documentElement.classList.remove('no-transition'); }, 1);
    // Locale / RTL
    var loc = localStorage.getItem('locale');
    if (!loc) {
      var m = document.cookie.match(/(?:^|;\\s*)locale=([^;]*)/);
      loc = m ? m[1] : 'en';
    }
    if (loc === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
      document.documentElement.classList.add('font-arabic');
    }
  } catch(e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();`

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: initScript }} />
        <ClientLayoutWrapper>
          {children}
        </ClientLayoutWrapper>
        <Toaster />
      </body>
    </html>
  )
}
