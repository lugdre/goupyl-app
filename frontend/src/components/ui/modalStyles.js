// Styles partagés des modales du dashboard (design system Goupyl Sport).
// Auto-portant : aucune variable CSS externe, les modales sont montées en
// position fixed et peuvent être rendues hors du scope `.dbl`.
export const MODAL_CSS = `
  .gm-back{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(15,15,15,.55);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);font-family:"Inter",system-ui,-apple-system,sans-serif;color:#171614}
  .gm-back *{box-sizing:border-box}
  .gm{position:relative;width:100%;max-width:460px;max-height:90vh;background:#fff;border-radius:20px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 50px rgba(15,15,15,.22)}
  .gm--wide{max-width:520px}
  .gm-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:20px 24px;border-bottom:1px solid #E4E2DC;flex-shrink:0}
  .gm-head-left{display:flex;align-items:center;gap:11px;min-width:0}
  .gm-head-icon{width:36px;height:36px;border-radius:50%;background:#FEF1EA;color:#F4530F;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .gm-title{font-size:17px;font-weight:700;letter-spacing:-.015em;color:#171614;margin:0}
  .gm-close{width:32px;height:32px;border-radius:50%;border:1px solid #E4E2DC;background:#fff;color:#8a8781;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:border-color .15s,color .15s}
  .gm-close:hover{border-color:#c9c7c1;color:#171614}
  .gm-body{padding:22px 24px;overflow-y:auto;display:flex;flex-direction:column;gap:18px}
  .gm-foot{display:flex;gap:10px;padding:0 24px 22px;flex-shrink:0}
  .gm-foot .gm-btn{flex:1}

  .gm-summary{background:#FAF9F7;border:1px solid #E4E2DC;border-radius:14px;padding:16px 18px}
  .gm-summary-name{font-size:14.5px;font-weight:600;color:#171614;margin:0}
  .gm-summary-line{font-size:13px;color:#8a8781;margin:4px 0 0}
  .gm-total{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding-top:14px;margin-top:14px;border-top:1px solid #E4E2DC}
  .gm-total-label{font-size:13px;color:#8a8781}
  .gm-total-value{font-size:24px;font-weight:700;letter-spacing:-.02em;color:#171614}

  .gm-eyebrow{font-size:11.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#8a8781;margin:0 0 10px;display:flex;align-items:center;gap:7px}
  .gm-row{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13.5px}
  .gm-row + .gm-row{margin-top:6px}
  .gm-row span:first-child{color:#8a8781}
  .gm-row span:last-child{font-weight:600;color:#171614}

  .gm-label{display:block;font-size:12.5px;font-weight:500;color:#4c4a46;margin-bottom:7px}
  .gm-label em{font-style:normal;color:#8a8781;font-weight:400}
  .gm-textarea{width:100%;background:#fff;border:1px solid #E4E2DC;border-radius:12px;padding:12px 15px;font-family:inherit;font-size:14px;line-height:1.55;color:#171614;outline:none;resize:vertical;transition:border-color .15s,box-shadow .15s}
  .gm-textarea::placeholder{color:#8a8781}
  .gm-textarea:focus{border-color:#F4530F;box-shadow:0 0 0 3px rgba(244,83,15,.12)}
  .gm-count{font-size:12px;color:#8a8781;text-align:right;margin:6px 0 0}

  .gm-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:46px;padding:0 22px;border-radius:999px;border:1px solid transparent;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap;transition:transform .15s ease,background .2s,border-color .2s,color .2s}
  .gm-btn:hover:not(:disabled){transform:translateY(-1px)}
  .gm-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
  .gm-btn--orange{background:#F4530F;color:#fff}
  .gm-btn--ghost{background:#fff;color:#4c4a46;border-color:#E4E2DC;font-weight:500}
  .gm-btn--ghost:hover:not(:disabled){border-color:#c9c7c1;color:#171614}
  .gm-btn--danger{background:#C0392B;color:#fff}
  .gm-btn--block{width:100%}

  .gm-alert{display:flex;align-items:flex-start;gap:9px;border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.5}
  .gm-alert--err{background:#FBEAE7;color:#A5342A;border:1px solid #EFC7BE}
  .gm-alert--warn{background:#FBF3E2;color:#8A6212;border:1px solid #EBD9B4}
  .gm-alert--info{background:#FEF1EA;color:#B33D0A;border:1px solid #F7D3C0}
  .gm-alert svg{flex-shrink:0;margin-top:1px}

  .gm-note{font-size:13px;color:#4c4a46;line-height:1.6;margin:0}
  .gm-hint{font-size:12px;color:#8a8781;line-height:1.5;margin:0}

  .gm-success{display:flex;flex-direction:column;align-items:center;gap:14px;padding:28px 0}
  .gm-success-icon{width:60px;height:60px;border-radius:50%;background:#EAF3EC;color:#2F7A47;display:flex;align-items:center;justify-content:center}
  .gm-success p{font-size:16px;font-weight:600;color:#171614;margin:0}
`;

// Apparence de Stripe Elements alignée sur le design system.
export const STRIPE_APPEARANCE = {
  theme: 'stripe',
  variables: {
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    borderRadius: '12px',
    colorPrimary: '#F4530F',
    colorBackground: '#ffffff',
    colorText: '#171614',
    colorTextSecondary: '#8a8781',
    colorTextPlaceholder: '#8a8781',
    colorDanger: '#C0392B',
    fontSizeBase: '14px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': {
      border: '1px solid #E4E2DC',
      boxShadow: 'none',
      padding: '12px 15px',
    },
    '.Input:focus': {
      border: '1px solid #F4530F',
      boxShadow: '0 0 0 3px rgba(244,83,15,.12)',
      outline: 'none',
    },
    '.Input--invalid': { border: '1px solid #C0392B', boxShadow: 'none' },
    '.Label': { fontWeight: '500', fontSize: '12.5px', color: '#4c4a46', marginBottom: '7px' },
    '.Tab': { border: '1px solid #E4E2DC', boxShadow: 'none', padding: '12px' },
    '.Tab:hover': { border: '1px solid #c9c7c1', boxShadow: 'none', color: '#171614' },
    '.Tab--selected': {
      border: '1px solid #F4530F',
      backgroundColor: '#FEF1EA',
      color: '#F4530F',
      boxShadow: 'none',
    },
    '.Tab--selected:focus': { boxShadow: '0 0 0 3px rgba(244,83,15,.12)' },
    '.TabIcon--selected': { fill: '#F4530F' },
    '.Error': { fontSize: '12.5px', color: '#C0392B' },
  },
};
