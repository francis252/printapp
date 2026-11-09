import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart2, Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';
import SalesReport from '@/components/reporting/SalesReport';
import TaxReport from '@/components/reporting/TaxReport';

const REPORT_TYPES = ['Sales Summary', 'Tax Report'];

export default function Reporting() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('Sales Summary');

  // Date range
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfMonth(new Date()));

  // Filters
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedRep, setSelectedRep] = useState('');

  useEffect(() => {
    base44.entities.Quote.list('-created_date', 500).then(data => {
      setQuotes(data || []);
      setLoading(false);
    });
  }, []);

  const setQuickRange = (range) => {
    const now = new Date();
    if (range === 'this_month') {
      setStartDate(startOfMonth(now));
      setEndDate(endOfMonth(now));
    } else if (range === 'last_month') {
      const last = subMonths(now, 1);
      setStartDate(startOfMonth(last));
      setEndDate(endOfMonth(last));
    } else if (range === 'ytd') {
      setStartDate(startOfYear(now));
      setEndDate(now);
    } else if (range === 'all') {
      setStartDate(null);
      setEndDate(null);
    }
  };

  // Derive unique companies and reps
  const companies = [...new Set(quotes.map(q => q.company_name || q.customer_name).filter(Boolean))].sort();
  const reps = [...new Set(quotes.map(q => q.sales_rep).filter(Boolean))].sort();

  // Filtered quotes
  const filtered = quotes.filter(q => {
    if (startDate) {
      const d = new Date(q.created_date);
      if (d < startDate) return false;
    }
    if (endDate) {
      const d = new Date(q.created_date);
      const end = new Date(endDate); end.setHours(23, 59, 59);
      if (d > end) return false;
    }
    if (selectedCompany && (q.company_name || q.customer_name) !== selectedCompany) return false;
    if (selectedRep && q.sales_rep !== selectedRep) return false;
    return true;
  });

  const fmt = (d) => d ? format(d, 'MMM d, yyyy') : 'All time';

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-5">
        <BarChart2 className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Reporting</h1>
      </div>

      {/* Filters Bar */}
      <div className="bg-card border rounded-lg p-4 mb-5 flex flex-wrap gap-3 items-end">
        {/* Quick Range Buttons */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick Range</span>
          <div className="flex gap-1.5">
            {[['this_month', 'This Month'], ['last_month', 'Last Month'], ['ytd', 'Year to Date'], ['all', 'All Time']].map(([key, label]) => (
              <Button key={key} variant="outline" size="sm" onClick={() => setQuickRange(key)} className="text-xs h-8">
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Start Date */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">From</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 min-w-32">
                <CalendarIcon className="w-3.5 h-3.5" />
                {startDate ? format(startDate, 'MMM d, yyyy') : 'Start'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={startDate} onSelect={setStartDate} captionLayout="dropdown" fromYear={2020} toYear={2035} initialFocus />
            </PopoverContent>
          </Popover>
        </div>

        {/* End Date */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">To</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 min-w-32">
                <CalendarIcon className="w-3.5 h-3.5" />
                {endDate ? format(endDate, 'MMM d, yyyy') : 'End'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={endDate} onSelect={setEndDate} captionLayout="dropdown" fromYear={2020} toYear={2035} initialFocus />
            </PopoverContent>
          </Popover>
        </div>

        {/* Company Filter */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Company</span>
          <select
            value={selectedCompany}
            onChange={e => setSelectedCompany(e.target.value)}
            className="h-8 text-xs border rounded-md px-2 bg-background text-foreground min-w-36"
          >
            <option value="">All Companies</option>
            {companies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Sales Rep Filter */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sales Rep</span>
          <select
            value={selectedRep}
            onChange={e => setSelectedRep(e.target.value)}
            className="h-8 text-xs border rounded-md px-2 bg-background text-foreground min-w-32"
          >
            <option value="">All Reps</option>
            {reps.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Report Type */}
        <div className="flex flex-col gap-1 ml-auto">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Report</span>
          <div className="flex gap-1.5">
            {REPORT_TYPES.map(t => (
              <Button
                key={t}
                size="sm"
                variant={reportType === t ? 'default' : 'outline'}
                className="text-xs h-8"
                onClick={() => setReportType(t)}
              >
                {t}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Range label */}
      <div className="text-xs text-muted-foreground mb-4">
        Showing: <strong>{fmt(startDate)}</strong> → <strong>{fmt(endDate)}</strong>
        {selectedCompany && <> · <strong>{selectedCompany}</strong></>}
        {selectedRep && <> · Rep: <strong>{selectedRep}</strong></>}
        <> · <strong>{filtered.length}</strong> quotes</>
      </div>

      {loading ? (
        <div className="bg-card border rounded-lg p-12 text-center text-muted-foreground">Loading...</div>
      ) : reportType === 'Sales Summary' ? (
        <SalesReport quotes={filtered} />
      ) : (
        <TaxReport quotes={filtered} />
      )}
    </div>
  );
}