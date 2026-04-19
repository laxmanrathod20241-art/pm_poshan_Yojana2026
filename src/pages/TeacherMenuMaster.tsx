import { useAuth } from '../contexts/AuthProvider';
import Layout from '../components/Layout';
import MenuMasterForm from '../components/forms/MenuMasterForm';

export default function TeacherMenuMaster() {
  const { user } = useAuth();
  const userId = user?.id || null;

  return (
    <Layout>
      <div className="w-[95%] max-w-[1400px] mx-auto z-10 relative mt-6">
        {userId && <MenuMasterForm userId={userId} />}
      </div>
    </Layout>
  );
}
