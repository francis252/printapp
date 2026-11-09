import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Briefcase, DollarSign, Clock, CheckCircle, TrendingUp, ArrowRight } from 'lucide-react';

const statusColor = {
  'Quote': 'bg-gray-100 text-gray-700',
  'Awaiting Approval': 'bg-yellow-100 text-yellow-700',
  'Approved': 'bg-green-100 text-green-700',
  'In Production': 'bg-blue-100 text-blue-700',
  'Ready': 'bg-purple-100 text-purple-700',
  'Delivered': 'bg-teal-100 text-teal-700',
  'Cancelled': 'bg-red-100 text-red-700',
};

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Job.list('-created_date', 100).then(data => {
      setJobs(data);
      setLoading(false);
    });
  }, []);

  const totalRevenue = jobs.filter(j => j.status !== 'Cancelled').reduce((s, j) => s + (j.total_amount || 0), 0);
  const pendingApproval = jobs.filter(j => j.status === 'Awaiting Approval').length;
  const inProduction = jobs.filter(j => j.status === 'In Production').length;
  const delivered = jobs.filter(j => j.status === 'Delivered').length;
  const recent = jobs.slice(0, 8);

  const stats = [
    { label: 'Total Jobs', value: jobs.length, icon: Briefcase, color: 'bg-cyan-500' },
    { label: 'Revenue', value: `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'bg-green-500' },
    { label: 'Awaiting Approval', value: pendingApproval, icon: Clock, color: 'bg-yellow-500' },
    { label: 'Delivered', value: delivered, icon: CheckCircle, color: 'bg-teal-500' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome back! Here's what's happening.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-lg border p-4 flex items-center gap-4">
            <div className={`${color} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold text-foreground">{loading ? '...' : value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-lg border">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Recent Jobs
          </h2>
          <Link to="/jobs" className="text-primary text-sm font-medium flex items-center gap-1 hover:underline">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
          ) : recent.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No jobs yet. <Link to="/jobs" className="text-primary hover:underline">Create your first job →</Link></div>
          ) : (
            recent.map(job => (
              <Link key={job.id} to={`/jobs/${job.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{job.title}</p>
                  <p className="text-xs text-muted-foreground">{job.customer_name} · {job.job_number || `#${job.id?.slice(-5)}`}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[job.status] || 'bg-gray-100 text-gray-600'}`}>
                  {job.status}
                </span>
                <span className="text-sm font-semibold text-foreground w-20 text-right">
                  ${(job.total_amount || 0).toFixed(2)}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}