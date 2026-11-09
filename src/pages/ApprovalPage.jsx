import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function ApprovalPage() {
  const { jobId, token, action } = useParams();
  const [state, setState] = useState('loading'); // loading | success | error | already_done
  const [job, setJob] = useState(null);

  useEffect(() => {
    const process = async () => {
      const [foundJob] = await base44.entities.Job.filter({ id: jobId });
      if (!foundJob) { setState('error'); return; }
      if (foundJob.approval_token !== token) { setState('error'); return; }
      if (foundJob.approved_at || foundJob.rejected_at) { setState('already_done'); setJob(foundJob); return; }

      if (action === 'approve') {
        await base44.entities.Job.update(jobId, {
          status: 'Approved',
          approved_at: new Date().toISOString(),
        });
        setJob({ ...foundJob, status: 'Approved' });
        setState('approved');
        
        // Notify the business owner via email
        await base44.integrations.Core.SendEmail({
          to: foundJob.created_by || 'admin',
          subject: `✅ Quote Approved: ${foundJob.title}`,
          body: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
            <div style="background:#22c55e;padding:20px;border-radius:8px;text-align:center;margin-bottom:20px">
              <h1 style="color:white;margin:0">Quote Approved! 🎉</h1>
            </div>
            <p><strong>${foundJob.customer_name}</strong> has approved the quote for <strong>${foundJob.title}</strong>.</p>
            <p style="font-size:20px;font-weight:bold">Total: $${(foundJob.total_amount||0).toFixed(2)}</p>
            <p>Log in to your CRM to move this job to production.</p>
          </div>`
        });
      } else if (action === 'reject') {
        await base44.entities.Job.update(jobId, {
          status: 'Cancelled',
          rejected_at: new Date().toISOString(),
        });
        setJob({ ...foundJob, status: 'Cancelled' });
        setState('rejected');
      }
    };
    process().catch(() => setState('error'));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white font-bold">H</span>
          </div>
          <span className="text-2xl font-bold text-foreground">hoops</span>
        </div>

        {state === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin mb-4" />
            <p className="text-muted-foreground">Processing your response...</p>
          </>
        )}

        {state === 'approved' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Quote Approved!</h2>
            <p className="text-muted-foreground mb-4">
              Thank you! You've approved the quote for <strong>{job?.title}</strong>.
              We'll get started on your order right away.
            </p>
            <div className="bg-green-50 rounded-lg p-4 text-left">
              <p className="text-sm text-green-800"><strong>What happens next:</strong></p>
              <p className="text-sm text-green-700 mt-1">Our team has been notified and will begin production. We'll be in touch with updates!</p>
            </div>
          </>
        )}

        {state === 'rejected' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Quote Rejected</h2>
            <p className="text-muted-foreground">
              You've declined this quote. Our team will reach out to discuss any changes or concerns.
            </p>
          </>
        )}

        {state === 'already_done' && (
          <>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Already Responded</h2>
            <p className="text-muted-foreground">This quote has already been {job?.approved_at ? 'approved' : 'rejected'}. No further action needed.</p>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Invalid Link</h2>
            <p className="text-muted-foreground">This approval link is invalid or has expired. Please contact us directly.</p>
          </>
        )}
      </div>
    </div>
  );
}