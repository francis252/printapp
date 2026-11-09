const colors = {
  'Open': 'bg-slate-100 text-slate-600',
  'Awaiting Approval': 'bg-yellow-100 text-yellow-700',
  'Approved': 'bg-green-100 text-green-700',
  'Rejected': 'bg-red-100 text-red-600',
  'Expired': 'bg-orange-100 text-orange-600',
  'Closed': 'bg-blue-100 text-blue-700',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}