import EditPostClient from './EditPostClient';

export function generateStaticParams() {
  return [];
}

export default async function EditPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <EditPostClient slug={slug} />;
}
