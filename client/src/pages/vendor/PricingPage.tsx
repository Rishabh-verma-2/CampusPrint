import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorApi } from '../../api/vendorApi';
import { Spinner, PageHeader } from '../../components/ui';
import { toast } from 'sonner';

const VendorPricingPage: React.FC = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [bw, setBw] = useState<number>(1);
  const [color, setColor] = useState<number>(5);

  const { data, isLoading } = useQuery({
    queryKey: ['vendorDashboard'],
    queryFn: () => vendorApi.getDashboard().then(r => r.data.data),
  });

  useEffect(() => {
    const p = (data as { vendor?: { pricing?: { bwPerPage: number; colorPerPage: number } } })?.vendor?.pricing;
    if (p) {
      if (typeof p.bwPerPage === 'number') setBw(p.bwPerPage);
      if (typeof p.colorPerPage === 'number') setColor(p.colorPerPage);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => vendorApi.updatePricing({ bwPerPage: bw, colorPerPage: color }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendorDashboard'] });
      setEditing(false);
      toast.success('Pricing updated');
    },
    onError: () => toast.error('Failed to update pricing'),
  });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner size="lg" /></div>;

  const pricing = (data as { vendor?: { pricing?: { bwPerPage: number; colorPerPage: number } } })?.vendor?.pricing;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 500 }}>
      <PageHeader title="Pricing" subtitle="Set your per-page rates" />

      <div className="cp-card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { label: 'Black & White', sublabel: 'per page', value: bw, set: setBw, id: 'bw-price' },
            { label: 'Color', sublabel: 'per page', value: color, set: setColor, id: 'color-price' },
          ].map(item => (
            <div
              key={item.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1rem',
                background: 'var(--surface-raised)',
                borderRadius: '12px',
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.sublabel}</div>
              </div>
              {editing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>₹</span>
                  <input
                    id={item.id}
                    type="number"
                    className="cp-input"
                    style={{ width: 70, textAlign: 'center' }}
                    value={item.value}
                    min={0.5}
                    step={0.5}
                    onChange={e => item.set(parseFloat(e.target.value))}
                  />
                </div>
              ) : (
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--brand-400)' }}>
                  ₹{item.value}
                </span>
              )}
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: '10px',
            fontSize: '0.78rem', color: '#fbbf24',
          }}
        >
          ⚠️ Pricing changes do not affect already-paid orders. Historical orders retain their original price.
        </div>

        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem' }}>
          {editing ? (
            <>
              <button className="cp-btn cp-btn-ghost" style={{ flex: 1 }} onClick={() => setEditing(false)}>Cancel</button>
              <button className="cp-btn cp-btn-primary" style={{ flex: 1 }} disabled={mutation.isPending} onClick={() => mutation.mutate()} id="save-pricing-btn">
                {mutation.isPending ? <Spinner size="sm" /> : 'Save Pricing'}
              </button>
            </>
          ) : (
            <button className="cp-btn cp-btn-secondary cp-btn-full" onClick={() => setEditing(true)} id="edit-pricing-btn">
              Edit Pricing
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorPricingPage;
