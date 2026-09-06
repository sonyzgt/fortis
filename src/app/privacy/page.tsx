import { redirect } from 'next/navigation';

export default function PrivacyPage() {
  redirect('/docs?tab=privacy');
}
