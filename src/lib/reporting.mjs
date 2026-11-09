export const money = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value)||0);
export function csvCell(value) {
  let text=String(value??'');
  // Spreadsheet formula injection: customer-controlled strings must remain literal.
  if (/^[\s]*[=+@-]/.test(text)) text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
}
export function makeCsv(columns,rows) {
  return '\uFEFF'+[columns.map(c=>csvCell(c.label)).join(','),...rows.map(r=>columns.map(c=>csvCell(r[c.key])).join(','))].join('\r\n');
}
export function inDateRange(record,start,end,field='created_date') {
  const value=record[field];
  if(!start&&!end)return true;
  if(!value)return false;
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))return false;
  // Date boundaries use the shop's Chicago calendar day, including DST.
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
  return (!start||day>=start)&&(!end||day<=end);
}
export function outstanding(invoice) {
  if(['Void','Draft'].includes(invoice.status))return 0;
  return Math.max(0,(Number(invoice.amount)||0)-(Number(invoice.paid)||0));
}
export function agingBand(dueDate,today) {
  if(!dueDate)return 'No due date';
  const days=Math.floor((Date.parse(today+'T00:00:00Z')-Date.parse(dueDate+'T00:00:00Z'))/86400000);
  return days<=0?'Current':days<=30?'1–30 days':days<=60?'31–60 days':days<=90?'61–90 days':'90+ days';
}
