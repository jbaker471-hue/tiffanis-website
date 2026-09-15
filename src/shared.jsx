// Shared theme/helpers used by both the customer-facing app (App.jsx) and
// the admin panel (Admin.jsx, lazy-loaded so it doesn't ship to every
// visitor). Keeping this in its own module avoids a circular import between
// the two.

// ─── BRAND ────────────────────────────────────────────────────────────────────
export const B = {
  green:     "#4A7C59", greenDk: "#2E5C3E", greenLt: "#7AAB84", greenPale: "#EBF3ED",
  pink:      "#E8879A", pinkPale: "#FCEEF1",
  amber:     "#D4956A", amberPale: "#FDF3EB",
  cream:     "#F7F2EA", creamDk: "#EDE5D8",
  wood:      "#D9CDB8",
  text:      "#2C2218", textMid: "#6B5744", textLt: "#A08878",
};

export const PAYMENT_OPTS = ["Pending","Venmo","PayPal","Cash App","Pay at Pickup"];
export const STATUSES = ["New","In Progress","Ready","Shipped","Picked Up","Complete"];
export const STATUS_META = {
  "New":        {bg:"#FFF8E1",color:"#F57F17",dot:"#FFC107"},
  "In Progress":{bg:"#E3F2FD",color:"#0D47A1",dot:"#1976D2"},
  "Ready":      {bg:"#E8F5E9",color:"#1B5E20",dot:"#43A047"},
  "Shipped":    {bg:"#E0F7FA",color:"#006064",dot:"#00ACC1"},
  "Picked Up":  {bg:"#EDE7F6",color:"#4527A0",dot:"#7B1FA2"},
  "Complete":   {bg:"#ECEFF1",color:"#37474F",dot:"#78909C"},
};
export const SHIRTS_FOR_REWARD = 10;

// Admin data/actions go through password-checked server functions rather
// than the anon key, since the admin password is only ever checked in the
// browser otherwise. The password is held in memory for the session and
// sent with each call; the server re-checks it every time.
export const admin = {
  async unlock(password) {
    const res = await fetch("/.netlify/functions/admin-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) return null;
    return await res.json(); // { orders, customers, messages }
  },
  async mutate(password, table, op, id, changes) {
    const res = await fetch("/.netlify/functions/admin-mutate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, table, op, id, changes }),
    });
    if (!res.ok) return null;
    return await res.json();
  },
};

// ─── LOYALTY ──────────────────────────────────────────────────────────────────
export function rewardCode(phone) { return `TATB-${phone.replace(/\D/g,"").slice(-4)}-FREE`; }

// ─── ITEM PARSER ─────────────────────────────────────────────────────────────
// ALL item access goes through this — handles JSON string from Supabase
export function pi(o) {
  if (!o) return [];
  try {
    return typeof o.items === "string" ? JSON.parse(o.items||"[]") : (o.items||[]);
  } catch { return []; }
}

export const INP = (extra={}) => ({width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${B.wood}`,fontSize:14,fontFamily:"'Trebuchet MS',sans-serif",background:"#fff",color:B.text,outline:"none",...extra});
export const PBTN = {background:`linear-gradient(135deg,${B.greenDk},${B.green})`,color:"#fff",border:"none",borderRadius:12,padding:"12px 24px",cursor:"pointer",fontFamily:"'Trebuchet MS',sans-serif",fontWeight:700,fontSize:14,boxShadow:`0 4px 14px rgba(74,124,89,0.3)`,width:"100%"};

export function Lbl({children}) { return <div style={{fontSize:12,color:B.textLt,marginBottom:5,fontFamily:"'Trebuchet MS',sans-serif"}}>{children}</div>; }
