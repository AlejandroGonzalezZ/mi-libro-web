import './globals.css';
 
export const metadata = {
  title: 'El Eje del Olvido',
  description: 'Una historia interactiva de ciencia ficción.',
};
 
export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
