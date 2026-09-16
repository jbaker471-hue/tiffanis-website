// To A "T" Boutique — Full System v1.0 (clean build)
import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from "react";
import { B, INP, PBTN, Lbl, STATUS_META, SHIRTS_FOR_REWARD, admin, rewardCode, pi, BRAND_COLORS, SHIRT_COLORS, ShirtSVG } from "./shared.jsx";
import { ADULT_SIZES, YOUTH_SIZES, BIG_SIZES, SIZES, CATALOG, PRODUCTS, DEFAULT_PRODUCT_ID, getProduct, getSizesForBrand, getPrice, calcTotal } from "./pricing.js";
import { availableRewards } from "./loyalty.js";

// Admin.jsx (order tracker, designs/AI-sort/loyalty/messages/stats tabs) is
// only ever needed by whoever opens the Admin tab — almost never a
// shopper — so it's a separate chunk, fetched on demand instead of shipping
// in every visitor's initial bundle.
const Tracker    = lazy(() => import("./Admin.jsx").then(m => ({ default: m.Tracker })));
const AdminLock  = lazy(() => import("./Admin.jsx").then(m => ({ default: m.AdminLock })));
const Admin      = lazy(() => import("./Admin.jsx").then(m => ({ default: m.Admin })));
function AdminLoadingFallback() {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"40vh",gap:12}}>
      <div style={{fontFamily:"'Dancing Script','Georgia',cursive",fontSize:20,color:B.green}}>Loading admin…</div>
    </div>
  );
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
// BRAND_COLORS / SHIRT_COLORS now live in shared.jsx (also used by the
// lazy-loaded Admin.jsx for order/design preview thumbnails)

// Size sets
// brandId here is a PRODUCT id (kept name for backward compat with callers)
function getBrandColors(productId) {
  const p = PRODUCTS[productId];
  const key = p ? p.colorKey : productId; // tolerate raw palette keys
  return BRAND_COLORS[key] || BRAND_COLORS.comfort;
}

const FB_USERNAME = "toatsublimationboutique";
// Plain m.me link — confirmed (by testing it typed directly into Safari,
// with no involvement from this site at all) that Facebook itself routes an
// anonymous/not-logged-into-Facebook visit through a facebook.com
// interstitial and then its own "Open In Messenger" link, which opens the
// app to the general inbox rather than a specific chat. That's entirely
// Facebook's own behavior for this link, not something this site's code can
// change. All six buttons open it in a new tab (target="_blank") so leaving
// to deal with any of that doesn't navigate the shop itself away.
const FB_URL = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  ? `https://m.me/${FB_USERNAME}`
  : `https://www.messenger.com/t/${FB_USERNAME}`;

const DEFAULT_CATS = [
  {id:"custom",name:"Custom Design",emoji:"📤",designs:[
    {id:"u1",name:"Upload My Image",emoji:"🖼️",preview:"",style:"upload",isUpload:true},
  ]},
];

const FAQ = [
  {q:"What sizes do you carry?", a:"Youth YXS through adult 5XL! If you need something specific just ask."},
  {q:"How much is shipping?",    a:"Flat $8 rate anywhere, or free pickup in New Market, AL!"},
  {q:"How do I pay?",            a:"Checkout is by credit or debit card, charged when you place your order."},
  {q:"How long does it take?",   a:"Most orders are ready in 5–7 business days. She'll let you know if yours is more complex!"},
  {q:"Can I change my order?",   a:"Changes can usually be made before production starts — message Tiffani on Messenger ASAP!"},
  {q:"Do you do group orders?",  a:"Absolutely! Family and group orders are a specialty. Message Tiffani for bulk pricing."},
];

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Public, read-only catalog data (the "designs" table) is the only thing
// still fetched directly with the anon key — orders/customers/messages have
// no anon policies at all anymore (see the RLS migration in
// supabase-setup.sql), so every read/write on those goes through a Netlify
// function using the service key instead.
const db = {
  // Fetches ALL rows using range pagination (Supabase caps each request at 1000).
  // `select` lets us pull only the columns we need to keep it light.
  async getAll(table, select="*") {
    const pageSize = 1000;
    let from = 0;
    let all = [];
    try {
      while (true) {
        const res = await fetch(`${SUPA_URL}/rest/v1/${table}?select=${select}`, {
          headers: {
            apikey: SUPA_KEY,
            Authorization: `Bearer ${SUPA_KEY}`,
            "Content-Type": "application/json",
            Range: `${from}-${from + pageSize - 1}`,
            "Range-Unit": "items",
          }
        });
        if (!res.ok) { console.error(`DB getAll ${table} failed:`, res.status, await res.text()); break; }
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) break;
        all = all.concat(data);
        if (data.length < pageSize) break; // last page
        from += pageSize;
      }
    } catch(e) { console.error(`DB getAll ${table} error:`, e); }
    return all;
  },
};

// Phone-scoped, public lookup (Track Order / Loyalty Rewards / checkout
// reward preview) — returns only the one matching customer + their orders,
// via a server function using the service key. Never the whole table.
async function lookupCustomer(phone) {
  try {
    const res = await fetch("/.netlify/functions/lookup-customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    if (!res.ok) return { customer: null, orders: [] };
    return await res.json();
  } catch {
    return { customer: null, orders: [] };
  }
}

// Keep localStorage only for categories (admin config, not customer data)
const store = {
  get: (k,d) => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):d; } catch { return d; } },
  set: (k,v) => { try { localStorage.setItem(k,JSON.stringify(v)); } catch {} },
};

// ─── COLOR UTILS ──────────────────────────────────────────────────────────────
function adj(hex,n) { return "#"+[1,3,5].map(i=>Math.min(255,Math.max(0,parseInt(hex.slice(i,i+2),16)+n)).toString(16).padStart(2,"0")).join(""); }

// ─── SHIRT MOCKUP ─────────────────────────────────────────────────────────────
// isDark/image-src consts/ShirtSVG now live in shared.jsx (also used by the
// lazy-loaded Admin.jsx for order/design preview thumbnails)

// ─── TOAST ────────────────────────────────────────────────────────────────────
function useToast() {
  const [t,setT] = useState(null);
  const show = useCallback((msg,type="ok")=>{ setT({msg,type}); setTimeout(()=>setT(null),3000); },[]);
  return {t,show};
}
function Toast({t}) {
  if(!t) return null;
  const bg = t.type==="err"?"#C0392B":t.type==="gold"?"#B8860B":t.type==="info"?"#2980B9":B.green;
  return <div style={{position:"fixed",top:20,right:20,zIndex:9999,background:bg,color:"#fff",padding:"12px 20px",borderRadius:12,fontFamily:"'Trebuchet MS',sans-serif",fontWeight:600,fontSize:14,boxShadow:"0 6px 24px rgba(0,0,0,0.2)",maxWidth:320,animation:"tin .3s ease"}}>{t.msg}</div>;
}

