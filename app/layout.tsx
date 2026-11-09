import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mora Estate | A slower kind of stay',
  description:
    'Find your quiet in the coffee hills of Chikkamagaluru. Rooms, suites and private villas, booked directly.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
