import { useParams } from 'react-router-dom';
import PostEditor from '../../components/admin/PostEditor';

export default function AdminPostEditor() {
  const { slug } = useParams();
  const mode = slug === 'new' ? 'new' : 'edit';

  return <PostEditor mode={mode} />;
}
