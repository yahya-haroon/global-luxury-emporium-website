import React, { useState, useEffect } from 'react';
import {
  CustomDesignRequest,
  CustomDesignRequestStatus,
} from '../../types/customDesign';
import {
  fetchAdminCustomDesignRequests,
  updateAdminCustomDesignRequest,
} from '../../lib/customDesignApi';
import {
  Scissors,
  Search,
  RefreshCw,
  CheckCircle2,
  FileText,
  MessageSquare,
  X,
} from 'lucide-react';

export const STATUS_CONFIG: Record<
  CustomDesignRequestStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  new: { label: 'New Request', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  under_review: { label: 'Under Review', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  more_info_needed: { label: 'More Info Needed', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  quote_prepared: { label: 'Quote Prepared', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  quote_sent: { label: 'Quote Sent', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  approved: { label: 'Approved by Client', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  in_production: { label: 'In Production', bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-300' },
  completed: { label: 'Completed', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  declined: { label: 'Declined', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

export const AdminCustomDesignsTab: React.FC = () => {
  const [requests, setRequests] = useState<CustomDesignRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CustomDesignRequestStatus>('all');
  const [selectedRequest, setSelectedRequest] = useState<CustomDesignRequest | null>(null);

  // Edit fields for selected request
  const [editStatus, setEditStatus] = useState<CustomDesignRequestStatus>('new');
  const [editAdminNotes, setEditAdminNotes] = useState('');
  const [editQuoteAmount, setEditQuoteAmount] = useState('');
  const [editQuoteNotes, setEditQuoteNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminCustomDesignRequests();
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const openDetails = (req: CustomDesignRequest) => {
    setSelectedRequest(req);
    setEditStatus(req.status);
    setEditAdminNotes(req.admin_notes || '');
    setEditQuoteAmount(req.quote_amount ? String(req.quote_amount) : '');
    setEditQuoteNotes(req.quote_notes || '');
    setFeedbackMsg(null);
  };

  const handleSaveUpdates = async () => {
    if (!selectedRequest) return;
    setIsSaving(true);
    setFeedbackMsg(null);

    const amountNum = editQuoteAmount ? parseFloat(editQuoteAmount) : null;
    const isNowQuoted = Boolean(amountNum && !selectedRequest.quoted_at);

    try {
      const res = await updateAdminCustomDesignRequest(selectedRequest.id, {
        status: editStatus,
        admin_notes: editAdminNotes || null,
        quote_amount: amountNum,
        quote_notes: editQuoteNotes || null,
        quoted_at: isNowQuoted ? new Date().toISOString() : selectedRequest.quoted_at,
      });

      if (!res.success) {
        setFeedbackMsg({ type: 'error', text: res.error || 'Failed to update request.' });
      } else {
        setFeedbackMsg({ type: 'success', text: 'Request updated successfully.' });
        // Update local list
        setRequests((prev) =>
          prev.map((r) =>
            r.id === selectedRequest.id
              ? {
                  ...r,
                  status: editStatus,
                  admin_notes: editAdminNotes,
                  quote_amount: amountNum,
                  quote_notes: editQuoteNotes,
                  quoted_at: isNowQuoted ? new Date().toISOString() : r.quoted_at,
                }
              : r
          )
        );
        setSelectedRequest((prev) =>
          prev
            ? {
                ...prev,
                status: editStatus,
                admin_notes: editAdminNotes,
                quote_amount: amountNum,
                quote_notes: editQuoteNotes,
                quoted_at: isNowQuoted ? new Date().toISOString() : prev.quoted_at,
              }
            : null
        );
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        r.reference_number.toLowerCase().includes(q) ||
        r.customer_name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q) ||
        r.garment_style.toLowerCase().includes(q) ||
        r.outer_material.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Controls: Search, Filter, Refresh */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded border border-hairline shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by reference, customer name, email, phone, or style..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-hairline rounded bg-[#FAF8F5] focus:outline-none focus:border-gold"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs p-2 border border-hairline rounded bg-[#FAF8F5] focus:outline-none focus:border-gold"
          >
            <option value="all">All Statuses ({requests.length})</option>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const count = requests.filter((r) => r.status === key).length;
              return (
                <option key={key} value={key}>
                  {cfg.label} ({count})
                </option>
              );
            })}
          </select>

          <button
            type="button"
            onClick={loadRequests}
            disabled={loading}
            className="p-2 border border-hairline rounded bg-white hover:bg-gold/10 text-text transition-colors"
            title="Refresh requests"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-gold' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Table / Grid of Requests */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded border border-hairline">
          <div className="w-8 h-8 rounded-full border-2 border-gold/30 border-t-gold animate-spin mx-auto mb-3" />
          <p className="text-xs text-muted uppercase tracking-wider">Loading bespoke design requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-12 text-center bg-white rounded border border-hairline space-y-2">
          <Scissors className="w-10 h-10 text-muted/60 mx-auto" />
          <h3 className="font-serif text-lg text-ink font-semibold">No Custom Design Requests Found</h3>
          <p className="text-xs text-muted max-w-sm mx-auto">
            {search || statusFilter !== 'all'
              ? 'Try adjusting your search criteria or status filter.'
              : 'When customers configure garments and submit for quotation, they will appear here.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded border border-hairline shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-hairline text-[11px] font-bold uppercase tracking-wider text-muted">
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Garment Specs</th>
                  <th className="py-3 px-4">Size / Fit</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Quote Amount</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {filteredRequests.map((req) => {
                  const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.new;
                  const dateStr = new Date(req.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-gold/5 transition-colors cursor-pointer"
                      onClick={() => openDetails(req)}
                    >
                      <td className="py-3.5 px-4 font-mono font-semibold text-ink">
                        {req.reference_number}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-ink">{req.customer_name}</p>
                        <p className="text-[10px] text-muted">{req.email}</p>
                        <p className="text-[10px] text-muted">{req.phone}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-medium text-ink capitalize">
                          {req.garment_style.replace('_', ' ')} ({req.garment_length.replace('_', ' ')})
                        </p>
                        <p className="text-[10px] text-muted capitalize">
                          {req.outer_material.replace('_', ' ')} • {req.outer_color}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 text-[11px]">
                        {req.sizing_mode === 'standard' ? (
                          <span>{req.standard_size} ({req.fit_preference})</span>
                        ) : (
                          <span className="font-semibold text-gold-dark">Made-to-Measure</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                        >
                          {statusCfg.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-ink">
                        {req.quote_amount ? `£${req.quote_amount.toFixed(2)}` : <span className="text-muted font-normal">Pending</span>}
                      </td>

                      <td className="py-3.5 px-4 text-[11px] text-muted whitespace-nowrap">
                        {dateStr}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetails(req);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded bg-ink text-ivory hover:bg-gold transition-colors"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review & Edit Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-ivory rounded shadow-2xl overflow-y-auto flex flex-col p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-hairline pb-4">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-gold font-bold">
                  Bespoke Design Request Details
                </span>
                <h3 className="font-serif text-2xl font-bold text-ink mt-0.5 flex items-center gap-3">
                  <span>{selectedRequest.reference_number}</span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded font-mono font-medium border ${
                      STATUS_CONFIG[selectedRequest.status]?.bg
                    } ${STATUS_CONFIG[selectedRequest.status]?.text} ${
                      STATUS_CONFIG[selectedRequest.status]?.border
                    }`}
                  >
                    {STATUS_CONFIG[selectedRequest.status]?.label}
                  </span>
                </h3>
                <p className="text-xs text-muted mt-1">
                  Submitted on {new Date(selectedRequest.created_at).toLocaleString('en-GB')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="p-1.5 rounded-full hover:bg-gold/15 text-text transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Details Box */}
            <div className="p-4 bg-white rounded border border-hairline grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted block text-[10px] uppercase tracking-wider">Client Name</span>
                <p className="font-semibold text-ink text-sm">{selectedRequest.customer_name}</p>
              </div>
              <div>
                <span className="text-muted block text-[10px] uppercase tracking-wider">Destination Country</span>
                <p className="font-semibold text-ink">{selectedRequest.country}</p>
              </div>
              <div>
                <span className="text-muted block text-[10px] uppercase tracking-wider">Email Address</span>
                <a href={`mailto:${selectedRequest.email}`} className="text-gold hover:underline font-medium">
                  {selectedRequest.email}
                </a>
              </div>
              <div>
                <span className="text-muted block text-[10px] uppercase tracking-wider">Phone / WhatsApp</span>
                <a
                  href={`https://wa.me/${selectedRequest.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-700 hover:underline font-medium inline-flex items-center gap-1"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>{selectedRequest.phone}</span>
                </a>
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted block text-[10px] uppercase tracking-wider">Preferred Contact Channel</span>
                <span className="font-medium text-ink capitalize">{selectedRequest.preferred_contact}</span>
              </div>
            </div>

            {/* Garment Specifications Detailed Breakdown */}
            <div className="p-4 bg-white rounded border border-hairline space-y-3 text-xs">
              <h4 className="font-serif text-base font-semibold text-ink border-b border-hairline/60 pb-1.5">
                Garment Specifications
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-muted block text-[10px] uppercase">Silhouette &amp; Length</span>
                  <span className="font-medium text-ink capitalize">{selectedRequest.garment_length.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase">Style</span>
                  <span className="font-medium text-ink capitalize">{selectedRequest.garment_style.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase">Outer Material</span>
                  <span className="font-medium text-ink capitalize">{selectedRequest.outer_material.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase">Outer Colour</span>
                  <span className="font-medium text-ink capitalize">
                    {selectedRequest.outer_color === 'custom' ? selectedRequest.custom_outer_color : selectedRequest.outer_color}
                  </span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase">Lining Material</span>
                  <span className="font-medium text-ink capitalize">{selectedRequest.lining_material}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase">Lining Colour</span>
                  <span className="font-medium text-ink capitalize">
                    {selectedRequest.lining_color === 'custom' ? selectedRequest.custom_lining_color : selectedRequest.lining_color}
                  </span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase">Hardware Finish</span>
                  <span className="font-medium text-ink capitalize">{selectedRequest.design_details?.hardwareFinish?.replace('_', ' ') || 'Standard'}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase">Collar Style</span>
                  <span className="font-medium text-ink capitalize">{selectedRequest.design_details?.collarStyle?.replace('_', ' ') || 'Standard'}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase">Closure</span>
                  <span className="font-medium text-ink capitalize">{selectedRequest.design_details?.closureType?.replace('_', ' ') || 'Standard'}</span>
                </div>
              </div>

              {selectedRequest.design_details?.monogramText && (
                <div className="p-2.5 bg-gold/10 rounded border border-gold/30">
                  <span className="text-[10px] uppercase font-bold text-gold-dark block">Bespoke Monogram</span>
                  <span className="font-serif text-sm font-bold text-ink">
                    "{selectedRequest.design_details.monogramText.toUpperCase()}"
                  </span>
                </div>
              )}

              {selectedRequest.special_instructions && (
                <div className="p-2.5 bg-[#FAF8F5] rounded border border-hairline">
                  <span className="text-[10px] uppercase text-muted block">Client Instructions</span>
                  <p className="mt-0.5">{selectedRequest.special_instructions}</p>
                </div>
              )}
            </div>

            {/* Sizing & Measurements */}
            <div className="p-4 bg-white rounded border border-hairline space-y-2 text-xs">
              <h4 className="font-serif text-base font-semibold text-ink border-b border-hairline/60 pb-1.5">
                Sizing &amp; Tailoring Dimensions
              </h4>
              {selectedRequest.sizing_mode === 'standard' ? (
                <p>
                  Standard International Size: <strong>{selectedRequest.standard_size}</strong> (
                  {selectedRequest.fit_preference} fit)
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(selectedRequest.custom_measurements || {}).map(([k, v]) => {
                    if (!v) return null;
                    return (
                      <div key={k} className="p-2 bg-[#FAF8F5] rounded border border-hairline">
                        <span className="text-[10px] text-muted uppercase block">{k}</span>
                        <span className="font-semibold text-ink">{String(v)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Reference Images */}
            {selectedRequest.reference_images && selectedRequest.reference_images.length > 0 && (
              <div className="p-4 bg-white rounded border border-hairline space-y-3 text-xs">
                <h4 className="font-serif text-base font-semibold text-ink border-b border-hairline/60 pb-1.5">
                  Reference Images ({selectedRequest.reference_images.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedRequest.reference_images.map((img) => (
                    <div key={img.id} className="p-2 bg-[#FAF8F5] rounded border border-hairline text-center">
                      {img.dataUrl ? (
                        <img
                          src={img.dataUrl}
                          alt={img.name}
                          className="w-full h-28 object-cover rounded mb-1.5 border border-hairline"
                        />
                      ) : (
                        <div className="w-full h-28 bg-white rounded flex items-center justify-center text-muted border border-hairline mb-1.5">
                          <FileText className="w-6 h-6" />
                        </div>
                      )}
                      <p className="font-semibold text-ink truncate text-[11px]">{img.name}</p>
                      <span className="text-[10px] text-gold font-medium uppercase">{img.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Management Section */}
            <div className="p-4 bg-white rounded border border-hairline space-y-4 text-xs">
              <h4 className="font-serif text-base font-semibold text-ink border-b border-hairline/60 pb-1.5">
                Atelier Status &amp; Quotation Recording
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-ink mb-1">
                    Workflow Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as CustomDesignRequestStatus)}
                    className="w-full p-2 border border-hairline rounded bg-[#FAF8F5]"
                  >
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-ink mb-1">
                    Quote Amount (£ GBP)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editQuoteAmount}
                    onChange={(e) => setEditQuoteAmount(e.target.value)}
                    placeholder="e.g. 580.00"
                    className="w-full p-2 border border-hairline rounded bg-[#FAF8F5]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase text-ink mb-1">
                    Quotation Notes (Included for client)
                  </label>
                  <input
                    type="text"
                    value={editQuoteNotes}
                    onChange={(e) => setEditQuoteNotes(e.target.value)}
                    placeholder="e.g. Italian lambskin, custom burgundy lining, 3-4 week bespoke lead time..."
                    className="w-full p-2 border border-hairline rounded bg-[#FAF8F5]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase text-ink mb-1">
                    Internal Admin Notes (Private)
                  </label>
                  <textarea
                    rows={2}
                    value={editAdminNotes}
                    onChange={(e) => setEditAdminNotes(e.target.value)}
                    placeholder="Private workshop notes, leather supplier stock check, customer phone call summary..."
                    className="w-full p-2 border border-hairline rounded bg-[#FAF8F5]"
                  />
                </div>
              </div>

              {feedbackMsg && (
                <div
                  className={`p-3 rounded text-xs flex items-center gap-2 ${
                    feedbackMsg.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{feedbackMsg.text}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 border border-hairline rounded text-xs font-semibold uppercase hover:bg-gold/10 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveUpdates}
                  className="px-5 py-2 bg-ink text-ivory rounded text-xs font-semibold uppercase tracking-wider hover:bg-gold transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
