import Layout from '../components/Layout';
import ProfileForm from '../components/forms/ProfileForm';
import SubscriptionStatus from '../components/SubscriptionStatus';
import { useAuth } from '../contexts/AuthProvider';

export default function TeacherProfile() {
  const { user } = useAuth();
  const userId = user?.id || null;

  return (
    <Layout>
      <div className="w-[95%] max-w-[1400px] mx-auto mt-4 pb-20 space-y-6">
        <div className="max-w-xl">
          <SubscriptionStatus />
        </div>
        {userId && <ProfileForm userId={userId} />}
      </div>
    </Layout>
  );
}
