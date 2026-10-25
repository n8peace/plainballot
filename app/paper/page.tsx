import { redirect } from 'next/navigation';

// The newspaper edition was previewed here; it's now the home page.
export default function PaperPage() {
  redirect('/');
}
