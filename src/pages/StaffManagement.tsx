import Layout from '../components/Layout';
import StaffForm from '../components/forms/StaffForm';
import { useAuth } from '../contexts/AuthProvider';

export default function StaffManagement() {
  const { user } = useAuth();
  const userId = user?.id || null;

  return (
    <Layout>
      <div className="w-[95%] max-w-[1400px] mx-auto mt-4 pb-20">
        {userId && <StaffForm userId={userId} />}
      </div>
    </Layout>
  );
}


