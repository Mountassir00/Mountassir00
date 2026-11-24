import { useState } from 'react';
import { Dialog } from '@ds';
import { useUi } from './uiStore';

const RISK_LABEL = { low: 'Risque faible', medium: 'Risque modéré', high: 'Risque élevé', critical: 'Risque critique' } as const;

/** Confirmation proportional to risk: simple, explicit (checkbox), typed. */
export function ConfirmDialog() {
  const c = useUi((s) => s.confirm);
  const [ack, setAck] = useState(false);
  const [typed, setTyped] = useState('');
  if (!c) return null;
  const level = c.policy.confirm;
  const ready = level === 'simple' || (level === 'explicit' && ack) || (level === 'typed' && ack && typed.trim().toUpperCase() === c.expectedTyped);
  const close = (ok: boolean) => {
    const r = c.resolve;
    setAck(false);
    setTyped('');
    r(ok ? { acknowledged: true, typed } : null);
  };
  return (
    <Dialog title={c.policy.label} onClose={() => close(false)}>
      <p>{c.context}</p>
      <div className="risk-strip">
        <span className={`pill pill--risk-${c.policy.risk}`}>{RISK_LABEL[c.policy.risk]}</span>
        {c.policy.spends && <span className="pill">Peut engager une dépense</span>}
        {c.policy.durable && <span className="pill">Modification durable</span>}
      </div>
      {level !== 'simple' && (
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '8px 0' }}>
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
          <span>J’ai compris les conséquences de cette action.</span>
        </label>
      )}
      {level === 'typed' && (
        <label className="field">
          <span>
            Tapez <b>{c.expectedTyped}</b> pour valider
          </span>
          <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} />
        </label>
      )}
      <div className="dialog__actions">
        <button type="button" className="btn" onClick={() => close(false)}>
          Annuler
        </button>
        <button type="button" className="btn btn--primary" disabled={!ready} onClick={() => close(true)}>
          {c.policy.label}
        </button>
      </div>
    </Dialog>
  );
}
