import Layout from '../components/Layout';
import ScheduleForm from '../components/forms/ScheduleForm';
import { useAuth } from '../contexts/AuthProvider';

export default function WeeklyMenuSchedule() {
  const { user } = useAuth();
  const userId = user?.id || null;

  return (
    <Layout>
      <div className="w-[95%] max-w-[1400px] mx-auto z-10 relative space-y-6 pb-10 px-4 mt-6">
        {userId && <ScheduleForm userId={userId} />}
      </div>
    </Layout>
  );
}
