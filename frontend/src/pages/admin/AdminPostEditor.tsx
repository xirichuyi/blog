import { useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import SimplePostEditor from '@/components/admin/SimplePostEditor';

export default function AdminPostEditor() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();

  // 判断是新建还是编辑模式
  const mode = location.pathname.includes('/new') ? 'new' : 'edit';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <SimplePostEditor mode={mode} />
    </motion.div>
  );
}
