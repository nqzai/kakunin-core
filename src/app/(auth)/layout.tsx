import type { Metadata } from 'next';
import '../landing.css'; // font imports + CSS vars
import './auth.css';

export const metadata: Metadata = {
  robots: { index: false, follow: false }, // auth pages not indexed
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
