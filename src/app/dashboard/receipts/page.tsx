import { redirect } from 'next/navigation';

// Receipts moved into the Billing page (/dashboard/billing#receipts).
// Keep this route alive to avoid broken bookmarks.
export default function ReceiptsRedirect() {
  redirect('/dashboard/billing');
}
