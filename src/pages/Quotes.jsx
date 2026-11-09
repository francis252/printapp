import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { FileText, Clock, CheckCircle, XCircle, Send } from 'lucide-react';

const statusColor = {
  'Quote': 'bg-gray-100 text-gray-600',
  'Awaiting Approval': 'bg-yellow-100 text-yellow-700',
  'Approved': 'bg-green-100 text-green-700',
  'Rejected': 'bg-red-100 text-red-600',
};

export default function Quotes() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Job.list('-created_date', 200).then(data => {
      setJobs(data.filter(j => ['Quote', 'Awaiting Approval', 'Approved'].includes(j.status)));
      setLoading(false);
    });
  }, []);

  const quoteStats = [
    { label: 'Draft Quotes', value: jobs.filter(j => j.status === 'Quote').length, icon: FileText, color: 'bg-gray-400' },
    { label: 'Awaiting Approval', value: jobs.filter(j => j.status === 'Awaiting Approval').length, icon: Clock, color: 'bg-yellow-500' },
    { label: 'Approved', value: jobs.filter(j => j.status === 'Approved').length, icon: CheckCircle, color: 'bg-green-500' },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quotes</h1>
          <p className="text-sm text-muted-foreground">Track all your quotes and approvals</p>
        </div>
        <Link to="/jobs/new">
          <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <Send className="w-4 h-4" /> New Quote
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {quoteStats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-lg border p-4 flex items-center gap-4">
            <div className={`${color} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold">{loading ? '...' : value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-foreground">All Quotes</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Job</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sent</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
            ) : jobs.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No quotes yet. Create a job and send a quote!</td></tr>
            ) : (
              jobs.map(job => (
                <tr key={job.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/jobs/${job.id}`} className="font-medium text-foreground hover:text-primary">
                      {job.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{job.job_number}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{job.customer_name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[job.status] || 'bg-gray-100'}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {job.approved_at ? `Approved ${new Date(job.approved_at).toLocaleDateString()}` :
                     job.rejected_at ? `Rejected ${new Date(job.rejected_at).toLocaleDateString()}` :
                     job.approval_token ? 'Sent, pending...' : 'Not sent yet'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">${(job.total_amount || 0).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}