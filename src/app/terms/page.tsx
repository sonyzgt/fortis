import { redirect } from 'next/navigation';

export default function TermsPage() {
  redirect('/docs?tab=terms');
}
