import { Calendar } from 'lucide-react';

export default function Schedule() {
  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Schedule</h1>
      </div>
      <div className="bg-card rounded-lg border p-12 text-center text-muted-foreground">
        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-lg font-medium">Schedule coming soon</p>
        <p className="text-sm mt-1">View and manage your production schedule here.</p>
      </div>
    </div>
  );
}