// ─── LOYALTY BAR ──────────────────────────────────────────────────────────────
function LoyaltyBar({rec}) {
  if(!rec) return null;
  const total  = rec.total_shirts||0;
  const earned = rec.earned_rewards||0;
  const redeem = rec.redeemed_rewards||0;
  const avail  = earned - redeem;
  const prog   = total % 10;
  return (
    <div style={{background:`linear-gradient(135deg,${B.greenDk},${B.green})`,borderRadius:14,padding:"16px 18px",color:"#fff",marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div>
          <div style={{fontSize:12,opacity:.7,letterSpacing:1,textTransform:"uppercase"}}>Loyalty Rewards</div>
          <div style={{fontSize:17,fontWeight:700,marginTop:2}}>Hi {rec.name||"there"}! 👋</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:24,fontWeight:700,color:"#FFD700"}}>{total}</div>
          <div style={{fontSize:11,opacity:.7}}>total shirts</div>
        </div>
      </div>
      <div style={{background:"rgba(255,255,255,0.2)",borderRadius:20,height:8,marginBottom:6}}>
        <div style={{height:"100%",borderRadius:20,background:"linear-gradient(90deg,#FFD700,#FFA500)",width:`${(prog/10)*100}%`,transition:"width .5s ease"}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,opacity:.85}}>
        <span>{prog}/10 toward next free shirt</span>
        {avail>0 && <span style={{color:"#FFD700",fontWeight:700}}>🎉 {avail} reward{avail>1?"s":""} ready!</span>}
      </div>
      {avail>0 && (
        <div style={{marginTop:10,background:"rgba(255,215,0,0.15)",border:"1px solid rgba(255,215,0,0.4)",borderRadius:8,padding:"10px 12px"}}>
          <div style={{fontSize:11,color:"#FFD700",fontWeight:700,marginBottom:4}}>🎁 Your Reward Code</div>
          <div style={{fontSize:18,fontWeight:700,letterSpacing:2,fontFamily:"monospace"}}>{rewardCode(rec.phone||"")}</div>
          <div style={{fontSize:11,opacity:.7,marginTop:3}}>Mention this when placing your next order</div>
        </div>
      )}
    </div>
  );
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────
// INP/PBTN/Lbl now live in shared.jsx (also used by the lazy-loaded Admin.jsx)
const BBTN = {background:"none",border:"none",color:B.green,cursor:"pointer",fontSize:14,fontWeight:600,padding:"0 0 14px 0",display:"block",fontFamily:"'Trebuchet MS',sans-serif"};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [view, setView]           = useState("home");
  const [cats, setCats]           = useState(() => store.get("tatb_cats_v3", DEFAULT_CATS));
  const [orders, setOrders]       = useState([]);
  const [customers, setCustomers] = useState([]);
  const [messages, setMessages]   = useState([]);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading]     = useState(false);
  const {t, show}                 = useToast();

  // Keep categories in localStorage (admin config)
  useEffect(()=>{ store.set("tatb_cats_v3",cats); },[cats]);

  // Handle Stripe redirect back
  useEffect(()=>{
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if(payment==="success"){
      show("🎉 Payment successful! Your order is confirmed.","ok");
      window.history.replaceState({},document.title,window.location.pathname);
      setView("status");
    } else if(payment==="cancelled"){
      show("Payment cancelled — your order was not placed.","err");
      window.history.replaceState({},document.title,window.location.pathname);
    }
  },[]);
  // Orders/customers/messages are no longer fetched in full on page load —
  // that shipped every customer's name, phone number, and order/message
  // history to every visitor's browser. Admin data now loads on unlock
  // (see handleAdminUnlock below); customer-facing lookups (Track Order,
  // Loyalty Rewards, checkout reward preview) are scoped to a single phone
  // number via /.netlify/functions/lookup-customer.

  const handleAdminUnlock = async (password) => {
    const data = await admin.unlock(password);
    if (!data) return false;
    setOrders(data.orders || []);
    setCustomers(data.customers || []);
    setMessages(data.messages || []);
    setAdminPassword(password);
    setAdminUnlocked(true);
    return true;
  };
  const handleAdminLock = () => {
    setAdminUnlocked(false);
    setAdminPassword("");
    // Drop admin data from memory once logged out.
    setOrders([]);
    setCustomers([]);
    setMessages([]);
    refreshUnread();
  };

  const TABS = [
    {id:"home",    label:"🏠 Home"},
    {id:"store",   label:"🛍️ Shop"},
    {id:"status",  label:"📦 My Order"},
    {id:"loyalty", label:"⭐ Rewards"},
    {id:"contact", label:"💬 Help"},
    {id:"admin",   label: adminUnlocked ? "🔓 Admin" : "⚙️ Admin"},
  ];

  // Just a count (no message content/PII) so the nav badge works pre-unlock.
  const [unread, setUnread] = useState(0);
  const refreshUnread = useCallback(() => {
    fetch("/.netlify/functions/unread-count").then(r=>r.json()).then(d=>setUnread(d.count||0)).catch(()=>{});
  },[]);
  useEffect(()=>{ refreshUnread(); },[refreshUnread]);

  return (
    <div style={{minHeight:"100vh",background:B.cream,fontFamily:"'Trebuchet MS',sans-serif"}}>
      <Toast t={t}/>
      {/* ── HEADER ── */}
      <div style={{background:`linear-gradient(180deg,${B.greenDk} 0%,${B.green} 60%,${B.greenLt} 100%)`,position:"sticky",top:0,zIndex:100,boxShadow:"0 4px 20px rgba(46,92,62,0.4)"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <div style={{padding:"12px 16px 8px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <img
              src="/logo.jpg"
              alt="To A T Boutique"
              style={{height:52,width:52,borderRadius:"50%",objectFit:"cover",boxShadow:"0 3px 10px rgba(0,0,0,0.25)",border:"2px solid rgba(255,255,255,0.4)"}}
            />
            <div>
              <div style={{fontFamily:"'Dancing Script','Georgia',cursive",fontSize:20,fontWeight:700,color:"#fff",lineHeight:1.1,textShadow:"0 1px 3px rgba(0,0,0,0.3)"}}>To A "T"</div>
              <div style={{fontFamily:"'Dancing Script','Georgia',cursive",fontSize:14,fontWeight:700,color:"rgba(255,255,255,0.85)",lineHeight:1}}>Boutique</div>
            </div>
          </div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.85)",textAlign:"right",lineHeight:1.8}}>
            <div>📍 New Market, AL</div>
            <div>📦 $8 flat ship</div>
          </div>
        </div>
        <div style={{display:"flex",padding:"0 8px"}}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={()=>setView(tab.id)} style={{
              flex:1,padding:"8px 2px 9px",border:"none",cursor:"pointer",fontSize:12,fontWeight:700,
              letterSpacing:.4,textTransform:"uppercase",fontFamily:"'Trebuchet MS',sans-serif",
              background:view===tab.id?B.cream:"transparent",
              color:view===tab.id?B.green:"rgba(255,255,255,0.85)",
              borderRadius:view===tab.id?"8px 8px 0 0":"6px 6px 0 0",
              position:"relative",transition:"all .2s",
            }}>
              {tab.label}
              {tab.id==="admin" && unread>0 && <span style={{position:"absolute",top:2,right:2,background:"#C0392B",color:"#fff",borderRadius:"50%",width:14,height:14,fontSize:8,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{unread}</span>}
            </button>
          ))}
        </div>
      </div>
      </div>

      {/* ── VIEWS ── */}
      {loading && (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"60vh",gap:16}}>
          <img src="/logo.jpg" alt="To A T Boutique" style={{width:80,height:80,borderRadius:"50%",objectFit:"cover",boxShadow:"0 4px 16px rgba(0,0,0,0.15)"}}/>
          <div style={{fontFamily:"'Dancing Script','Georgia',cursive",fontSize:22,color:B.green}}>Loading...</div>
          <div style={{fontSize:13,color:B.textLt}}>Connecting to the shop</div>
        </div>
      )}
      {!loading && view==="home"    && <Welcome setView={setView} show={show}/>}
      {!loading && view==="store"   && <Storefront cats={cats} show={show}/>}
      {!loading && view==="status"  && <OrderStatus show={show}/>}
      {!loading && view==="loyalty" && <LoyaltyView show={show}/>}
      {!loading && view==="tracker" && (
        <Suspense fallback={<AdminLoadingFallback/>}>
          <Tracker orders={orders} setOrders={setOrders} customers={customers} setCustomers={setCustomers} adminPassword={adminPassword} show={show}/>
        </Suspense>
      )}
      {!loading && view==="contact" && <ContactView messages={messages} setMessages={setMessages} show={show}/>}
      {!loading && view==="admin"   && (
        <Suspense fallback={<AdminLoadingFallback/>}>
          {!adminUnlocked ? <AdminLock onUnlock={handleAdminUnlock} show={show}/> : <Admin cats={cats} setCats={setCats} orders={orders} setOrders={setOrders} customers={customers} setCustomers={setCustomers} messages={messages} setMessages={setMessages} adminPassword={adminPassword} onLock={handleAdminLock} show={show}/>}
        </Suspense>
      )}
      {!loading && (view==="privacy"||view==="terms"||view==="refunds") && <LegalPage page={view} show={show}/>}

      {!loading && view!=="admin" && <SiteFooter setView={setView}/>}

      {/* ── FLOATING MESSENGER BUTTON ── */}
      <MessengerBubble/>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');
        @keyframes tin    { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fup    { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bounce { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
        @keyframes pulse  { 0%,100%{box-shadow:0 0 0 0 rgba(0,132,255,0.5)} 70%{box-shadow:0 0 0 12px rgba(0,132,255,0)} }
        @keyframes msgIn  { from{opacity:0;transform:translateY(10px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-thumb{background:${B.amber};border-radius:3px}
      `}</style>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// MESSENGER BUBBLE — floating chat button on every page
// ═══════════════════════════════════════════════════════════════════════════════
function MessengerBubble() {
  const [open, setOpen]       = useState(false);
  const [nudge, setNudge]     = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Show a nudge tooltip after 8 seconds if not interacted
  useEffect(()=>{
    const t = setTimeout(()=>{ if(!open && !dismissed) setNudge(true); }, 8000);
    return ()=>clearTimeout(t);
  },[open, dismissed]);

  const dismiss = () => { setNudge(false); setDismissed(true); };

  return (
    <div style={{position:"fixed", bottom:20, right:20, zIndex:9000, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:10}}>

      {/* Tooltip nudge */}
      {nudge && !open && (
        <div style={{
          background:"#fff", borderRadius:16, padding:"12px 16px",
          boxShadow:"0 6px 24px rgba(0,0,0,0.15)", maxWidth:220,
          animation:"msgIn .3s ease", position:"relative",
          border:"1px solid #E8F0FE",
        }}>
          <button onClick={dismiss} style={{position:"absolute",top:6,right:8,background:"none",border:"none",cursor:"pointer",fontSize:14,color:"#999",lineHeight:1}}>×</button>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#0084FF,#0052CC)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>💬</div>
            <div style={{fontWeight:700,fontSize:13,color:"#1a1a1a",fontFamily:"'Trebuchet MS',sans-serif"}}>To A "T" Boutique</div>
          </div>
          <div style={{fontSize:12,color:"#555",fontFamily:"'Trebuchet MS',sans-serif",lineHeight:1.5}}>
            Hi! 👋 Have a question about a custom order? Message Tiffani directly!
          </div>
          <a href={FB_URL} target="_blank" rel="noreferrer" onClick={dismiss} style={{
            display:"block", marginTop:10, textAlign:"center",
            background:"linear-gradient(135deg,#0084FF,#0052CC)",
            color:"#fff", borderRadius:10, padding:"8px",
            fontSize:12, fontWeight:700, textDecoration:"none",
            fontFamily:"'Trebuchet MS',sans-serif",
          }}>
            Open Messenger →
          </a>
          {/* Bubble tail */}
          <div style={{position:"absolute",bottom:-8,right:22,width:0,height:0,borderLeft:"8px solid transparent",borderRight:"8px solid transparent",borderTop:"8px solid #fff",filter:"drop-shadow(0 2px 2px rgba(0,0,0,0.08))"}}/>
        </div>
      )}

      {/* Popup panel when button clicked */}
      {open && (
        <div style={{
          background:"#fff", borderRadius:18, overflow:"hidden",
          boxShadow:"0 8px 32px rgba(0,0,0,0.18)", width:280,
          animation:"msgIn .25s ease", border:"1px solid #E8F0FE",
        }}>
          {/* Header */}
          <div style={{background:"linear-gradient(135deg,#0084FF,#0052CC)", padding:"16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <img src="/logo.jpg" alt="logo" style={{width:40,height:40,borderRadius:"50%",objectFit:"cover",border:"2px solid rgba(255,255,255,0.4)"}}/>
                <div>
                  <div style={{color:"#fff",fontWeight:700,fontSize:14,fontFamily:"'Trebuchet MS',sans-serif"}}>To A "T" Boutique</div>
                  <div style={{color:"rgba(255,255,255,0.8)",fontSize:11,fontFamily:"'Trebuchet MS',sans-serif"}}>Typically replies within a few hours</div>
                </div>
              </div>
              <button onClick={()=>setOpen(false)} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",color:"#fff",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
          </div>
          {/* Body */}
          <div style={{padding:"16px"}}>
            <div style={{background:"#F0F2F5",borderRadius:14,borderBottomLeftRadius:4,padding:"10px 14px",marginBottom:14}}>
              <div style={{fontSize:13,color:"#1a1a1a",fontFamily:"'Trebuchet MS',sans-serif",lineHeight:1.5}}>
                Hi there! 👋 Need help with a custom order or have a question? I'd love to help! Send me a message on Messenger.
              </div>
              <div style={{fontSize:10,color:"#888",marginTop:4,fontFamily:"'Trebuchet MS',sans-serif"}}>Tiffani · To A "T" Boutique</div>
            </div>
            <a href={FB_URL} target="_blank" rel="noreferrer" style={{
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              background:"linear-gradient(135deg,#0084FF,#0052CC)",
              color:"#fff", borderRadius:12, padding:"12px",
              fontWeight:700, fontSize:14, textDecoration:"none",
              fontFamily:"'Trebuchet MS',sans-serif",
              boxShadow:"0 4px 14px rgba(0,132,255,0.35)",
            }}>
              <span style={{fontSize:18}}>💬</span> Continue on Messenger
            </a>
            <div style={{fontSize:10,color:"#aaa",textAlign:"center",marginTop:8,fontFamily:"'Trebuchet MS',sans-serif"}}>
              Opens Facebook Messenger
            </div>
          </div>
        </div>
      )}

      {/* Main bubble button */}
      <button
        onClick={()=>{ setOpen(o=>!o); setNudge(false); setDismissed(true); }}
        style={{
          width:56, height:56, borderRadius:"50%",
          background:"linear-gradient(135deg,#0084FF,#0052CC)",
          border:"none", cursor:"pointer",
          boxShadow:"0 4px 20px rgba(0,132,255,0.45)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:26, transition:"transform .2s",
          animation: nudge ? "pulse 2s infinite" : "none",
        }}
        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"}
        onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WELCOME / LANDING PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function Welcome({setView, show}) {
  const [phone, setPhone]   = useState("");
  const [rec, setRec]       = useState(null);
  const [looked, setLooked] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  const lookup = async () => {
    const clean = phone.replace(/\D/g,"");
    if(clean.length < 10){ show("Enter a valid phone number","err"); return; }
    const { customer: found, orders: myOrders } = await lookupCustomer(phone);
    setRec(found);
    setLooked(true);
    if(found && Array.isArray(myOrders) && myOrders.length>0) {
      const o = myOrders[0]; // already sorted newest-first by the server
      setLastOrder({...o, items: pi(o)});
    }
  };

  const avail = availableRewards(rec);

  return (
    <div style={{maxWidth:820, margin:"0 auto", padding:"24px 16px"}}>

      {/* Hero */}
      <div style={{background:`linear-gradient(160deg,${B.greenDk},${B.green})`, borderRadius:20, padding:"32px 20px", textAlign:"center", marginBottom:20, boxShadow:`0 8px 32px rgba(46,92,62,0.3)`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14,marginBottom:14}}>
          <img src="/logo.jpg" alt="To A T Boutique" style={{width:90,height:90,borderRadius:"50%",objectFit:"cover",boxShadow:"0 4px 18px rgba(0,0,0,0.3)",border:"3px solid rgba(255,255,255,0.5)"}}/>
          <div style={{textAlign:"left"}}>
            <div style={{fontFamily:"'Dancing Script','Georgia',cursive", fontSize:36, fontWeight:700, color:"#fff", lineHeight:1.1,textShadow:"0 2px 6px rgba(0,0,0,0.3)"}}>To A "T"</div>
            <div style={{fontFamily:"'Dancing Script','Georgia',cursive", fontSize:22, fontWeight:700, color:"rgba(255,255,255,0.9)", lineHeight:1}}>Boutique</div>
          </div>
        </div>
        <div style={{color:"rgba(255,255,255,0.92)", fontSize:15, lineHeight:1.7, marginBottom:6}}>
          Custom t-shirts, tumblers & gifts made with love
        </div>
        <div style={{color:"rgba(255,255,255,0.75)", fontSize:13}}>📍 New Market, AL &nbsp;·&nbsp; 📦 $8 flat rate shipping</div>
        <div style={{display:"flex", justifyContent:"center", gap:16, marginTop:16, flexWrap:"wrap"}}>
          {[["⭐","98% Recommend"],["👕","2,600+ Orders"],["🎨","Custom Designs"],["💚","Made with Love"]].map(([icon,txt])=>(
            <div key={txt} style={{background:"rgba(255,255,255,0.15)", borderRadius:10, padding:"8px 14px", color:"#fff", fontSize:12, fontWeight:600}}>
              {icon} {txt}
            </div>
          ))}
        </div>
      </div>

      {/* Returning customer lookup */}
      <div style={{background:"#fff", borderRadius:18, padding:"20px", boxShadow:"0 4px 18px rgba(0,0,0,0.08)", marginBottom:20}}>
        <div style={{fontFamily:"'Dancing Script','Georgia',cursive", fontSize:22, color:B.text, marginBottom:4}}>Welcome Back?</div>
        <div style={{fontSize:13, color:B.textLt, marginBottom:14}}>Enter your phone number to see your order history and loyalty rewards.</div>
        <div style={{display:"flex", gap:10}}>
          <input value={phone} onChange={e=>{setPhone(e.target.value);setLooked(false);setRec(null);setLastOrder(null);}} onKeyDown={e=>e.key==="Enter"&&lookup()} placeholder="(555) 555-5555" type="tel" style={{...INP(),flex:1}}/>
          <button onClick={lookup} style={{...PBTN, width:"auto", padding:"10px 18px", whiteSpace:"nowrap"}}>Look Up →</button>
        </div>

        {/* Returning customer card */}
        {looked && rec && (
          <div style={{marginTop:16, animation:"fup .4s ease"}}>
            <div style={{background:`linear-gradient(135deg,${B.greenDk},${B.green})`, borderRadius:14, padding:"16px 18px", color:"#fff", marginBottom:12}}>
              <div style={{fontSize:18, fontWeight:700, marginBottom:4}}>Hey {rec.name||'there'}! 👋</div>
              <div style={{display:"flex", gap:20, flexWrap:"wrap", fontSize:13, opacity:.9}}>
                <span>👕 {rec.total_shirts||0} shirts ordered</span>
                <span>⭐ {rec.earned_rewards||0} rewards earned</span>
                {avail>0 && <span style={{color:"#FFD700", fontWeight:700}}>🎁 {avail} free shirt{avail>1?"s":""} ready!</span>}
              </div>
              {avail>0 && (
                <div style={{marginTop:10, background:"rgba(255,215,0,0.15)", border:"1px solid rgba(255,215,0,0.4)", borderRadius:8, padding:"8px 12px"}}>
                  <div style={{fontSize:11, color:"#FFD700", fontWeight:700}}>Your Reward Code</div>
                  <div style={{fontSize:16, fontWeight:700, letterSpacing:2, fontFamily:"monospace"}}>{rewardCode(rec.phone||'')}</div>
                </div>
              )}
            </div>

            {/* Last order quick reorder */}
            {lastOrder && (
              <div style={{background:B.amberPale, borderRadius:14, padding:"14px 16px", border:`1px solid ${B.wood}`, marginBottom:12}}>
                <div style={{fontSize:12, color:B.textLt, marginBottom:6, textTransform:"uppercase", letterSpacing:1}}>Last Order · {lastOrder.date}</div>
                <div style={{display:"flex", flexWrap:"wrap", gap:5, marginBottom:10}}>
                  {pi(lastOrder).map((item,i)=>(
                    <span key={i} style={{fontSize:12, background:"#fff", color:B.textMid, borderRadius:6, padding:"3px 9px", border:`1px solid ${B.wood}`}}>
                      {item.design} · {item.color} {item.size} ×{item.qty}{item.brand?` · ${item.brand}`:""}{item.price?` · $${item.price}`:""}
                    </span>
                  ))}
                </div>
                <div style={{display:"flex", gap:9, flexWrap:"wrap"}}>
                  <button onClick={()=>setView("store")} style={{...PBTN, width:"auto", flex:1, padding:"10px 16px", fontSize:13}}>
                    🔁 Reorder Similar
                  </button>
                  <button onClick={()=>setView("status")} style={{flex:1, padding:"10px 16px", borderRadius:12, border:`2px solid ${B.green}`, background:"#fff", color:B.green, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'Trebuchet MS',sans-serif"}}>
                    📦 Check Order Status
                  </button>
                </div>
              </div>
            )}

            <button onClick={()=>setView("store")} style={{...PBTN, fontSize:14}}>🛍️ Place New Order</button>
          </div>
        )}

        {looked && !rec && (
          <div style={{marginTop:14, background:B.cream, borderRadius:12, padding:"14px", textAlign:"center"}}>
            <div style={{fontSize:13, color:B.textMid}}>No account found — you must be new here! 👋</div>
            <button onClick={()=>setView("store")} style={{...PBTN, marginTop:12, fontSize:13}}>Browse Designs →</button>
          </div>
        )}
      </div>

      {/* New customer CTA */}
      {!looked && (
        <div style={{background:"#fff", borderRadius:18, padding:"20px", boxShadow:"0 4px 18px rgba(0,0,0,0.08)", marginBottom:20}}>
          <div style={{fontFamily:"'Dancing Script','Georgia',cursive", fontSize:22, color:B.text, marginBottom:4}}>New Here?</div>
          <div style={{fontSize:13, color:B.textLt, marginBottom:16, lineHeight:1.6}}>Browse our designs, customize your shirt, and submit your order in minutes. It's that easy!</div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16}}>
            {[["🎨","Pick a Design","Browse categories or upload your own"],["👕","Customize It","Choose color, size & quantity"],["📬","Submit","We'll reach out to confirm & collect payment"]].map(([icon,title,desc])=>(
              <div key={title} style={{background:B.cream, borderRadius:12, padding:"14px 10px", textAlign:"center"}}>
                <div style={{fontSize:26, marginBottom:6}}>{icon}</div>
                <div style={{fontSize:12, fontWeight:700, color:B.text, marginBottom:3}}>{title}</div>
                <div style={{fontSize:11, color:B.textLt, lineHeight:1.4}}>{desc}</div>
              </div>
            ))}
          </div>
          <button onClick={()=>setView("store")} style={PBTN}>🛍️ Start Shopping</button>
        </div>
      )}

      {/* Trust row */}
      <div style={{background:"#fff", borderRadius:18, padding:"18px 20px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
        <div style={{fontWeight:700, color:B.text, marginBottom:14, fontSize:14}}>Why Customers Love Us</div>
        {[["⚡","Fast Turnaround","Most orders ready in 5–7 business days"],["🎁","Loyalty Rewards","Every 10 shirts earns you a free one"],["💌","Personal Service","Tiffani handles every order personally"],["📦","Easy Shipping","$8 flat rate or free pickup in New Market, AL"]].map(([icon,title,desc])=>(
          <div key={title} style={{display:"flex", gap:12, alignItems:"flex-start", padding:"10px 0", borderBottom:`1px solid ${B.creamDk}`}}>
            <span style={{fontSize:22, flexShrink:0}}>{icon}</span>
            <div>
              <div style={{fontSize:13, fontWeight:700, color:B.text}}>{title}</div>
              <div style={{fontSize:12, color:B.textLt, marginTop:1}}>{desc}</div>
            </div>
          </div>
        ))}
        <div style={{display:"flex", gap:10, marginTop:14}}>
          <a href={FB_URL} target="_blank" rel="noreferrer" style={{flex:1, display:"block", padding:"11px", borderRadius:12, background:"#0084FF", color:"#fff", textAlign:"center", fontWeight:700, fontSize:13, textDecoration:"none", fontFamily:"'Trebuchet MS',sans-serif"}}>
            💬 Message on Facebook
          </a>
          <button onClick={()=>setView("contact")} style={{flex:1, padding:"11px", borderRadius:12, border:`2px solid ${B.green}`, background:"#fff", color:B.green, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'Trebuchet MS',sans-serif"}}>
            ❓ Get Help
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORDER STATUS LOOKUP
// ═══════════════════════════════════════════════════════════════════════════════
function OrderStatus({show}) {
  const [phone, setPhone]   = useState("");
  const [myOrders, setMyOrders] = useState([]);
  const [looked, setLooked] = useState(false);
  const [rec, setRec]       = useState(null);

  const lookup = async () => {
    const clean = phone.replace(/\D/g,"");
    if(clean.length < 10){ show("Enter a valid phone number","err"); return; }
    const { customer: cust, orders: found } = await lookupCustomer(phone);
    setMyOrders(Array.isArray(found)?found.map(o=>({...o,customer_name:o.customer_name,items:pi(o)})):[]);
    setRec(cust);
    setLooked(true);
  };

  const STEP_MAP = {
    "New":         {step:1, msg:"Order received! Tiffani will confirm details soon."},
    "In Progress": {step:2, msg:"Your order is being made — it's in production!"},
    "Ready":       {step:3, msg:"Your order is ready! Time to arrange pickup or expect shipping soon."},
    "Shipped":     {step:4, msg:"Your order is on its way! 📦"},
    "Picked Up":   {step:4, msg:"Order picked up — enjoy your shirts!"},
    "Complete":    {step:4, msg:"Order complete! Thanks for shopping with us 💚"},
  };

  const STEPS = ["Order Placed","In Production","Ready","Complete"];

  return (
    <div style={{maxWidth:740, margin:"0 auto", padding:"24px 16px"}}>
      <h2 style={{fontSize:26, color:B.text, fontFamily:"'Dancing Script','Georgia',cursive", marginBottom:6}}>Track Your Order</h2>
      <p style={{color:B.textLt, fontSize:14, marginBottom:20}}>Enter the phone number you used when ordering.</p>

      <div style={{background:"#fff", borderRadius:16, padding:"18px", boxShadow:"0 4px 18px rgba(0,0,0,0.08)", marginBottom:18}}>
        <Lbl>Your Phone Number</Lbl>
        <div style={{display:"flex", gap:10}}>
          <input value={phone} onChange={e=>{setPhone(e.target.value);setLooked(false);}} onKeyDown={e=>e.key==="Enter"&&lookup()} placeholder="(555) 555-5555" type="tel" style={{...INP(),flex:1}}/>
          <button onClick={lookup} style={{...PBTN, width:"auto", padding:"10px 18px", whiteSpace:"nowrap"}}>Find →</button>
        </div>
      </div>

      {looked && myOrders.length===0 && (
        <div style={{background:"#fff", borderRadius:16, padding:"28px", textAlign:"center", boxShadow:"0 4px 18px rgba(0,0,0,0.08)"}}>
          <div style={{fontSize:36, marginBottom:10}}>🔍</div>
          <div style={{fontWeight:600, color:B.text, marginBottom:6}}>No orders found</div>
          <div style={{fontSize:13, color:B.textLt, marginBottom:16}}>Double-check the phone number you used when ordering, or message Tiffani directly.</div>
          <a href={FB_URL} target="_blank" rel="noreferrer" style={{display:"inline-block", padding:"10px 22px", borderRadius:12, background:"#0084FF", color:"#fff", fontWeight:700, fontSize:13, textDecoration:"none", fontFamily:"'Trebuchet MS',sans-serif"}}>
            💬 Message on Facebook
          </a>
        </div>
      )}

      {looked && myOrders.length>0 && (
        <div style={{animation:"fup .4s ease"}}>
          {rec && (
            <div style={{background:`linear-gradient(135deg,${B.greenDk},${B.green})`, borderRadius:14, padding:"14px 16px", color:"#fff", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8}}>
              <div>
                <div style={{fontWeight:700, fontSize:16}}>Hi {rec.name||'there'}! 👋</div>
                <div style={{fontSize:12, opacity:.8, marginTop:2}}>⭐ {rec.total_shirts||0} total shirts · {availableRewards(rec) > 0 ? `🎁 ${availableRewards(rec)} reward${availableRewards(rec)>1?"s":""} available!`:"Keep going!"}</div>
              </div>
              <div style={{fontSize:13, opacity:.85}}>{myOrders.length} order{myOrders.length!==1?"s":""} found</div>
            </div>
          )}

          {myOrders.map(order=>{
            const sm  = STATUS_META[order.status]||STATUS_META["New"];
            const si  = STEP_MAP[order.status]||{step:1,msg:""};
            const qty = pi(order).reduce((s,i)=>s+Number(i.qty||0),0);
            return (
              <div key={order.id} style={{background:"#fff", borderRadius:16, padding:"18px", boxShadow:"0 3px 16px rgba(0,0,0,0.09)", marginBottom:14, borderTop:`4px solid ${sm.dot}`}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14, flexWrap:"wrap", gap:8}}>
                  <div>
                    <div style={{fontWeight:700, color:B.text, fontSize:15}}>Order from {order.date}</div>
                    <div style={{fontSize:12, color:B.textLt, marginTop:2}}>{order.delivery} · {qty} shirt{qty!==1?"s":""}</div>
                  </div>
                  <span style={{background:sm.bg, color:sm.color, borderRadius:20, padding:"5px 14px", fontSize:13, fontWeight:700}}>● {order.status}</span>
                </div>

                {/* Progress bar */}
                <div style={{marginBottom:14}}>
                  <div style={{display:"flex", justifyContent:"space-between", marginBottom:6}}>
                    {STEPS.map((s,i)=>(
                      <div key={s} style={{fontSize:9, textTransform:"uppercase", letterSpacing:.5, color:i<si.step?B.green:B.textLt, fontWeight:i+1===si.step?700:400, textAlign:"center", flex:1}}>{s}</div>
                    ))}
                  </div>
                  <div style={{height:6, background:B.creamDk, borderRadius:3}}>
                    <div style={{height:"100%", background:`linear-gradient(90deg,${B.greenDk},${B.green})`, borderRadius:3, width:`${(si.step/4)*100}%`, transition:"width .5s ease"}}/>
                  </div>
                  <div style={{fontSize:12, color:B.green, fontWeight:600, marginTop:6}}>{si.msg}</div>
                </div>

                {/* Items */}
                <div style={{display:"flex", flexWrap:"wrap", gap:6, marginBottom:12}}>
                  {pi(order).map((item,i)=>(
                    <span key={i} style={{fontSize:12, background:B.amberPale, color:B.textMid, borderRadius:6, padding:"3px 9px"}}>{item.design} · {item.color} {item.size} ×{item.qty}{item.brand?` · ${item.brand}`:""}{item.price?` · $${item.price}`:""}</span>
                  ))}
                </div>

                {/* Payment status */}
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderTop:`1px solid ${B.creamDk}`}}>
                  <span style={{fontSize:13, color:B.textMid}}>Payment: <strong>{order.payment_method||order.paymentMethod||'Pending'}</strong></span>
                  <span style={{fontSize:13, fontWeight:700, color:order.paid?"#27AE60":"#C0392B"}}>{order.paid?"✓ Paid":"⏳ Payment Pending"}</span>
                </div>

                {/* Notes */}
                {order.notes && <div style={{marginTop:8, fontSize:12, color:B.textLt, fontStyle:"italic"}}>Note: {order.notes}</div>}
              </div>
            );
          })}

          <div style={{textAlign:"center", marginTop:4}}>
            <a href={FB_URL} target="_blank" rel="noreferrer" style={{display:"inline-block", padding:"11px 24px", borderRadius:12, background:"#0084FF", color:"#fff", fontWeight:700, fontSize:13, textDecoration:"none", fontFamily:"'Trebuchet MS',sans-serif"}}>
              💬 Questions? Message Tiffani
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STOREFRONT
// ═══════════════════════════════════════════════════════════════════════════════
function Storefront({cats, show}) {
  const [step,setStep]           = useState(1);
  const [cat,setCat]             = useState(null);
  // Designs synced from Google Drive (Supabase `designs` table), grouped by category
  const [syncedByCat,setSyncedByCat] = useState({});
  useEffect(()=>{
    db.getAll("designs","drive_id,name,category,image_url,thumb_url,active").then(rows=>{
      const grouped = {};
      (rows||[]).filter(d=>d.active!==false).forEach(d=>{
        const cn = (d.category||"Other").trim();
        (grouped[cn] = grouped[cn] || []).push({
          id: "drive-"+d.drive_id,
          name: d.name,
          image_url: d.image_url,
          thumb_url: d.thumb_url || d.image_url,
        });
      });
      setSyncedByCat(grouped);
    });
  },[]);

  // Merge admin categories with Drive-synced designs. Any Drive category not
  // already in the admin list still shows up so nothing gets lost.
  const mergedCats = useMemo(()=>{
    const out = cats.map(c=>{
      const synced = syncedByCat[c.name] || [];
      return { ...c, designs: [...(c.designs||[]), ...synced] };
    });
    Object.keys(syncedByCat).forEach(cn=>{
      if (!cats.some(c=>c.name===cn)) {
        out.push({ id:"drive-cat-"+cn, name:cn, emoji:"🎨", designs: syncedByCat[cn] });
      }
    });
    return out;
  }, [cats, syncedByCat]);

  const [design,setDesign]       = useState(null);
  const [uploadImg,setUploadImg] = useState(null);
  const [color,setColor]         = useState(getBrandColors(DEFAULT_PRODUCT_ID)[0]);
  const [items,setItems]         = useState([{size:"",qty:1}]);
  const [ageId,setAgeId]           = useState("adult");
  const [productId,setProductId]   = useState(DEFAULT_PRODUCT_ID);
  const product     = getProduct(productId);
  const brandColors = getBrandColors(productId);
  const [placement,setPlacement] = useState([]);
  const [delivery,setDelivery]   = useState("Pickup");
  const [cust,setCust]           = useState({name:"",phone:"",email:"",notes:""});
  const [loyRec,setLoyRec]       = useState(null);
  const [useReward,setUseReward] = useState(false);
  // Cart persists across refreshes/redeploys via localStorage so it's never lost.
  const [cart,setCart]           = useState(()=>{
    try { const saved = localStorage.getItem("tatb_cart"); return saved ? JSON.parse(saved) : []; }
    catch { return []; }
  }); // array of configured design lines
  useEffect(()=>{
    try { localStorage.setItem("tatb_cart", JSON.stringify(cart)); } catch {}
  },[cart]);
  const fileRef                  = useRef();

  // When age group changes, default to the first product in that group
  const pickAge = (newAge) => {
    setAgeId(newAge);
    const first = CATALOG[newAge].brands[0].styles[0].id;
    setProductId(first);
    setColor(getBrandColors(first)[0]);
  };

  // Reset only the current design configuration (keeps cart + customer info)
  const resetDesign = () => { setCat(null);setDesign(null);setUploadImg(null);setItems([{size:"",qty:1}]);setPlacement([]);setAgeId("adult");setProductId(DEFAULT_PRODUCT_ID);setColor(getBrandColors(DEFAULT_PRODUCT_ID)[0]); };

  // Full reset — clears everything including the cart (after a completed order)
  const reset = () => { setStep(1);setCart([]);setDelivery("Pickup");setCust({name:"",phone:"",email:"",notes:""});setLoyRec(null);setUseReward(false);resetDesign(); };

  const totalQty = items.reduce((s,i)=>s+Number(i.qty||0),0);

  // Validate the current design, package it as a cart line, and add it.
  const addToCart = (goToCart) => {
    if(!design){show("Please pick a design first","err");return;}
    if(design?.isUpload && !uploadImg){show("Please upload your design image","err");return;}
    if(items.some(i=>!i.size)){show("Please select a size for each item","err");return;}
    if(placement.length===0){show("Please select at least one print placement","err");return;}
    const line = {
      id: Date.now()+"-"+Math.random().toString(36).slice(2,7),
      designName: design?.isUpload ? "Custom Upload" : design?.name,
      isUpload: !!design?.isUpload,
      uploadImg: uploadImg || design?.thumb_url || design?.image_url || null,
      productId, productName: product.name,
      colorName: color.name, colorHex: color.hex,
      placement: [...placement],
      items: items.filter(i=>i.size).map(i=>({size:i.size, qty:Number(i.qty)||1})),
    };
    setCart(prev=>[...prev, line]);
    show("Added to cart! 🛒","ok");
    if (goToCart) { setStep(5); } else { resetDesign(); setStep(1); }
  };

  const removeCartLine = (id) => setCart(prev=>prev.filter(l=>l.id!==id));

  const lineTotal = (line) => line.items.reduce((s,i)=>s + getPrice(line.productId,i.size)*i.qty, 0);
  const cartTotal = cart.reduce((s,l)=>s+lineTotal(l),0);
  const cartQty   = cart.reduce((s,l)=>s+l.items.reduce((a,i)=>a+i.qty,0),0);

  const onPhoneBlur = async () => {
    if (cust.phone.replace(/\D/g,"").length>=10) {
      const { customer } = await lookupCustomer(cust.phone);
      setLoyRec(customer);
    }
  };

  const onUpload = (e) => {
    const f=e.target.files[0]; if(!f) return;
    if(f.size>5*1024*1024){show("Image must be under 5MB","err");return;}
    const r=new FileReader(); r.onload=ev=>setUploadImg(ev.target.result); r.readAsDataURL(f);
  };

  const [paying,setPaying]       = useState(false);
  const [shippingAddr,setShippingAddr] = useState({line1:"",city:"",state:"",zip:""});

  const shirtTotal = cart.reduce((s,l)=>s+l.items.reduce((a,i)=>a+getPrice(l.productId,i.size)*i.qty,0),0);
  const shipCost   = delivery==="Ship" ? 8 : 0;
  // Reward = one free shirt: discount equals the single highest-priced shirt in the cart.
  const allShirtPrices = cart.flatMap(l=>l.items.flatMap(i=>Array(i.qty).fill(getPrice(l.productId,i.size))));
  const rewardDiscount = (useReward && allShirtPrices.length>0) ? Math.max(...allShirtPrices) : 0;
  const grandTotal = Math.max(0, shirtTotal + shipCost - rewardDiscount);

  const submit = async () => {
    if(cart.length===0){show("Your cart is empty","err");return;}
    if(!cust.name.trim()){show("Please enter your name","err");return;}
    if(!cust.phone.replace(/\D/g,"")){show("Please enter your phone number","err");return;}
    if(delivery==="Ship" && !shippingAddr.line1.trim()){show("Please enter your shipping address","err");return;}
    if(delivery==="Ship" && !shippingAddr.zip.trim()){show("Please enter your zip code","err");return;}

    // Flatten every cart line's sizes into individual order items,
    // each carrying that line's own design/placement/style/brand.
    const orderItems = cart.flatMap(line =>
      line.items.map(i=>({
        design: line.designName,
        color: line.colorName,
        size: i.size,
        qty: i.qty,
        hasUpload: line.isUpload,
        placement: line.placement.join(", "),
        brand: line.productName,
        price: getPrice(line.productId, i.size),
      }))
    );

    const shippingFull = delivery==="Ship"
      ? `${shippingAddr.line1}, ${shippingAddr.city}, ${shippingAddr.state} ${shippingAddr.zip}`
      : "";

    setPaying(true);
    try {
      const res = await fetch("/.netlify/functions/create-checkout", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          items: orderItems,
          delivery,
          shippingAddress: shippingFull,
          rewardDiscount: rewardDiscount,
          orderData: {
            customerName: cust.name,
            phone: cust.phone,
            email: cust.email,
            notes: (useReward?`[REWARD: ${rewardCode(cust.phone)}] `:"")+cust.notes,
            usingReward: useReward,
            placement: cart.map(l=>l.placement.join(", ")).join(" | "),
          }
        })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // redirect to Stripe
      } else {
        throw new Error(data.error || "Checkout failed");
      }
    } catch(err) {
      show(`Payment error: ${err.message}`,"err");
      setPaying(false);
    }
  };

  const STEPS = ["Design","Customize","Cart","Your Info","Done!"];
  // Map internal step numbers (1,2,3,5,6,7) to progress index
  const progressIndex = step===1?1 : step===2?1 : step===3?2 : step===5?3 : step===6?4 : 5;

  return (
    <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 16px"}}>
      {/* Floating cart button — pinned to screen, reachable anytime while ordering */}
      {step!==5 && step!==7 && (
        <button onClick={()=>setStep(5)} style={{
          position:"fixed", bottom:20, left:20, zIndex:1000,
          display:"flex", alignItems:"center", gap:8,
          background:cart.length>0?B.green:"#fff", color:cart.length>0?"#fff":B.green,
          border:cart.length>0?"none":`2px solid ${B.green}`,
          borderRadius:30, padding:"13px 20px", cursor:"pointer",
          fontFamily:"'Trebuchet MS',sans-serif", fontWeight:700, fontSize:14,
          boxShadow:"0 4px 16px rgba(0,0,0,0.22)",
          transition:"transform .15s, box-shadow .15s",
        }}
          onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,0.28)";}}
          onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.22)";}}>
          {cart.length>0 ? `🛒 Cart (${cartQty}) · $${cartTotal}` : "🛒 View Cart"}
        </button>
      )}
      {step<5 && (
        <div style={{marginBottom:24}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            {STEPS.map((l,i)=><div key={i} style={{fontSize:10,color:i+1<=progressIndex?B.green:"#bbb",fontWeight:i+1===progressIndex?700:400,letterSpacing:1,textTransform:"uppercase"}}>{l}</div>)}
          </div>
          <div style={{height:4,background:B.creamDk,borderRadius:2}}>
            <div style={{height:"100%",background:`linear-gradient(90deg,${B.greenDk},${B.amber})`,borderRadius:2,width:`${((progressIndex-1)/4)*100}%`,transition:"width .4s ease"}}/>
          </div>
        </div>
      )}

      {/* STEP 1 — Category */}
      {step===1 && (
        <div style={{animation:"fup .4s ease"}}>
          <h2 style={{fontSize:30,color:B.text,marginBottom:6,fontFamily:"'Dancing Script','Georgia',cursive"}}>What are you looking for?</h2>
          <p style={{color:B.textLt,marginBottom:22,fontSize:14}}>Pick a category to browse designs</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:14}}>
            {mergedCats.map(c=>{
              const cover = (c.designs||[]).find(d=>d.thumb_url||d.image_url);
              const coverSrc = cover ? (cover.thumb_url||cover.image_url) : null;
              return (
              <div key={c.id} onClick={()=>{setCat(c);setStep(2);}} style={{background:"#fff",borderRadius:16,padding:"20px 14px",textAlign:"center",cursor:"pointer",boxShadow:"0 2px 12px rgba(0,0,0,0.07)",border:"2px solid transparent",transition:"all .2s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=B.green;e.currentTarget.style.transform="translateY(-3px)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="transparent";e.currentTarget.style.transform="";}}>
                {coverSrc
                  ? <div style={{height:70,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8}}><img src={coverSrc} alt={c.name} loading="lazy" style={{maxHeight:70,maxWidth:"100%",objectFit:"contain"}}/></div>
                  : <div style={{fontSize:34,marginBottom:8}}>{c.emoji}</div>}
                <div style={{fontSize:13,fontWeight:700,color:B.text}}>{c.name}</div>
                <div style={{fontSize:11,color:B.textLt,marginTop:3}}>{c.designs.length} design{c.designs.length!==1?"s":""}</div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 2 — Design */}
      {step===2 && cat && (
        <div style={{animation:"fup .4s ease"}}>
          <button onClick={()=>setStep(1)} style={BBTN}>← Back</button>
          <h2 style={{fontSize:24,color:B.text,marginBottom:6,fontFamily:"'Dancing Script','Georgia',cursive"}}>{cat.emoji} {cat.name}</h2>
          <p style={{color:B.textLt,marginBottom:20,fontSize:14}}>Tap a design to continue</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:14}}>
            {cat.designs.map(d=>(
              <div key={d.id} onClick={()=>{setDesign(d);setUploadImg(null);setStep(3);}} style={{background:"#fff",borderRadius:16,padding:"14px",cursor:"pointer",boxShadow:"0 2px 12px rgba(0,0,0,0.07)",border:"2px solid transparent",transition:"all .2s",textAlign:"center"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=B.green;e.currentTarget.style.transform="translateY(-2px)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="transparent";e.currentTarget.style.transform="";}}>
                {d.image_url
                  ? <div style={{height:120,position:"relative",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                      <img src={d.thumb_url||d.image_url} alt={d.name} loading="lazy" style={{maxHeight:120,maxWidth:"100%",objectFit:"contain"}}/>
                      <div aria-hidden="true" style={{position:"absolute",inset:0,pointerEvents:"none",display:"flex",flexWrap:"wrap",alignContent:"center",justifyContent:"center",transform:"rotate(-22deg)",overflow:"hidden"}}>
                        {Array.from({length:5}).map((_,i)=>(
                          <span key={i} style={{flex:"0 0 100%",textAlign:"center",fontFamily:"'Trebuchet MS',sans-serif",fontWeight:700,fontSize:11,letterSpacing:1,color:"rgba(120,120,120,0.30)",textShadow:"0 1px 1px rgba(255,255,255,0.25)",lineHeight:2.2,whiteSpace:"nowrap",userSelect:"none"}}>To A "T" Boutique</span>
                        ))}
                      </div>
                    </div>
                  : <ShirtSVG color={SHIRT_COLORS[0]} design={d} size={120}/>}
                <div style={{fontSize:13,fontWeight:700,color:B.text,marginTop:6}}>{d.name}</div>
                {d.isUpload && <div style={{fontSize:11,color:B.green,marginTop:2}}>📤 Upload your image</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3 — Customize */}
      {step===3 && design && (
        <div style={{animation:"fup .4s ease"}}>
          <button onClick={()=>setStep(2)} style={BBTN}>← Back</button>
          <h2 style={{fontSize:24,color:B.text,marginBottom:18,fontFamily:"'Dancing Script','Georgia',cursive"}}>Customize Your Shirt</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))",gap:24,alignItems:"start"}}>
            {/* Preview */}
            <div style={{background:"#fff",borderRadius:20,padding:"22px",boxShadow:"0 4px 20px rgba(0,0,0,0.08)",textAlign:"center",position:"sticky",top:80,minWidth:0}}>
              <div style={{fontSize:10,color:B.textLt,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Live Preview</div>
              <ShirtSVG color={color} design={design} uploadImg={uploadImg || design?.thumb_url || design?.image_url} productId={productId} size={260}/>
              <div style={{marginTop:8,fontSize:12,color:B.textLt}}>{color.name} · {design.name}</div>
              <div style={{marginTop:4,fontSize:10,color:B.textLt,opacity:0.7}}>build v1.4 · style: {productId}</div>
            </div>
            {/* Controls */}
            <div style={{minWidth:0}}>
              {/* Print File — available for all designs */}
              <div style={{marginBottom:20}}>
                <Lbl>
                  {design.isUpload ? "Upload Your Design Image *" : "Your Print File (Optional — upload your own or use our design)"}
                </Lbl>
                <div onClick={()=>fileRef.current.click()} style={{border:`2px dashed ${!uploadImg?B.amber:B.greenLt}`,borderRadius:14,padding:"18px 16px",textAlign:"center",cursor:"pointer",background:B.cream,transition:"all .2s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=B.creamDk}
                  onMouseLeave={e=>e.currentTarget.style.background=B.cream}>
                  {uploadImg
                    ? <div><img src={uploadImg} alt="upload" style={{maxHeight:90,maxWidth:"100%",borderRadius:8,marginBottom:6}}/><div style={{fontSize:12,color:B.green,fontWeight:600}}>✓ Tap to change</div></div>
                    : <div>
                        <div style={{fontSize:30,marginBottom:5}}>📤</div>
                        <div style={{fontSize:13,color:B.textMid,fontWeight:600}}>Upload Your File</div>
                        <div style={{fontSize:11,color:B.textLt,marginTop:3}}>JPG, PNG, PDF, AI — max 5MB · Up to 12″×15″ print area</div>
                        {!design.isUpload && <div style={{fontSize:11,color:B.textLt,marginTop:4}}>Leave blank to use the "{design.name}" design above</div>}
                      </div>
                  }
                </div>
                <input ref={fileRef} type="file" accept="image/*,.pdf,.ai,.eps" style={{display:"none"}} onChange={onUpload}/>
                {uploadImg && (
                  <button onClick={()=>setUploadImg(null)} style={{marginTop:6,fontSize:11,color:"#C0392B",background:"none",border:"none",cursor:"pointer",padding:0}}>
                    ✕ Remove file
                  </button>
                )}
              </div>
              {/* Age group */}
              <div style={{marginBottom:16}}>
                <Lbl>Who's it for?</Lbl>
                <div style={{display:"flex",gap:10,marginTop:6}}>
                  {Object.entries(CATALOG).map(([aId,age])=>(
                    <button key={aId} onClick={()=>pickAge(aId)} style={{
                      flex:1, padding:"10px 8px", borderRadius:10, border:"2px solid",
                      borderColor:ageId===aId?B.green:"#ddd",
                      background:ageId===aId?B.greenPale:"#fff",
                      cursor:"pointer", transition:"all .15s",
                      fontSize:13, fontWeight:700, color:ageId===aId?B.green:B.text, fontFamily:"'Trebuchet MS',sans-serif",
                    }}>{age.label}</button>
                  ))}
                </div>
              </div>
              {/* Brand → Style */}
              <div style={{marginBottom:20}}>
                <Lbl>Brand & Style</Lbl>
                <div style={{display:"flex",flexDirection:"column",gap:14,marginTop:6}}>
                  {CATALOG[ageId].brands.map(b=>(
                    <div key={b.id}>
                      <div style={{fontSize:12,fontWeight:700,color:B.textMid,fontFamily:"'Trebuchet MS',sans-serif",marginBottom:6}}>{b.name}</div>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {b.styles.map(s=>{
                          const sel = productId===s.id;
                          return (
                            <button key={s.id} onClick={()=>{ setProductId(s.id); setColor(getBrandColors(s.id)[0]); }} style={{
                              display:"flex", alignItems:"center", justifyContent:"space-between",
                              padding:"11px 13px", borderRadius:10, border:"2px solid",
                              borderColor:sel?B.green:"#ddd",
                              background:sel?B.greenPale:"#fff",
                              cursor:"pointer", transition:"all .15s", textAlign:"left",
                            }}>
                              <div>
                                <div style={{fontSize:14,fontWeight:700,color:sel?B.green:B.text,fontFamily:"'Trebuchet MS',sans-serif"}}>{s.label}</div>
                                <div style={{fontSize:11,color:B.textLt,fontFamily:"'Trebuchet MS',sans-serif",marginTop:2}}>{s.desc}</div>
                              </div>
                              <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
                                <div style={{fontSize:13,fontWeight:700,color:sel?B.green:B.textMid,fontFamily:"'Trebuchet MS',sans-serif"}}>${s.basePrice}</div>
                                {s.bigPrice>s.basePrice && <div style={{fontSize:10,color:B.textLt,fontFamily:"'Trebuchet MS',sans-serif"}}>2XL+ ${s.bigPrice}</div>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Color */}
              <div style={{marginBottom:20}}>
                <Lbl>Shirt Color — <strong style={{color:B.green}}>{color.name}</strong></Lbl>
                <div style={{display:"flex",flexWrap:"wrap",gap:7,marginTop:6}}>
                  {brandColors.map(c=>(
                    <div key={c.name} onClick={()=>setColor(c)} title={c.name} style={{width:30,height:30,borderRadius:"50%",background:c.hex,cursor:"pointer",border:color.name===c.name?`3px solid ${B.green}`:"2px solid rgba(0,0,0,0.1)",boxShadow:color.name===c.name?`0 0 0 2px rgba(74,124,89,0.3)`:"none",transition:"all .15s"}}/>
                  ))}
                </div>
              </div>
              {/* Sizes */}
              <div style={{marginBottom:20}}>
                <Lbl>Sizes & Quantities</Lbl>
                {items.map((item,idx)=>(
                  <div key={idx} style={{display:"flex",gap:8,alignItems:"center",marginTop:8}}>
                    <select value={item.size} onChange={e=>{const it=[...items];it[idx].size=e.target.value;setItems(it);}} style={{...INP(),flex:1}}>
                      <option value="">Pick size</option>
                      {getSizesForBrand(productId).map(s=><option key={s}>{s}</option>)}
                    </select>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <button onClick={()=>{const it=[...items];it[idx].qty=Math.max(1,it[idx].qty-1);setItems(it);}} style={{width:28,height:28,borderRadius:7,border:`2px solid ${B.wood}`,background:"#fff",cursor:"pointer",fontSize:15,fontWeight:700,color:B.green}}>−</button>
                      <span style={{width:26,textAlign:"center",fontWeight:700}}>{item.qty}</span>
                      <button onClick={()=>{const it=[...items];it[idx].qty=it[idx].qty+1;setItems(it);}} style={{width:28,height:28,borderRadius:7,border:`2px solid ${B.wood}`,background:"#fff",cursor:"pointer",fontSize:15,fontWeight:700,color:B.green}}>+</button>
                    </div>
                    {items.length>1 && <button onClick={()=>setItems(items.filter((_,i)=>i!==idx))} style={{background:"none",border:"none",color:"#C0392B",cursor:"pointer",fontSize:18,padding:"0 2px"}}>×</button>}
                  </div>
                ))}
                <button onClick={()=>setItems([...items,{size:"",qty:1}])} style={{marginTop:8,fontSize:12,color:B.green,background:"none",border:`2px dashed ${B.amber}`,borderRadius:8,padding:"5px 12px",cursor:"pointer",fontWeight:600}}>+ Add Size</button>
              </div>
              {/* Placement */}
              <div style={{marginBottom:22}}>
                <Lbl>Print Placement <span style={{color:B.textLt,fontWeight:400}}>(select all that apply)</span></Lbl>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:6}}>
                  {[
                    {id:"front_full",    label:"Front Full",     icon:"👕", desc:"Center chest, full front"},
                    {id:"front_pocket",  label:"Front Pocket",   icon:"🔲", desc:"Left chest pocket area"},
                    {id:"back_full",     label:"Back Full",      icon:"🔄", desc:"Full back print"},
                    {id:"back_top",      label:"Back Top/Yoke",  icon:"⬆️", desc:"Upper back / shoulder"},
                    {id:"sleeve",        label:"Sleeve",         icon:"💪", desc:"Left or right sleeve"},
                    {id:"other",         label:"Other / Ask Me", icon:"💬", desc:"Describe in notes"},
                  ].map(p=>{
                    const sel = placement.includes(p.id);
                    return (
                      <button key={p.id} onClick={()=>setPlacement(prev=>sel?prev.filter(x=>x!==p.id):[...prev,p.id])} style={{
                        display:"flex", alignItems:"center", gap:8, padding:"10px 12px",
                        borderRadius:10, border:"2px solid", textAlign:"left",
                        borderColor: sel ? B.green : "#ddd",
                        background: sel ? B.greenPale : "#fff",
                        cursor:"pointer", transition:"all .15s",
                      }}>
                        <span style={{fontSize:20,flexShrink:0}}>{p.icon}</span>
                        <div>
                          <div style={{fontSize:12,fontWeight:700,color:sel?B.green:B.text,fontFamily:"'Trebuchet MS',sans-serif"}}>{p.label}</div>
                          <div style={{fontSize:10,color:B.textLt,fontFamily:"'Trebuchet MS',sans-serif"}}>{p.desc}</div>
                        </div>
                        {sel && <span style={{marginLeft:"auto",color:B.green,fontSize:14,flexShrink:0}}>✓</span>}
                      </button>
                    );
                  })}
                </div>
                {placement.length===0 && <div style={{fontSize:11,color:B.amber,marginTop:6,fontFamily:"'Trebuchet MS',sans-serif"}}>⚠️ Please select at least one placement</div>}
              </div>
              {/* Price total */}
              {items.some(i=>i.size) && (
                <div style={{background:B.greenPale,borderRadius:12,padding:"12px 14px",marginBottom:14,border:`1.5px solid ${B.greenLt}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:13,color:B.green,fontWeight:600,fontFamily:"'Trebuchet MS',sans-serif"}}>
                      Estimated Total
                      <div style={{fontSize:11,color:B.textLt,fontWeight:400,marginTop:1}}>+ $8 shipping if not pickup</div>
                    </div>
                    <div style={{fontSize:22,fontWeight:700,color:B.green,fontFamily:"'Trebuchet MS',sans-serif"}}>
                      ${calcTotal(productId, items.filter(i=>i.size))}
                    </div>
                  </div>
                  <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:5}}>
                    {items.filter(i=>i.size).map((i,idx)=>(
                      <span key={idx} style={{fontSize:11,background:"#fff",color:B.textMid,borderRadius:6,padding:"2px 8px",border:`1px solid ${B.wood}`,fontFamily:"'Trebuchet MS',sans-serif"}}>
                        {i.size} ×{i.qty} = ${getPrice(productId,i.size)*Number(i.qty)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <button onClick={()=>addToCart(false)} style={{...PBTN,background:"#fff",color:B.green,border:`2px solid ${B.green}`}}>🛒 Add to Cart & Keep Shopping</button>
                <button onClick={()=>addToCart(true)} style={PBTN}>Add to Cart & Checkout →</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5 — Cart */}
      {step===5 && (
        <div style={{animation:"fup .4s ease",maxWidth:680,margin:"0 auto"}}>
          <button onClick={()=>{resetDesign();setStep(1);}} style={BBTN}>← {cart.length>0?"Add Another Design":"Browse Designs"}</button>
          <h2 style={{fontSize:26,color:B.text,marginBottom:6,fontFamily:"'Dancing Script','Georgia',cursive"}}>Your Cart</h2>
          {cart.length===0 ? (
            <div style={{textAlign:"center",padding:"40px 20px",color:B.textLt}}>
              <div style={{fontSize:48,marginBottom:12}}>🛒</div>
              <p style={{fontSize:14,marginBottom:20}}>Your cart is empty.</p>
              <button onClick={()=>{resetDesign();setStep(1);}} style={{...PBTN,maxWidth:240,margin:"0 auto"}}>Browse Designs</button>
            </div>
          ) : (
            <>
              <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:18}}>
                {cart.map(line=>(
                  <div key={line.id} style={{background:"#fff",borderRadius:14,padding:"14px",boxShadow:"0 2px 12px rgba(0,0,0,0.07)",display:"flex",gap:12,alignItems:"flex-start"}}>
                    <div style={{flexShrink:0}}>
                      <ShirtSVG color={{name:line.colorName,hex:line.colorHex}} design={line.isUpload?{isUpload:true}:{name:line.designName,style:"bold"}} uploadImg={line.uploadImg} productId={line.productId} size={72}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,color:B.text,fontSize:14}}>{line.designName}</div>
                      <div style={{color:B.textLt,fontSize:12,marginTop:2}}>{line.productName} · {line.colorName}</div>
                      <div style={{color:B.green,fontSize:12,marginTop:2,fontWeight:600}}>{line.items.map(i=>`${i.size}×${i.qty}`).join(", ")}</div>
                      {line.placement.length>0 && <div style={{fontSize:11,color:B.textLt,marginTop:2}}>📍 {line.placement.map(p=>p.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())).join(", ")}</div>}
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:15,fontWeight:700,color:B.green}}>${lineTotal(line)}</div>
                      <button onClick={()=>removeCartLine(line.id)} style={{marginTop:6,fontSize:11,color:"#C0392B",background:"none",border:"none",cursor:"pointer",padding:0}}>✕ Remove</button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{background:B.greenPale,borderRadius:12,padding:"14px 16px",marginBottom:16,border:`1.5px solid ${B.greenLt}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:14,fontWeight:700,color:B.green,fontFamily:"'Trebuchet MS',sans-serif"}}>{cartQty} shirt{cartQty!==1?"s":""} total</span>
                <span style={{fontSize:22,fontWeight:700,color:B.green,fontFamily:"'Trebuchet MS',sans-serif"}}>${cartTotal}</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <button onClick={()=>{resetDesign();setStep(1);}} style={{...PBTN,background:"#fff",color:B.green,border:`2px solid ${B.green}`}}>+ Add Another Design</button>
                <button onClick={()=>setStep(6)} style={PBTN}>Next: Your Info →</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP 6 — Info */}
      {step===6 && (
        <div style={{animation:"fup .4s ease",maxWidth:620,margin:"0 auto"}}>
          <button onClick={()=>setStep(5)} style={BBTN}>← Back to Cart</button>
          <h2 style={{fontSize:26,color:B.text,marginBottom:6,fontFamily:"'Dancing Script','Georgia',cursive"}}>Almost There!</h2>
          <p style={{color:B.textLt,marginBottom:18,fontSize:14}}>Your phone number tracks your loyalty rewards 🌟</p>
          {/* Cart summary */}
          <div style={{background:"#fff",borderRadius:14,padding:"14px",marginBottom:16,boxShadow:"0 2px 12px rgba(0,0,0,0.07)"}}>
            <div style={{fontSize:12,fontWeight:700,color:B.textMid,marginBottom:10,fontFamily:"'Trebuchet MS',sans-serif"}}>{cartQty} shirt{cartQty!==1?"s":""} · {cart.length} design{cart.length!==1?"s":""}</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {cart.map(line=>(
                <div key={line.id} style={{display:"flex",gap:10,alignItems:"center"}}>
                  <ShirtSVG color={{name:line.colorName,hex:line.colorHex}} design={line.isUpload?{isUpload:true}:{name:line.designName,style:"bold"}} uploadImg={line.uploadImg} productId={line.productId} size={48}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:B.text}}>{line.designName}</div>
                    <div style={{fontSize:11,color:B.textLt}}>{line.productName} · {line.colorName} · {line.items.map(i=>`${i.size}×${i.qty}`).join(", ")}</div>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:B.green}}>${lineTotal(line)}</div>
                </div>
              ))}
            </div>
          </div>
          {loyRec && <LoyaltyBar rec={loyRec}/>}
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div><Lbl>Your Name *</Lbl><input style={INP()} value={cust.name} onChange={e=>setCust({...cust,name:e.target.value})} placeholder="First & Last Name"/></div>
            <div>
              <Lbl>Phone Number * <span style={{color:B.green,fontWeight:600}}>(tracks loyalty rewards)</span></Lbl>
              <input style={INP()} value={cust.phone} onChange={e=>setCust({...cust,phone:e.target.value})} onBlur={onPhoneBlur} placeholder="(555) 555-5555" type="tel"/>
            </div>
            <div>
              <Lbl>Email <span style={{color:B.textLt,fontWeight:400}}>(optional — order updates &amp; receipt)</span></Lbl>
              <input style={INP()} value={cust.email} onChange={e=>setCust({...cust,email:e.target.value})} placeholder="you@example.com" type="email"/>
            </div>
            {/* Delivery — order level */}
            <div>
              <Lbl>Delivery</Lbl>
              <div style={{display:"flex",gap:10,marginTop:2}}>
                {["Pickup","Ship"].map(d=>(
                  <button key={d} onClick={()=>setDelivery(d)} style={{flex:1,padding:"10px",borderRadius:10,border:"2px solid",borderColor:delivery===d?B.green:"#ddd",background:delivery===d?B.green:"#fff",color:delivery===d?"#fff":"#888",fontFamily:"'Trebuchet MS',sans-serif",fontWeight:600,cursor:"pointer",fontSize:13}}>
                    {d==="Pickup"?"🏪 Pickup":"📦 Ship (+$8)"}
                  </button>
                ))}
              </div>
            </div>
            {/* Reward toggle */}
            {loyRec && availableRewards(loyRec)>0 && (
              <div style={{background:`linear-gradient(135deg,${B.greenDk},${B.green})`,borderRadius:12,padding:"14px",color:"#fff"}}>
                <div style={{fontSize:13,fontWeight:700,color:"#FFD700",marginBottom:6}}>🎁 You have a free shirt!</div>
                <div style={{fontSize:12,marginBottom:10,opacity:.9}}>Code: <span style={{fontFamily:"monospace",fontSize:15,color:"#FFD700",letterSpacing:2}}>{rewardCode(cust.phone)}</span></div>
                <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13}}>
                  <input type="checkbox" checked={useReward} onChange={e=>setUseReward(e.target.checked)} style={{width:16,height:16,accentColor:"#FFD700"}}/>
                  Apply my free shirt reward to this order
                </label>
              </div>
            )}
            <div><Lbl>Notes / Special Requests</Lbl><textarea style={{...INP(),height:70,resize:"vertical"}} value={cust.notes} onChange={e=>setCust({...cust,notes:e.target.value})} placeholder="Special instructions, alternate contact..."/></div>

            {/* Shipping address — only when Ship selected */}
            {delivery==="Ship" && (
              <div style={{background:B.amberPale,borderRadius:14,padding:"14px",border:`1.5px solid ${B.wood}`}}>
                <Lbl>📦 Shipping Address *</Lbl>
                <div style={{display:"flex",flexDirection:"column",gap:9}}>
                  <input style={INP()} value={shippingAddr.line1} onChange={e=>setShippingAddr({...shippingAddr,line1:e.target.value})} placeholder="Street Address"/>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 80px 100px",gap:9}}>
                    <input style={INP()} value={shippingAddr.city} onChange={e=>setShippingAddr({...shippingAddr,city:e.target.value})} placeholder="City"/>
                    <input style={INP()} value={shippingAddr.state} onChange={e=>setShippingAddr({...shippingAddr,state:e.target.value})} placeholder="AL" maxLength={2}/>
                    <input style={INP()} value={shippingAddr.zip} onChange={e=>setShippingAddr({...shippingAddr,zip:e.target.value})} placeholder="ZIP" maxLength={10} type="tel"/>
                  </div>
                </div>
              </div>
            )}

            {/* Order total */}
            <div style={{background:`linear-gradient(135deg,${B.greenDk},${B.green})`,borderRadius:14,padding:"16px 18px",color:"#fff"}}>
              <div style={{fontSize:13,opacity:.85,marginBottom:8}}>Order Summary</div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
                <span>{cartQty} shirt{cartQty!==1?"s":""} · {cart.length} design{cart.length!==1?"s":""}</span>
                <span>${shirtTotal}</span>
              </div>
              {delivery==="Ship" && (
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
                  <span>Shipping (flat rate)</span>
                  <span>$8.00</span>
                </div>
              )}
              {useReward && rewardDiscount>0 && (
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4,color:"#FFD700"}}>
                  <span>🎁 Free shirt reward</span>
                  <span>−${rewardDiscount}</span>
                </div>
              )}
              <div style={{borderTop:"1px solid rgba(255,255,255,0.3)",paddingTop:8,marginTop:4,display:"flex",justifyContent:"space-between",fontSize:18,fontWeight:700}}>
                <span>Total</span>
                <span>${grandTotal}</span>
              </div>
            </div>

            {/* Pay button */}
            <button onClick={submit} disabled={paying} style={{...PBTN, opacity:paying?.7:1, cursor:paying?"not-allowed":"pointer"}}>
              {paying ? "🔄 Redirecting to payment..." : `💳 Pay $${grandTotal} & Place Order`}
            </button>
            <div style={{textAlign:"center",fontSize:11,color:B.textLt}}>
              🔒 Secure payment powered by Stripe. You'll be redirected to complete payment.
            </div>
          </div>
        </div>
      )}

      {/* STEP 7 — Done */}
      {step===7 && (
        <div style={{textAlign:"center",padding:"60px 20px",animation:"fup .5s ease"}}>
          <div style={{fontSize:60,marginBottom:14}}>🎉</div>
          <h2 style={{fontSize:30,color:B.text,marginBottom:8,fontFamily:"'Dancing Script','Georgia',cursive"}}>Order Submitted!</h2>
          <p style={{color:B.textLt,fontSize:14,maxWidth:360,margin:"0 auto 26px"}}>Tiffani will reach out via Messenger to confirm details and payment.</p>
          <button onClick={reset} style={{...PBTN,maxWidth:220,margin:"0 auto"}}>Place Another Order</button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOYALTY VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function LoyaltyView({show}) {
  const [phone,setPhone] = useState("");
  const [rec,setRec]     = useState(null);
  const [looked,setLooked] = useState(false);

  const lookup = async () => {
    if(phone.replace(/\D/g,"").length<10){show("Enter a valid phone number","err");return;}
    const { customer: found } = await lookupCustomer(phone);
    setRec(found);
    setLooked(true);
  };

  const avail = availableRewards(rec);

  return (
    <div style={{maxWidth:620,margin:"0 auto",padding:"32px 16px"}}>
      <div style={{textAlign:"center",marginBottom:28}}>
        <div style={{fontSize:50,marginBottom:8}}>⭐</div>
        <h2 style={{fontSize:28,color:B.text,fontFamily:"'Dancing Script','Georgia',cursive",marginBottom:6}}>Loyalty Rewards</h2>
        <p style={{color:B.textLt,fontSize:14,maxWidth:320,margin:"0 auto"}}>Every 10 shirts earns you a free one. Enter your phone to check your balance.</p>
      </div>
      <div style={{background:"#fff",borderRadius:16,padding:"20px",boxShadow:"0 4px 18px rgba(0,0,0,0.08)",marginBottom:18}}>
        <Lbl>Your Phone Number</Lbl>
        <div style={{display:"flex",gap:10}}>
          <input value={phone} onChange={e=>{setPhone(e.target.value);setLooked(false);}} placeholder="(555) 555-5555" type="tel" style={{...INP(),flex:1}}/>
          <button onClick={lookup} style={{...PBTN,width:"auto",padding:"10px 18px",whiteSpace:"nowrap"}}>Check →</button>
        </div>
      </div>
      {looked && !rec && (
        <div style={{background:"#fff",borderRadius:16,padding:"28px",textAlign:"center",boxShadow:"0 4px 18px rgba(0,0,0,0.08)"}}>
          <div style={{fontSize:34,marginBottom:8}}>🔍</div>
          <div style={{fontWeight:600,color:B.text}}>No account found</div>
          <div style={{fontSize:13,color:B.textLt,marginTop:4}}>Place an order and your rewards will start tracking automatically!</div>
        </div>
      )}
      {looked && rec && (
        <div style={{animation:"fup .4s ease"}}>
          <LoyaltyBar rec={rec}/>
          <div style={{background:"#fff",borderRadius:16,padding:"18px",boxShadow:"0 4px 18px rgba(0,0,0,0.08)",marginBottom:16}}>
            <div style={{fontWeight:700,color:B.text,marginBottom:14}}>Your Stats</div>
            {[{l:"Total Shirts Ordered",v:rec.total_shirts||0},{l:"Free Shirts Earned",v:rec.earned_rewards||0},{l:"Rewards Redeemed",v:rec.redeemed_rewards||0},{l:"Available Rewards",v:avail,hi:avail>0},{l:"Member Since",v:rec.since}].map(row=>(
              <div key={row.l} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${B.creamDk}`}}>
                <span style={{fontSize:13,color:B.textLt}}>{row.l}</span>
                <span style={{fontSize:13,fontWeight:700,color:row.hi?"#DAA520":B.text}}>{row.v}{row.hi?" 🎁":""}</span>
              </div>
            ))}
          </div>
          {avail>0 && (
            <div style={{background:`linear-gradient(135deg,${B.greenDk},${B.green})`,borderRadius:14,padding:"18px",textAlign:"center",color:"#fff"}}>
              <div style={{fontSize:12,opacity:.8,marginBottom:4}}>Your reward code</div>
              <div style={{fontSize:22,fontWeight:700,letterSpacing:3,color:"#FFD700",fontFamily:"monospace"}}>{rewardCode(rec.phone||'')}</div>
              <div style={{fontSize:11,opacity:.65,marginTop:6}}>Mention this code when placing your next order!</div>
            </div>
          )}
        </div>
      )}
      <div style={{marginTop:20,background:"#fff",borderRadius:16,padding:"18px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
        <div style={{fontWeight:700,color:B.text,marginBottom:12}}>How It Works</div>
        {[["🛍️","Order shirts through the store or Messenger"],["📊","Every shirt counts — quantities add up automatically"],["🎁","Hit 10 shirts and earn a free shirt reward"],["💬","Mention your reward code when placing your next order"]].map(([icon,txt],i)=>(
          <div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 0",borderBottom:i<3?`1px solid ${B.creamDk}`:"none"}}>
            <span style={{fontSize:20}}>{icon}</span>
            <span style={{fontSize:13,color:B.textMid}}>{txt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGAL PAGES (Privacy / Terms / Refunds)
// Starter boilerplate for a small custom-apparel shop — not legal advice.
// Tiffani should read through and adjust anything that doesn't match how
// she actually runs the business before relying on it.
// ═══════════════════════════════════════════════════════════════════════════════
const LEGAL_CONTENT = {
  privacy: {
    title: "Privacy Policy",
    sections: [
      ["What we collect", "When you place an order, check your order status, or message us, we collect the information you give us: your name, phone number, delivery/shipping address if shipping, an email address if you choose to provide one, order details (design, size, color, notes), and any image you upload for a custom design."],
      ["Payment information", "Card payments are handled entirely by Stripe at checkout. We never see or store your full card number — Stripe processes the charge and only passes us confirmation that payment succeeded."],
      ["How we use it", "Your information is used to make and fulfill your order, track loyalty rewards by phone number, send you updates about your order if you gave us an email, and respond to questions sent through the Help tab or Messenger."],
      ["Who else sees it", "We share order and payment details with Stripe (payment processing), Resend (sending order/status emails), and Supabase (our database host). If you use the Help chat, your question is sent to Anthropic's Claude API to generate a reply. We don't sell your information to anyone."],
      ["Your choices", "Email is optional — orders and loyalty tracking work with just a phone number. You can ask us to remove your information by messaging Tiffani directly."],
    ],
  },
  terms: {
    title: "Terms of Service",
    sections: [
      ["Custom orders", "Every item is custom made to order — printed, and in some cases cut and sewn, specifically for you after you place your order. Production typically takes 5–7 business days; more complex or bulk orders may take longer, and we'll let you know if yours does."],
      ["Pricing & payment", "Prices shown at checkout are current at the time of your order. Payment is collected in full by card at checkout before production starts."],
      ["Your designs", "If you upload your own image or artwork, you're confirming you own it or have the right to use it. We reserve the right to decline any design that infringes on someone else's copyright or trademark, or that we otherwise find inappropriate."],
      ["Delivery", "Pickup is available in New Market, AL. Shipping is a flat rate and delivery times are estimates, not guarantees — we aren't responsible for carrier delays once a package ships."],
      ["Changes to these terms", "We may update these terms from time to time; the current version is always the one posted here."],
    ],
  },
  refunds: {
    title: "Returns & Refunds",
    sections: [
      ["Custom items are final sale", "Because every item is made specifically for your order, we generally can't accept returns or offer refunds for a change of mind, wrong size ordered, or similar — please double check your size and design before submitting."],
      ["Our mistakes & defects", "If your order arrives damaged, misprinted, or different from what you ordered, we'll make it right — a reprint or a refund. Message us on Messenger or through the Help tab with a photo within 7 days of receiving your order so we can take care of it quickly."],
      ["Order changes", "Need to change something after ordering? Message Tiffani as soon as possible — changes are usually possible before production starts, but can't be guaranteed once your order is in progress."],
    ],
  },
};

function LegalPage({page, show}) {
  const content = LEGAL_CONTENT[page];
  if (!content) return null;
  return (
    <div style={{maxWidth:680,margin:"0 auto",padding:"24px 16px 60px"}}>
      <h2 style={{fontSize:26,color:B.text,fontFamily:"'Dancing Script','Georgia',cursive",marginBottom:18}}>{content.title}</h2>
      <div style={{background:"#fff",borderRadius:16,padding:"22px",boxShadow:"0 4px 18px rgba(0,0,0,0.08)"}}>
        {content.sections.map(([heading,body],i)=>(
          <div key={heading} style={{marginBottom:i<content.sections.length-1?18:0}}>
            <div style={{fontWeight:700,color:B.text,fontSize:14,marginBottom:5}}>{heading}</div>
            <div style={{fontSize:13,color:B.textMid,lineHeight:1.6}}>{body}</div>
          </div>
        ))}
      </div>
      <p style={{fontSize:12,color:B.textLt,marginTop:16,textAlign:"center"}}>
        Questions? <a href={FB_URL} target="_blank" rel="noreferrer" style={{color:B.green,fontWeight:600}}>Message us on Messenger</a> or use the Help tab.
      </p>
    </div>
  );
}

function SiteFooter({setView}) {
  return (
    <div style={{textAlign:"center",padding:"28px 16px",fontSize:12,color:B.textLt}}>
      <div style={{display:"flex",justifyContent:"center",gap:16,flexWrap:"wrap",marginBottom:8}}>
        <a href="#" onClick={e=>{e.preventDefault();setView("privacy");window.scrollTo(0,0);}} style={{color:B.textLt,textDecoration:"underline",cursor:"pointer"}}>Privacy Policy</a>
        <a href="#" onClick={e=>{e.preventDefault();setView("terms");window.scrollTo(0,0);}} style={{color:B.textLt,textDecoration:"underline",cursor:"pointer"}}>Terms of Service</a>
        <a href="#" onClick={e=>{e.preventDefault();setView("refunds");window.scrollTo(0,0);}} style={{color:B.textLt,textDecoration:"underline",cursor:"pointer"}}>Returns &amp; Refunds</a>
      </div>
      <div>To A "T" Boutique · New Market, AL</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTACT / HELP
// ═══════════════════════════════════════════════════════════════════════════════
function ContactView({messages, setMessages, show}) {
  const [chatLog,setChatLog] = useState([{role:"bot",text:'Hi! 👋 I can answer quick questions about To A "T" Boutique — or tap a topic below. For custom work, reach out to Tiffani directly on Messenger!'}]);
  const [input,setInput]     = useState("");
  const [loading,setLoading] = useState(false);
  const [form,setForm]       = useState({name:"",phone:"",message:""});
  const [sent,setSent]       = useState(false);
  const chatEndRef           = useRef();

  useEffect(()=>{ chatEndRef.current?.scrollIntoView({behavior:"smooth"}); },[chatLog]);

  const askAI = async (q) => {
    const question = q||input.trim();
    if(!question) return;
    setInput("");
    setChatLog(h=>[...h,{role:"user",text:question}]);
    setLoading(true);

    // Check FAQ for instant answers first — no API needed
    const faq = FAQ.find(f=>f.q===question);
    if(faq) {
      setTimeout(()=>{ setChatLog(h=>[...h,{role:"bot",text:faq.a}]); setLoading(false); }, 400);
      return;
    }

    try {
      // chatLog[0] is always the canned greeting, not a real turn — drop it,
      // then keep the rest in order so the API sees an actual back-and-forth
      // instead of just the latest question with no memory of the chat.
      const apiMessages = chatLog
        .slice(1)
        .map(m=>({role: m.role==="bot" ? "assistant" : "user", content:m.text}))
        .concat([{role:"user",content:question}])
        .filter(m=>m.content);

      const res = await fetch("/.netlify/functions/chat",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ messages: apiMessages })
      });
      const data = await res.json();
      if (!res.ok || !data.reply) console.error("Help chat failed:", res.status, data.error || data);
      const reply = data.reply || "Sorry, I had trouble with that! Please message Tiffani directly on Messenger. 💬";
      setChatLog(h=>[...h,{role:"bot",text:reply}]);
    } catch(e) {
      console.error("Help chat request failed:", e.message);
      setChatLog(h=>[...h,{role:"bot",text:"Something went wrong on my end! Please message Tiffani on Messenger for help. 💬"}]);
    }
    setLoading(false);
  };

  const submitForm = async () => {
    if(!form.name.trim()||!form.message.trim()){show("Please fill in your name and message","err");return;}
    if(!form.phone.replace(/\D/g,"").trim()){show("Please enter your phone number so Tiffani can reach you","err");return;}
    const msg = {
      name: form.name,
      phone: form.phone,
      message: form.message,
      read: false,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),
    };
    // Saves the message (service key, server-side) and emails Tiffani in one call.
    try {
      const res = await fetch("/.netlify/functions/send-message-email", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify(msg),
      });
      const data = await res.json().catch(()=>null);
      if (data && data.saved) setMessages(prev=>[data.saved,...prev]);
    } catch(e) { console.warn("Message send failed:", e.message); }
    setSent(true);
    show("Message sent! Tiffani will follow up soon 💬");
  };

  return (
    <div style={{maxWidth:780,margin:"0 auto",padding:"24px 16px"}}>
      {/* Messenger CTA */}
      <div style={{background:"linear-gradient(135deg,#0084FF,#0066CC)",borderRadius:18,padding:"22px",marginBottom:18,textAlign:"center",boxShadow:"0 6px 24px rgba(0,132,255,0.3)"}}>
        <div style={{fontSize:38,marginBottom:6}}>💬</div>
        <div style={{fontFamily:"'Dancing Script','Georgia',cursive",fontSize:24,color:"#fff",marginBottom:5}}>Chat with Tiffani</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.88)",marginBottom:16,lineHeight:1.6}}>For custom designs, complex orders, or anything personal — message her directly on Facebook, or use the form below to leave your phone number and she'll call or text you back!</div>
        <a href={FB_URL} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:8,background:"#fff",color:"#0084FF",borderRadius:12,padding:"11px 24px",fontWeight:700,fontSize:15,textDecoration:"none",boxShadow:"0 4px 14px rgba(0,0,0,0.15)",fontFamily:"'Trebuchet MS',sans-serif"}}>
          📱 Open Messenger
        </a>
      </div>

      {/* AI Chat */}
      <div style={{background:"#fff",borderRadius:18,overflow:"hidden",boxShadow:"0 4px 18px rgba(0,0,0,0.08)",marginBottom:18}}>
        <div style={{background:B.creamDk,padding:"13px 16px",borderBottom:`1px solid ${B.wood}`}}>
          <div style={{fontWeight:700,color:B.text}}>🤖 Quick Help</div>
          <div style={{fontSize:12,color:B.textLt,marginTop:1}}>Instant answers to common questions</div>
        </div>
        <div style={{height:260,overflowY:"auto",padding:"14px",display:"flex",flexDirection:"column",gap:8}}>
          {chatLog.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
              <div style={{maxWidth:"80%",padding:"9px 13px",borderRadius:14,borderBottomRightRadius:m.role==="user"?3:14,borderBottomLeftRadius:m.role==="bot"?3:14,background:m.role==="user"?B.green:B.creamDk,color:m.role==="user"?"#fff":B.text,fontSize:13,lineHeight:1.5,fontFamily:"'Trebuchet MS',sans-serif"}}>{m.text}</div>
            </div>
          ))}
          {loading && <div style={{display:"flex",justifyContent:"flex-start"}}><div style={{background:B.creamDk,borderRadius:14,borderBottomLeftRadius:3,padding:"9px 14px",color:B.textLt,fontSize:13,fontFamily:"'Trebuchet MS',sans-serif"}}>typing...</div></div>}
          <div ref={chatEndRef}/>
        </div>
        <div style={{padding:"0 14px 8px",display:"flex",flexWrap:"wrap",gap:5}}>
          {FAQ.map(f=><button key={f.q} onClick={()=>askAI(f.q)} style={{background:B.greenPale,color:B.green,border:`1px solid ${B.greenLt}`,borderRadius:20,padding:"4px 11px",fontSize:11,cursor:"pointer",fontFamily:"'Trebuchet MS',sans-serif",fontWeight:600}}>{f.q}</button>)}
        </div>
        <div style={{padding:"0 14px 14px",display:"flex",gap:8}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&askAI()} placeholder="Ask a question..." style={{...INP(),flex:1}}/>
          <button onClick={()=>askAI()} disabled={!input.trim()||loading} style={{...PBTN,width:"auto",padding:"10px 16px",opacity:(!input.trim()||loading)?.5:1,cursor:(!input.trim()||loading)?"not-allowed":"pointer"}}>Send</button>
        </div>
      </div>

      {/* Contact Form */}
      <div style={{background:"#fff",borderRadius:18,padding:"18px",boxShadow:"0 4px 18px rgba(0,0,0,0.08)"}}>
        <div style={{fontWeight:700,color:B.text,marginBottom:3}}>📝 Leave a Message</div>
        <div style={{fontSize:12,color:B.textLt,marginBottom:14}}>Leave your name, phone number and message — Tiffani will text or call you back!</div>
        {sent
          ? <div style={{textAlign:"center",padding:"24px 16px",animation:"fup .4s ease"}}>
              <div style={{fontSize:44,marginBottom:8}}>✅</div>
              <div style={{fontFamily:"'Dancing Script','Georgia',cursive",fontSize:22,color:B.green,marginBottom:5}}>Message Sent!</div>
              <div style={{fontSize:13,color:B.textLt,marginBottom:14}}>Tiffani will reach out soon.</div>
              <button onClick={()=>{setSent(false);setForm({name:"",phone:"",message:""});}} style={{...PBTN,width:"auto",padding:"10px 22px"}}>Send Another</button>
            </div>
          : <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div><Lbl>Your Name *</Lbl><input style={INP()} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="First & Last Name"/></div>
              <div><Lbl>Your Phone Number * <span style={{color:B.textLt,fontWeight:400}}>(so Tiffani can text or call you back)</span></Lbl><input style={INP()} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="(555) 555-5555" type="tel"/></div>
              <div><Lbl>Message *</Lbl><textarea style={{...INP(),height:90,resize:"vertical"}} value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder="Tell her what you need..."/></div>
              <button onClick={submitForm} style={PBTN}>Send Message 💬</button>
            </div>
        }
      </div>
    </div>
  );
}

