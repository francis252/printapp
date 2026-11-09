import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const statusColor = {
  'Quote': 'bg-gray-100 text-gray-600',
  'Awaiting Approval': 'bg-yellow-100 text-yellow-700',
  'Approved': 'bg-green-100 text-green-700',
  'In Production': 'bg-blue-100 text-blue-700',
  'Ready': 'bg-purple-100 text-purple-700',
  'Delivered': 'bg-teal-100 text-teal-700',
  'Cancelled': 'bg-red-100 text-red-600',
};

const ALL_STATUSES = ['All', 'Quote', 'Awaiting Approval', 'Approved', 'In Production', 'Ready', 'Delivered', 'Cancelled'];

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    base44.entities.Job.list('-created_date', 200).then(data => {
      setJobs(data);
      setLoading(false);
    });
  }, []);

  const filtered = jobs.filter(j => {
    const matchSearch = !search || 
      j.title?.toLowerCase().includes(search.toLowerCase()) ||
      j.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      j.job_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || j.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Jobs</h1>
          <p className="text-sm text-muted-foreground">{jobs.length} total jobs</p>
        </div>
        <Link to="/jobs/new">
          <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
            <Plus className="w-4 h-4" />
            New Job
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs, customers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {ALL_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                statusFilter === s
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-muted-foreground border-border hover:border-primary hover:text-primary'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Job #</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Job Title</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due Date</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Loading jobs...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">
                {jobs.length === 0 ? 'No jobs yet. Create your first job!' : 'No jobs match your filters.'}
              </td></tr>
            ) : (
              filtered.map(job => (
                <tr key={job.id} className="hover:bg-muted/20 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <Link to={`/jobs/${job.id}`} className="text-primary font-medium hover:underline">
                      {job.job_number || `#${job.id?.slice(-5)?.toUpperCase()}`}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/jobs/${job.id}`} className="font-medium text-foreground hover:text-primary">
                      {job.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{job.customer_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{job.job_type || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[job.status] || 'bg-gray-100 text-gray-600'}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {job.due_date ? new Date(job.due_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">
                    ${(job.total_amount || 0).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}