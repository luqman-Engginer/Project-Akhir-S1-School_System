import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminKelasMapelRingkasanRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/admin/kelas/${id}/ringkasan`);
}
