import EditPostClient from './EditPostClient';

export function generateStaticParams() {
  return [];
}

export default function EditPost({ params }: { params: { slug: string } }) {
  return <EditPostClient slug={params.slug} />;
}
