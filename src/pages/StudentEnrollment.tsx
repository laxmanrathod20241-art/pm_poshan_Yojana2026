import Layout from '../components/Layout';
import EnrollmentForm from '../components/forms/EnrollmentForm';
import { useAuth } from '../contexts/AuthProvider';

export default function StudentEnrollment() {
  const { user } = useAuth();
  const userId = user?.id || null;

  return (
    <Layout>
      <div className="w-[95%] max-w-[1400px] mx-auto z-10 relative pb-20 mt-6">
        {userId && <EnrollmentForm userId={userId} />}
      </div>
    </Layout>
  );
}
