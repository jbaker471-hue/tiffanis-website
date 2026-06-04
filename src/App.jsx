// To A "T" Boutique — Full System v1.0 (clean build)
import { useState, useEffect, useCallback, useRef } from "react";

// ─── BRAND ────────────────────────────────────────────────────────────────────
const B = {
  green:     "#4A7C59", greenDk: "#2E5C3E", greenLt: "#7AAB84", greenPale: "#EBF3ED",
  pink:      "#E8879A", pinkPale: "#FCEEF1",
  amber:     "#D4956A", amberPale: "#FDF3EB",
  cream:     "#F7F2EA", creamDk: "#EDE5D8",
  wood:      "#D9CDB8",
  text:      "#2C2218", textMid: "#6B5744", textLt: "#A08878",
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
// Brand-specific color palettes — real manufacturer colors
const BRAND_COLORS = {
  gildan: [
    {name:"White",hex:"#F5F5F0"},{name:"Black",hex:"#1C1C1C"},{name:"Sport Grey",hex:"#A8A9A4"},
    {name:"Dark Heather",hex:"#555E63"},{name:"Navy",hex:"#1B2A4A"},{name:"Royal",hex:"#2355A0"},
    {name:"Red",hex:"#C0392B"},{name:"Carolina Blue",hex:"#5B9BD5"},{name:"Irish Green",hex:"#2E7D32"},
    {name:"Forest Green",hex:"#2D5A3D"},{name:"Military Green",hex:"#4A5240"},{name:"Maroon",hex:"#6B1F2A"},
    {name:"Purple",hex:"#6A1B9A"},{name:"Light Pink",hex:"#F4A7B9"},{name:"Azalea",hex:"#E8739A"},
    {name:"Orange",hex:"#D4621B"},{name:"Gold",hex:"#C8922A"},{name:"Sand",hex:"#C8BA9A"},
    {name:"Ash",hex:"#D5D2C8"},{name:"Charcoal",hex:"#4A4A4A"},
  ],
  comfort: [
    {name:"White",hex:"#F5F5F0"},{name:"Black",hex:"#1C1C1C"},{name:"Ivory",hex:"#F0E8D0"},
    {name:"Pepper",hex:"#3A3A38"},{name:"Graphite",hex:"#5A5A5A"},{name:"Grey",hex:"#9A9A9A"},
    {name:"Navy",hex:"#1B2A4A"},{name:"True Navy",hex:"#162236"},{name:"Royal Caribe",hex:"#1A6BA0"},
    {name:"Lagoon Blue",hex:"#5B9BB5"},{name:"Washed Denim",hex:"#5B7A9A"},{name:"Chambray",hex:"#7A9AB5"},
    {name:"Red",hex:"#C0392B"},{name:"Crimson",hex:"#A01828"},{name:"Watermelon",hex:"#E05070"},
    {name:"Blossom",hex:"#E8A0B0"},{name:"Crunchberry",hex:"#C05878"},{name:"Violet",hex:"#7A50A0"},
    {name:"Lilac",hex:"#B09FCA"},{name:"Sage",hex:"#7D9E8C"},{name:"Moss",hex:"#5A7A50"},
    {name:"Emerald",hex:"#2D7A4A"},{name:"Forest",hex:"#2D5A3D"},{name:"Butter",hex:"#F0D878"},
    {name:"Mustard",hex:"#C8922A"},{name:"Terracotta",hex:"#C07850"},{name:"Yam",hex:"#C06030"},
    {name:"Pepper",hex:"#5A4030"},{name:"Hemp",hex:"#A09060"},{name:"Sand Dollar",hex:"#D8C8A8"},
  ],
  bella: [
    {name:"White",hex:"#F5F5F0"},{name:"Black",hex:"#1C1C1C"},{name:"White Fleck Tri",hex:"#E8E4DC"},
    {name:"Grey Tri",hex:"#A8A49C"},{name:"Dark Grey Heather",hex:"#505050"},{name:"Asphalt",hex:"#383838"},
    {name:"Navy",hex:"#1B2A4A"},{name:"Navy Tri",hex:"#2A3A5A"},{name:"True Royal",hex:"#2355A0"},
    {name:"Baby Blue",hex:"#A0C4D8"},{name:"Teal",hex:"#207878"},{name:"Deep Teal",hex:"#185858"},
    {name:"Red",hex:"#C0392B"},{name:"Red Tri",hex:"#C04040"},{name:"Mauve",hex:"#B08090"},
    {name:"Pink",hex:"#F4A7B9"},{name:"Pink Tri",hex:"#E898A8"},{name:"Berry",hex:"#882050"},
    {name:"Team Purple",hex:"#6A1B9A"},{name:"Lavender",hex:"#B09FCA"},{name:"Vintage Lilac",hex:"#987898"},
    {name:"Grass",hex:"#4A8A3A"},{name:"Leaf",hex:"#507840"},{name:"Forest",hex:"#2D5A3D"},
    {name:"Tan",hex:"#C8A878"},{name:"Natural",hex:"#E8D8B8"},{name:"Vintage White",hex:"#E8E0D0"},
    {name:"Gold",hex:"#C8922A"},{name:"Orange Triblend",hex:"#D07030"},{name:"Storm",hex:"#607080"},
  ],
};

// Default to comfort colors palette for backward compat
const SHIRT_COLORS = BRAND_COLORS.comfort;

// Get colors for a specific brand
function getBrandColors(brandId) {
  return BRAND_COLORS[brandId] || BRAND_COLORS.comfort;
}
const SIZES = ["YXS","YS","YM","YL","XS","S","M","L","XL","2XL","3XL","4XL"];
const BIG_SIZES = ["2XL","3XL","4XL"]; // upcharge sizes

const SHIRT_BRANDS = [
  {
    id:"gildan", name:"Gildan",
    desc:"Classic cotton, great for everyday wear",
    basePrice:17, bigPrice:20,
  },
  {
    id:"comfort", name:"Comfort Colors",
    desc:"Soft, pigment-dyed, vintage feel",
    basePrice:20, bigPrice:25,
  },
  {
    id:"bella", name:"Bella+Canvas",
    desc:"Soft tri-blend, fitted cut",
    basePrice:20, bigPrice:25,
  },
];

function getPrice(brandId, size) {
  const brand = SHIRT_BRANDS.find(b=>b.id===brandId) || SHIRT_BRANDS[0];
  return BIG_SIZES.includes(size) ? brand.bigPrice : brand.basePrice;
}

function calcTotal(brandId, items) {
  return items.reduce((sum,i)=>{
    const price = getPrice(brandId, i.size);
    return sum + (price * Number(i.qty||1));
  },0);
}
const PAYMENT_OPTS = ["Pending","Venmo","PayPal","Cash App","Pay at Pickup"];
const STATUSES = ["New","In Progress","Ready","Shipped","Picked Up","Complete"];
const STATUS_META = {
  "New":        {bg:"#FFF8E1",color:"#F57F17",dot:"#FFC107"},
  "In Progress":{bg:"#E3F2FD",color:"#0D47A1",dot:"#1976D2"},
  "Ready":      {bg:"#E8F5E9",color:"#1B5E20",dot:"#43A047"},
  "Shipped":    {bg:"#E0F7FA",color:"#006064",dot:"#00ACC1"},
  "Picked Up":  {bg:"#EDE7F6",color:"#4527A0",dot:"#7B1FA2"},
  "Complete":   {bg:"#ECEFF1",color:"#37474F",dot:"#78909C"},
};
const SHIRTS_FOR_REWARD = 10;
const FB_URL = "https://m.me/toatsublimationboutique";

const DEFAULT_CATS = [
  {id:"holiday",name:"Holiday & Seasonal",emoji:"🎄",designs:[
    {id:"h1",name:"Merry & Bright",emoji:"✨",preview:"MERRY\n& BRIGHT",style:"serif"},
    {id:"h2",name:"Ho Ho Ho",emoji:"🎅",preview:"HO HO\nHO!",style:"chunky"},
    {id:"h3",name:"Thankful Blessed",emoji:"🍂",preview:"Thankful\nBlessed",style:"script"},
    {id:"h4",name:"Spooky Season",emoji:"🎃",preview:"SPOOKY\nSEASON",style:"bold"},
  ]},
  {id:"family",name:"Family & Events",emoji:"👨‍👩‍👧‍👦",designs:[
    {id:"f1",name:"Family Vacation",emoji:"🌴",preview:"FAMILY\nVACATION\n2026",style:"bold"},
    {id:"f2",name:"Wolf Pack",emoji:"🐺",preview:"WOLF\nPACK",style:"bold"},
    {id:"f3",name:"Reunion Crew",emoji:"🤝",preview:"REUNION\nCREW",style:"serif"},
    {id:"f4",name:"New to the Pack",emoji:"🐾",preview:"NEW TO\nTHE PACK",style:"chunky"},
  ]},
  {id:"sports",name:"Sports & School",emoji:"🏈",designs:[
    {id:"s1",name:"Game Day",emoji:"🏟️",preview:"GAME\nDAY",style:"varsity"},
    {id:"s2",name:"Cheer Mom",emoji:"📣",preview:"CHEER\nMOM",style:"script"},
    {id:"s3",name:"Baseball Dad",emoji:"⚾",preview:"BASEBALL\nDAD",style:"varsity"},
    {id:"s4",name:"Team Spirit",emoji:"🏆",preview:"TEAM\nSPIRIT",style:"bold"},
  ]},
  {id:"gifts",name:"Gifts & Occasions",emoji:"🎁",designs:[
    {id:"g1",name:"Legend / Dad",emoji:"👨",preview:"LEGEND\nDAD\nPAPA",style:"bold"},
    {id:"g2",name:"Birthday Girl",emoji:"🎂",preview:"Birthday\nGirl",style:"script"},
    {id:"g3",name:"Bride Tribe",emoji:"💍",preview:"BRIDE\nTRIBE",style:"script"},
    {id:"g4",name:"Real Estate",emoji:"🏠",preview:"HOME\nSWEET\nHOME",style:"chunky"},
  ]},
  {id:"custom",name:"Custom Design",emoji:"📤",designs:[
    {id:"u1",name:"Upload My Image",emoji:"🖼️",preview:"",style:"upload",isUpload:true},
    {id:"u2",name:"Screenshot / Inspo",emoji:"📸",preview:"",style:"upload",isUpload:true},
    {id:"u3",name:"Logo or Artwork",emoji:"🎨",preview:"",style:"upload",isUpload:true},
  ]},
  {id:"dtf",name:"DTF Sheets",emoji:"🖨️",isDTF:true,designs:[
    {id:"d1",name:"4\u2033 × 4\u2033",emoji:"🔲",price:5,desc:"Small logo or icon"},
    {id:"d2",name:"5\u2033 × 5\u2033",emoji:"🔳",price:5,desc:"Standard small design"},
    {id:"d3",name:"8\u2033 × 10\u2033",emoji:"📄",price:5,desc:"Most popular size"},
    {id:"d4",name:"11\u2033 × 14\u2033",emoji:"📋",price:5,desc:"Large design / gang sheet"},
    {id:"d5",name:"11\u2033 × 17\u2033",emoji:"📰",price:5,desc:"Jumbo / full sheet"},
    {id:"d6",name:"Custom Size",emoji:"📐",price:null,desc:"Ask Tiffani for quote"},
  ]},
];

const FAQ = [
  {q:"What sizes do you carry?", a:"YXS through 4XL — youth and adult! If you need something specific just ask."},
  {q:"How much is shipping?",    a:"Flat $8 rate anywhere, or free pickup in New Market, AL!"},
  {q:"How do I pay?",            a:"Venmo, PayPal, Cash App, or cash at pickup. Payment is required upfront before production starts."},
  {q:"How long does it take?",   a:"Most orders are ready in 5–7 business days. She'll let you know if yours is more complex!"},
  {q:"Can I change my order?",   a:"Changes can usually be made before production starts — message Tiffani on Messenger ASAP!"},
  {q:"Do you do group orders?",  a:"Absolutely! Family and group orders are a specialty. Message Tiffani for bulk pricing."},
];

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const db = {
  async get(table) {
    try {
      const res = await fetch(`${SUPA_URL}/rest/v1/${table}?order=created_at.desc`, {
        headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json" }
      });
      if (!res.ok) { console.error(`DB get ${table} failed:`, res.status, await res.text()); return []; }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch(e) { console.error(`DB get ${table} error:`, e); return []; }
  },
  async insert(table, row) {
    try {
      const res = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
        method: "POST",
        headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify(row)
      });
      if (!res.ok) { const txt = await res.text(); console.error(`DB insert ${table} failed:`, res.status, txt); return null; }
      const data = await res.json();
      return Array.isArray(data) ? data[0] : data;
    } catch(e) { console.error(`DB insert ${table} error:`, e); return null; }
  },
  async update(table, id, changes) {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(changes)
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data[0] : data;
  },
  async delete(table, id) {
    await fetch(`${SUPA_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "DELETE",
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
    });
  },
  async upsertCustomer(phone, name, addShirts=0, redeem=false) {
    const clean = phone.replace(/\D/g,"");
    // Try to get existing
    const res = await fetch(`${SUPA_URL}/rest/v1/customers?phone=eq.${clean}`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
    });
    const existing = await res.json();
    if (existing && existing.length > 0) {
      const c = existing[0];
      const newTotal = c.total_shirts + addShirts;
      return db.update("customers", c.id, {
        name: name || c.name,
        total_shirts: newTotal,
        earned_rewards: Math.floor(newTotal / 10),
        redeemed_rewards: redeem ? c.redeemed_rewards + 1 : c.redeemed_rewards,
      });
    } else {
      return db.insert("customers", {
        phone: clean, name: name || "Customer",
        total_shirts: addShirts,
        earned_rewards: Math.floor(addShirts / 10),
        redeemed_rewards: 0,
        since: new Date().toLocaleDateString(),
      });
    }
  },
  async findCustomer(phone) {
    const clean = phone.replace(/\D/g,"");
    const res = await fetch(`${SUPA_URL}/rest/v1/customers?phone=eq.${clean}`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
    });
    const data = await res.json();
    return data && data.length > 0 ? data[0] : null;
  }
};

// Keep localStorage only for categories (admin config, not customer data)
const store = {
  get: (k,d) => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):d; } catch { return d; } },
  set: (k,v) => { try { localStorage.setItem(k,JSON.stringify(v)); } catch {} },
};

// ─── LOYALTY ──────────────────────────────────────────────────────────────────
function rewardCode(phone) { return `TATB-${phone.replace(/\D/g,"").slice(-4)}-FREE`; }
function findCustomer(customers, phone) {
  const c = phone.replace(/\D/g,"");
  return customers.find(x => x.phone.replace(/\D/g,"") === c) || null;
}
function upsertCustomer(customers, phone, name, addShirts=0, redeem=false) {
  const c = phone.replace(/\D/g,"");
  const ex = customers.find(x => x.phone.replace(/\D/g,"") === c);
  if (ex) {
    const total = (ex.total_shirts||0) + addShirts;
    return customers.map(x => x.phone.replace(/\D/g,"")===c
      ? {...x, name:name||x.name, total_shirts:total, earned_rewards:Math.floor(total/SHIRTS_FOR_REWARD), redeemed_rewards:redeem?(ex.redeemed_rewards||0)+1:(ex.redeemed_rewards||0)}
      : x);
  }
  return [...customers, {phone:c, name:name||"Customer", total_shirts:addShirts, earned_rewards:Math.floor(addShirts/SHIRTS_FOR_REWARD), redeemed_rewards:0, since:new Date().toLocaleDateString()}];
}

// ─── COLOR UTILS ──────────────────────────────────────────────────────────────
function isDark(hex) { const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return (r*299+g*587+b*114)/1000<128; }
function adj(hex,n) { return "#"+[1,3,5].map(i=>Math.min(255,Math.max(0,parseInt(hex.slice(i,i+2),16)+n)).toString(16).padStart(2,"0")).join(""); }

// ─── ITEM PARSER ─────────────────────────────────────────────────────────────
// ALL item access goes through this — handles JSON string from Supabase
function pi(o) {
  if (!o) return [];
  try {
    return typeof o.items === "string" ? JSON.parse(o.items||"[]") : (o.items||[]);
  } catch { return []; }
}

// ─── SHIRT MOCKUP ─────────────────────────────────────────────────────────────
const SHIRT_POCKET_SRC = "data:image/webp;base64,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";
const SHIRT_IMG_SRC = "data:image/png;base64,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";

function ShirtSVG({color=SHIRT_COLORS[0], design, uploadImg, shirtStyle="no-pocket", size=220}) {
  const hex    = color?.hex || "#F5F5F0";
  const dark   = isDark(hex);
  const lines  = (design?.preview||"").split("\n").slice(0,4);
  const st     = design?.style || "bold";
  const isUp   = st==="upload" || !!uploadImg;
  const imgH   = Math.round(size * 1.25);
  const isWhite = hex.toUpperCase() === "#F5F5F0";

  // Parse hex to 0-1 RGB for SVG feColorMatrix
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b2= parseInt(hex.slice(5,7),16)/255;

  const isPocket = shirtStyle === "pocket";
  const cLeft  = isPocket ? size * 0.12 : size * 0.20;
  const cTop   = isPocket ? imgH * 0.18  : imgH * 0.22;
  const cW     = isPocket ? size * 0.30  : size * 0.60;
  const cH     = isPocket ? imgH * 0.16  : imgH * 0.30;

  const maxLen = Math.max(...lines.map(l=>l.length), 1);
  const fSize  = Math.max(7, Math.min(isPocket?11:20, cW / maxLen * (isPocket?1.2:1.5)));
  const fontMap = {
    script:"'Georgia',serif", varsity:"'Georgia',serif",
    chunky:"'Arial Black',sans-serif", bold:"'Arial Black',sans-serif",
    serif:"'Georgia',serif",
  };
  const font = fontMap[st] || fontMap.bold;
  const filterId = `tint_${hex.slice(1)}`;
  const imgSrc = isPocket ? SHIRT_POCKET_SRC : SHIRT_IMG_SRC;

  return (
    <div style={{position:"relative", width:size, height:imgH, display:"inline-block", flexShrink:0, overflow:"hidden", borderRadius:8}}>

      {/* SVG layer handles the shirt photo + color tinting cleanly */}
      <svg
        width={size}
        height={imgH}
        style={{display:"block", position:"absolute", top:0, left:0}}
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
      >
        <defs>
          <filter id={filterId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feImage xlinkHref={imgSrc} result="srcImg" preserveAspectRatio="xMidYMid meet" x="0" y="0" width={size} height={imgH}/>
            <feFlood floodColor={hex} floodOpacity="1" result="colorLayer"/>
            <feBlend in="srcImg" in2="colorLayer" mode={isWhite?"normal":"multiply"} result="blended"/>
            <feComposite in="blended" in2="srcImg" operator="in"/>
          </filter>
        </defs>

        {/* Shirt image rendered through the tint filter */}
        {isPocket ? (
          <image
            href={imgSrc}
            filter={`url(#${filterId})`}
            x={-(size * 2.4 * 0.58)}
            y={-(imgH * 0.18)}
            width={size * 2.4}
            height="auto"
            preserveAspectRatio="xMidYMid meet"
          />
        ) : (
          <image
            href={imgSrc}
            filter={`url(#${filterId})`}
            x="0" y="0"
            width={size}
            height={imgH}
            preserveAspectRatio="xMidYMid slice"
          />
        )}
      </svg>

      {/* Color chip label */}
      <div style={{
        position:"absolute", bottom:6, left:"50%", transform:"translateX(-50%)",
        background:hex, border:"2px solid rgba(255,255,255,0.6)",
        borderRadius:20, padding:"3px 12px", fontSize:10,
        color:dark?"#fff":"#111", fontWeight:700, whiteSpace:"nowrap",
        boxShadow:"0 1px 4px rgba(0,0,0,0.2)", fontFamily:"'Trebuchet MS',sans-serif",
        zIndex:3,
      }}>
        {color.name}{isPocket ? " · Pocket" : ""}
      </div>

      {/* Design overlay on chest */}
      <div style={{
        position:"absolute", left:cLeft, top:cTop,
        width:cW, height:cH,
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        gap:1, pointerEvents:"none", zIndex:3,
      }}>
        {isUp && uploadImg && (
          <img src={uploadImg} alt="design" style={{maxWidth:"100%", maxHeight:"100%", objectFit:"contain", filter:"drop-shadow(0 1px 3px rgba(0,0,0,0.3))"}}/>
        )}
        {isUp && !uploadImg && (
          <div style={{border:"2px dashed rgba(0,0,0,0.25)", borderRadius:6, padding:"6px", textAlign:"center", background:"rgba(255,255,255,0.4)", width:"90%"}}>
            <div style={{fontSize:9, color:"rgba(0,0,0,0.45)", fontFamily:"sans-serif"}}>Upload Image</div>
          </div>
        )}
        {!isUp && lines.map((ln,i) => (
          <div key={i} style={{
            fontFamily:font, fontSize:fSize, fontWeight:900,
            fontStyle:st==="script"?"italic":"normal",
            letterSpacing:(st==="varsity"||st==="bold")?"2px":"0",
            color:dark?"#ffffff":"#111111",
            textShadow:dark?"0 1px 3px rgba(0,0,0,0.6)":"0 1px 2px rgba(255,255,255,0.7)",
            textAlign:"center", lineHeight:1.15, whiteSpace:"nowrap",
          }}>{ln}</div>
        ))}
      </div>
    </div>
  );
}

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
const INP = (extra={}) => ({width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${B.wood}`,fontSize:14,fontFamily:"'Trebuchet MS',sans-serif",background:"#fff",color:B.text,outline:"none",...extra});
const PBTN = {background:`linear-gradient(135deg,${B.greenDk},${B.green})`,color:"#fff",border:"none",borderRadius:12,padding:"12px 24px",cursor:"pointer",fontFamily:"'Trebuchet MS',sans-serif",fontWeight:700,fontSize:14,boxShadow:`0 4px 14px rgba(74,124,89,0.3)`,width:"100%"};
const BBTN = {background:"none",border:"none",color:B.green,cursor:"pointer",fontSize:14,fontWeight:600,padding:"0 0 14px 0",display:"block",fontFamily:"'Trebuchet MS',sans-serif"};
function Lbl({children}) { return <div style={{fontSize:12,color:B.textLt,marginBottom:5,fontFamily:"'Trebuchet MS',sans-serif"}}>{children}</div>; }
function SecHead({children}) { return <div style={{fontSize:11,letterSpacing:2,textTransform:"uppercase",color:B.amber,fontFamily:"'Trebuchet MS',sans-serif",fontWeight:700,marginBottom:10}}>{children}</div>; }

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [view, setView]           = useState("home");
  const [cats, setCats]           = useState(() => store.get("tatb_cats", DEFAULT_CATS));
  const [orders, setOrders]       = useState([]);
  const [customers, setCustomers] = useState([]);
  const [messages, setMessages]   = useState([]);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [loading, setLoading]     = useState(true);
  const {t, show}                 = useToast();

  // Keep categories in localStorage (admin config)
  useEffect(()=>{ store.set("tatb_cats",cats); },[cats]);

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
  useEffect(()=>{
    Promise.all([
      db.get("orders"),
      db.get("customers"),
      db.get("messages"),
    ]).then(([o,c,m])=>{
      setOrders(o||[]);
      setCustomers(c||[]);
      setMessages(m||[]);
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  const addOrder = useCallback(async (order) => {
    const o = {
      customer_name: order.customerName,
      phone: order.phone,
      delivery: order.delivery,
      notes: order.notes||"",
      using_reward: order.usingReward||false,
      brand: order.brand||"",
      shirt_style: order.shirt_style||"no-pocket",
      placement: order.placement||"",
      date: new Date().toLocaleDateString(),
      status: "New",
      paid: false,
      payment_method: "Pending",
      items: JSON.stringify(order.items||[]),
    };
    try {
      const saved = await db.insert("orders", o);
      if (saved) {
        setOrders(prev => [{...saved, items: o.items},...prev]);
      }
      if (order.phone) {
        const qty = (order.items||[]).reduce((s,i)=>s+Number(i.qty||0),0);
        const before = await db.findCustomer(order.phone);
        await db.upsertCustomer(order.phone, order.customerName, qty);
        const updated = await db.findCustomer(order.phone);
        if (updated && updated.earned_rewards > (before?.earned_rewards||0)) {
          show(`🏆 ${order.customerName} earned a free shirt!`,"gold");
        }
        const freshCusts = await db.get("customers");
        setCustomers(freshCusts||[]);
      }
      show("Order submitted! Tiffani will be in touch soon. 🎉");
    } catch(err) {
      console.error("Order save error:", err);
      show("Something went wrong saving your order. Please try again.","err");
    }
  },[show]);

  const TABS = [
    {id:"home",    label:"🏠 Home"},
    {id:"store",   label:"🛍️ Shop"},
    {id:"status",  label:"📦 My Order"},
    {id:"loyalty", label:"⭐ Rewards"},
    {id:"contact", label:"💬 Help"},
    {id:"admin",   label: adminUnlocked ? "🔓 Admin" : "⚙️ Admin"},
  ];

  const unread = messages.filter(m=>!m.read).length;

  return (
    <div style={{minHeight:"100vh",background:B.cream,fontFamily:"'Trebuchet MS',sans-serif"}}>
      <Toast t={t}/>
      {/* ── HEADER ── */}
      <div style={{background:`linear-gradient(180deg,${B.greenDk} 0%,${B.green} 60%,${B.greenLt} 100%)`,position:"sticky",top:0,zIndex:100,boxShadow:"0 4px 20px rgba(46,92,62,0.4)"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <div style={{padding:"12px 16px 8px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{background:"linear-gradient(160deg,#F2E8D4,#DDD0B0)",borderRadius:10,padding:"6px 14px",boxShadow:"0 3px 10px rgba(0,0,0,0.2)",border:`1px solid ${B.wood}`}}>
              <div style={{fontFamily:"'Dancing Script','Georgia',cursive",fontSize:22,fontWeight:700,color:B.text,lineHeight:1.1}}>To A "T"</div>
              <div style={{fontFamily:"'Dancing Script','Georgia',cursive",fontSize:16,fontWeight:700,color:B.textMid,lineHeight:1}}>Boutique</div>
            </div>
            <span style={{fontSize:22}}>🌵</span>
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
          <div style={{fontSize:48}}>🌵</div>
          <div style={{fontFamily:"'Dancing Script','Georgia',cursive",fontSize:22,color:B.green}}>Loading...</div>
          <div style={{fontSize:13,color:B.textLt}}>Connecting to the shop</div>
        </div>
      )}
      {!loading && view==="home"    && <Welcome setView={setView} customers={customers} orders={orders} show={show}/>}
      {!loading && view==="store"   && <Storefront cats={cats} addOrder={addOrder} customers={customers} show={show}/>}
      {!loading && view==="status"  && <OrderStatus orders={orders} customers={customers} show={show}/>}
      {!loading && view==="loyalty" && <LoyaltyView customers={customers} show={show}/>}
      {!loading && view==="tracker" && <Tracker orders={orders} setOrders={setOrders} customers={customers} setCustomers={setCustomers} show={show}/> }
      {!loading && view==="contact" && <ContactView messages={messages} setMessages={setMessages} show={show}/>}
      {!loading && view==="admin"   && (!adminUnlocked ? <AdminLock onUnlock={()=>setAdminUnlocked(true)} show={show}/> : <Admin cats={cats} setCats={setCats} orders={orders} setOrders={setOrders} customers={customers} setCustomers={setCustomers} messages={messages} setMessages={setMessages} onLock={()=>setAdminUnlocked(false)} show={show}/>)}

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
                <div style={{width:40,height:40,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🌵</div>
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
function Welcome({setView, customers, orders, show}) {
  const [phone, setPhone]   = useState("");
  const [rec, setRec]       = useState(null);
  const [looked, setLooked] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  const lookup = async () => {
    const clean = phone.replace(/\D/g,"");
    if(clean.length < 10){ show("Enter a valid phone number","err"); return; }
    const found = await db.findCustomer(phone);
    setRec(found);
    setLooked(true);
    if(found) {
      const res = await fetch(`${SUPA_URL}/rest/v1/orders?phone=eq.${clean}&order=created_at.desc&limit=1`,{
        headers:{ apikey:SUPA_KEY, Authorization:`Bearer ${SUPA_KEY}` }
      });
      const myOrders = await res.json();
      if(Array.isArray(myOrders) && myOrders.length>0) {
        const o = myOrders[0];
        setLastOrder({...o, items: pi(o)});
      }
    }
  };

  const avail = rec ? (rec.earned_rewards||0) - (rec.redeemed_rewards||0) : 0;

  return (
    <div style={{maxWidth:820, margin:"0 auto", padding:"24px 16px"}}>

      {/* Hero */}
      <div style={{background:`linear-gradient(160deg,${B.greenDk},${B.green})`, borderRadius:20, padding:"32px 20px", textAlign:"center", marginBottom:20, boxShadow:`0 8px 32px rgba(46,92,62,0.3)`}}>
        <div style={{background:"linear-gradient(160deg,#F2E8D4,#DDD0B0)", borderRadius:14, padding:"10px 22px", display:"inline-block", marginBottom:14, boxShadow:"0 3px 12px rgba(0,0,0,0.2)", border:`1px solid ${B.wood}`}}>
          <div style={{fontFamily:"'Dancing Script','Georgia',cursive", fontSize:38, fontWeight:700, color:B.text, lineHeight:1.1}}>To A "T"</div>
          <div style={{fontFamily:"'Dancing Script','Georgia',cursive", fontSize:24, fontWeight:700, color:B.textMid, lineHeight:1}}>Boutique</div>
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
                      {item.design} · {item.color} {item.size} ×{item.qty}{item.brand?` · ${item.brand}`:""}{item.shirt_style==="pocket"?" · Pocket":""}{item.price?` · $${item.price}`:""}
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
function OrderStatus({orders, customers, show}) {
  const [phone, setPhone]   = useState("");
  const [myOrders, setMyOrders] = useState([]);
  const [looked, setLooked] = useState(false);
  const [rec, setRec]       = useState(null);

  const lookup = async () => {
    const clean = phone.replace(/\D/g,"");
    if(clean.length < 10){ show("Enter a valid phone number","err"); return; }
    const res = await fetch(`${SUPA_URL}/rest/v1/orders?phone=eq.${clean}&order=created_at.desc`,{
      headers:{ apikey:SUPA_KEY, Authorization:`Bearer ${SUPA_KEY}` }
    });
    const found = await res.json();
    const cust  = await db.findCustomer(phone);
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
            💬 Message Tiffani
          </a>
        </div>
      )}

      {looked && myOrders.length>0 && (
        <div style={{animation:"fup .4s ease"}}>
          {rec && (
            <div style={{background:`linear-gradient(135deg,${B.greenDk},${B.green})`, borderRadius:14, padding:"14px 16px", color:"#fff", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8}}>
              <div>
                <div style={{fontWeight:700, fontSize:16}}>Hi {rec.name||'there'}! 👋</div>
                <div style={{fontSize:12, opacity:.8, marginTop:2}}>⭐ {rec.total_shirts||0} total shirts · {rec.earned_rewards||0-rec.redeemed_rewards||0 > 0 ? `🎁 ${rec.earned_rewards||0-rec.redeemed_rewards||0} reward${rec.earned_rewards||0-rec.redeemed_rewards||0>1?"s":""} available!`:"Keep going!"}</div>
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
                    <span key={i} style={{fontSize:12, background:B.amberPale, color:B.textMid, borderRadius:6, padding:"3px 9px"}}>{item.design} · {item.color} {item.size} ×{item.qty}{item.brand?` · ${item.brand}`:""}{item.shirt_style==="pocket"?" · Pocket":""}{item.price?` · $${item.price}`:""}</span>
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
function Storefront({cats, addOrder, customers, show}) {
  const [step,setStep]           = useState(1);
  const [cat,setCat]             = useState(null);
  const [design,setDesign]       = useState(null);
  const [uploadImg,setUploadImg] = useState(null);
  const [color,setColor]         = useState(getBrandColors(SHIRT_BRANDS[0].id)[0]);
  const [items,setItems]         = useState([{size:"",qty:1}]);
  const [brand,setBrand]           = useState(SHIRT_BRANDS[0]);
  const brandColors = getBrandColors(brand.id);
  const [shirtStyle,setShirtStyle] = useState("no-pocket");
  const [placement,setPlacement] = useState([]);
  const [delivery,setDelivery]   = useState("Pickup");
  const [cust,setCust]           = useState({name:"",phone:"",notes:""});
  const [loyRec,setLoyRec]       = useState(null);
  const [useReward,setUseReward] = useState(false);
  const fileRef                  = useRef();

  const reset = () => { setStep(1);setCat(null);setDesign(null);setUploadImg(null);setColor(SHIRT_COLORS[0]);setItems([{size:"",qty:1}]);setPlacement([]);setBrand(SHIRT_BRANDS[0]);setColor(getBrandColors(SHIRT_BRANDS[0].id)[0]);setShirtStyle("no-pocket");setDelivery("Pickup");setCust({name:"",phone:"",notes:""});setLoyRec(null);setUseReward(false); };
  const totalQty = items.reduce((s,i)=>s+Number(i.qty||0),0);

  const onPhoneBlur = () => {
    if (cust.phone.replace(/\D/g,"").length>=10) setLoyRec(findCustomer(customers,cust.phone));
  };

  const onUpload = (e) => {
    const f=e.target.files[0]; if(!f) return;
    if(f.size>5*1024*1024){show("Image must be under 5MB","err");return;}
    const r=new FileReader(); r.onload=ev=>setUploadImg(ev.target.result); r.readAsDataURL(f);
  };

  const [paying,setPaying]       = useState(false);
  const [shippingAddr,setShippingAddr] = useState({line1:"",city:"",state:"",zip:""});

  const shirtTotal = cat?.isDTF ? (design?.price ? design.price * (items[0]?.qty||1) : 0) : calcTotal(brand.id, items.filter(i=>i.size));
  const shipCost   = delivery==="Ship" ? 8 : 0;
  const grandTotal = shirtTotal + shipCost;

  const submit = async () => {
    if(!cust.name.trim()){show("Please enter your name","err");return;}
    if(!cust.phone.replace(/\D/g,"")){show("Please enter your phone number","err");return;}
    if(items.some(i=>!i.size)){show("Please select a size for each item","err");return;}
    if(placement.length===0 && !cat?.isDTF){show("Please select at least one print placement","err");return;}
    if(design?.isUpload && !uploadImg){show("Please upload your design image","err");return;}
    if(delivery==="Ship" && !shippingAddr.line1.trim()){show("Please enter your shipping address","err");return;}
    if(delivery==="Ship" && !shippingAddr.zip.trim()){show("Please enter your zip code","err");return;}

    const orderItems = cat?.isDTF
      ? [{
          design:design?.name,
          color:"N/A", size:"DTF Sheet", qty:items[0]?.qty||1,
          hasUpload:!!uploadImg, placement:"N/A",
          shirt_style:"N/A", brand:"DTF Sheet", price:design?.price||0,
          isDTF:true,
        }]
      : items.map(i=>({
          design:design?.isUpload?"Custom Upload":design?.name,
          color:color.name, size:i.size, qty:i.qty,
          hasUpload:!!uploadImg, placement:placement.join(", "),
          shirt_style:shirtStyle, brand:brand.name, price:getPrice(brand.id,i.size)
        }));

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
          orderData: {
            customerName: cust.name,
            phone: cust.phone,
            notes: (useReward?`[REWARD: ${rewardCode(cust.phone)}] `:"")+cust.notes,
            usingReward: useReward,
            brand: brand.name,
            shirt_style: shirtStyle,
            placement: placement.join(", "),
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

  const STEPS = ["Category","Design","Customize","Your Info","Done!"];

  return (
    <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 16px"}}>
      {step<5 && (
        <div style={{marginBottom:24}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            {STEPS.map((l,i)=><div key={i} style={{fontSize:10,color:i+1<=step?B.green:"#bbb",fontWeight:i+1===step?700:400,letterSpacing:1,textTransform:"uppercase"}}>{l}</div>)}
          </div>
          <div style={{height:4,background:B.creamDk,borderRadius:2}}>
            <div style={{height:"100%",background:`linear-gradient(90deg,${B.greenDk},${B.amber})`,borderRadius:2,width:`${((step-1)/4)*100}%`,transition:"width .4s ease"}}/>
          </div>
        </div>
      )}

      {/* STEP 1 — Category */}
      {step===1 && (
        <div style={{animation:"fup .4s ease"}}>
          <h2 style={{fontSize:30,color:B.text,marginBottom:6,fontFamily:"'Dancing Script','Georgia',cursive"}}>What are you looking for?</h2>
          <p style={{color:B.textLt,marginBottom:22,fontSize:14}}>Pick a category to browse designs</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:14}}>
            {cats.map(c=>(
              <div key={c.id} onClick={()=>{setCat(c);setStep(2);}} style={{background:"#fff",borderRadius:16,padding:"20px 14px",textAlign:"center",cursor:"pointer",boxShadow:"0 2px 12px rgba(0,0,0,0.07)",border:"2px solid transparent",transition:"all .2s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=B.green;e.currentTarget.style.transform="translateY(-3px)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="transparent";e.currentTarget.style.transform="";}}>
                <div style={{fontSize:34,marginBottom:8}}>{c.emoji}</div>
                <div style={{fontSize:13,fontWeight:700,color:B.text}}>{c.name}</div>
                <div style={{fontSize:11,color:B.textLt,marginTop:3}}>{c.designs.length} design{c.designs.length!==1?"s":""}</div>
              </div>
            ))}
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
              <div key={d.id} onClick={()=>{setDesign(d);setUploadImg(null);if(cat?.isDTF)setItems([{size:"sheet",qty:1}]);setStep(3);}} style={{background:"#fff",borderRadius:16,padding:"14px",cursor:"pointer",boxShadow:"0 2px 12px rgba(0,0,0,0.07)",border:"2px solid transparent",transition:"all .2s",textAlign:"center"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=B.green;e.currentTarget.style.transform="translateY(-2px)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="transparent";e.currentTarget.style.transform="";}}>
                {cat?.isDTF
                  ? <div style={{fontSize:48,margin:"8px 0"}}>{d.emoji}</div>
                  : <ShirtSVG color={SHIRT_COLORS[0]} design={d} size={120}/>
                }
                <div style={{fontSize:13,fontWeight:700,color:B.text,marginTop:6}}>{d.name}</div>
                {d.isUpload && <div style={{fontSize:11,color:B.green,marginTop:2}}>📤 Upload your image</div>}
                {cat?.isDTF && d.price && <div style={{fontSize:14,fontWeight:700,color:B.green,marginTop:4}}>${d.price}/sheet</div>}
                {cat?.isDTF && d.desc && <div style={{fontSize:11,color:B.textLt,marginTop:2}}>{d.desc}</div>}
                {cat?.isDTF && !d.price && <div style={{fontSize:12,color:B.amber,fontWeight:600,marginTop:4}}>Custom quote</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3 — Customize */}
      {step===3 && design && (
        <div style={{animation:"fup .4s ease"}}>
          <button onClick={()=>setStep(2)} style={BBTN}>← Back</button>
          <h2 style={{fontSize:24,color:B.text,marginBottom:18,fontFamily:"'Dancing Script','Georgia',cursive"}}>
            {cat?.isDTF ? "📋 Your DTF Sheet Order" : "Customize Your Shirt"}
          </h2>

          {/* ── DTF SHEETS UI ──────────────────────────────────── */}
          {cat?.isDTF && (
            <div style={{maxWidth:520}}>
              <div style={{background:"#fff",borderRadius:16,padding:"20px",boxShadow:"0 4px 18px rgba(0,0,0,0.08)",marginBottom:18}}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                  <span style={{fontSize:40}}>🖨️</span>
                  <div>
                    <div style={{fontWeight:700,color:B.text,fontSize:16}}>{design.name}</div>
                    <div style={{color:B.textLt,fontSize:13,marginTop:2}}>{design.desc}</div>
                    {design.price
                      ? <div style={{color:B.green,fontWeight:700,fontSize:18,marginTop:4}}>${design.price} per sheet</div>
                      : <div style={{color:B.amber,fontWeight:700,fontSize:14,marginTop:4}}>Custom quote — Tiffani will reach out!</div>
                    }
                  </div>
                </div>
                {design.price && (
                  <div>
                    <Lbl>How many sheets?</Lbl>
                    <div style={{display:"flex",gap:10,alignItems:"center",marginTop:8}}>
                      <button onClick={()=>setItems([{size:"sheet",qty:Math.max(1,(items[0]?.qty||1)-1)}])} style={{width:36,height:36,borderRadius:8,border:"1.5px solid #ddd",background:"#fff",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                      <div style={{fontSize:22,fontWeight:700,color:B.text,minWidth:40,textAlign:"center"}}>{items[0]?.qty||1}</div>
                      <button onClick={()=>setItems([{size:"sheet",qty:(items[0]?.qty||1)+1}])} style={{width:36,height:36,borderRadius:8,border:"1.5px solid #ddd",background:"#fff",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                      <div style={{fontSize:13,color:B.textLt,marginLeft:4}}>sheet{(items[0]?.qty||1)!==1?"s":""}</div>
                    </div>
                    <div style={{background:B.greenPale,borderRadius:10,padding:"10px 14px",marginTop:14,border:`1.5px solid ${B.greenLt}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontWeight:600,color:B.green,fontFamily:"'Trebuchet MS',sans-serif"}}>Estimated Total</span>
                      <span style={{fontSize:20,fontWeight:700,color:B.green,fontFamily:"'Trebuchet MS',sans-serif"}}>${design.price * (items[0]?.qty||1)}</span>
                    </div>
                  </div>
                )}
              </div>
              {/* Upload for DTF */}
              <div style={{background:"#fff",borderRadius:16,padding:"20px",boxShadow:"0 4px 18px rgba(0,0,0,0.08)",marginBottom:18}}>
                <Lbl>Upload Your Design Image <span style={{color:B.amber}}>(optional — you can send later via Messenger)</span></Lbl>
                <div onClick={()=>fileRef.current.click()} style={{border:`2px dashed ${!uploadImg?B.amber:B.greenLt}`,borderRadius:14,padding:"18px 16px",textAlign:"center",cursor:"pointer",background:B.cream,marginTop:8,transition:"all .2s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=B.creamDk}
                  onMouseLeave={e=>e.currentTarget.style.background=B.cream}>
                  {uploadImg
                    ? <div><img src={uploadImg} alt="upload" style={{maxHeight:80,maxWidth:"100%",borderRadius:8,marginBottom:6}}/><div style={{fontSize:12,color:B.green,fontWeight:600}}>✓ Tap to change</div></div>
                    : <div><div style={{fontSize:34,marginBottom:6}}>📤</div><div style={{fontSize:14,color:B.textMid,fontWeight:600}}>Tap to upload design</div><div style={{fontSize:11,color:B.textLt,marginTop:3}}>JPG, PNG — max 5MB</div></div>
                  }
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={onUpload}/>
              </div>
              {/* Delivery */}
              <div style={{background:"#fff",borderRadius:16,padding:"20px",boxShadow:"0 4px 18px rgba(0,0,0,0.08)",marginBottom:18}}>
                <Lbl>Delivery</Lbl>
                <div style={{display:"flex",gap:10,marginTop:6}}>
                  {["Pickup","Ship"].map(d=>(
                    <button key={d} onClick={()=>setDelivery(d)} style={{flex:1,padding:"10px",borderRadius:10,border:"2px solid",borderColor:delivery===d?B.green:"#ddd",background:delivery===d?B.green:"#fff",color:delivery===d?"#fff":"#888",fontFamily:"'Trebuchet MS',sans-serif",fontWeight:600,cursor:"pointer",fontSize:13}}>
                      {d==="Pickup"?"🏪 Pickup":"📦 Ship"}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={()=>setStep(4)} style={PBTN}>Next: Your Info →</button>
            </div>
          )}

          {/* ── SHIRT UI ─────────────────────────────────────────── */}
          {!cat?.isDTF && <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,alignItems:"start"}}>
            {/* Preview */}
            <div style={{background:"#fff",borderRadius:20,padding:"22px",boxShadow:"0 4px 20px rgba(0,0,0,0.08)",textAlign:"center",position:"sticky",top:80}}>
              <div style={{fontSize:10,color:B.textLt,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Live Preview</div>
              <ShirtSVG color={color} design={design} uploadImg={uploadImg} shirtStyle={shirtStyle} size={260}/>
              <div style={{marginTop:8,fontSize:12,color:B.textLt}}>{color.name} · {design.name}</div>
            </div>
            {/* Controls */}
            <div>
              {/* Upload — only for Custom Design */}
              {design.isUpload && (
                <div style={{marginBottom:20}}>
                  <Lbl>Upload Your Design Image *</Lbl>
                  <div onClick={()=>fileRef.current.click()} style={{border:`2px dashed ${!uploadImg?B.amber:B.greenLt}`,borderRadius:14,padding:"22px 16px",textAlign:"center",cursor:"pointer",background:B.cream,transition:"all .2s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=B.creamDk}
                    onMouseLeave={e=>e.currentTarget.style.background=B.cream}>
                    {uploadImg
                      ? <div><img src={uploadImg} alt="upload" style={{maxHeight:90,maxWidth:"100%",borderRadius:8,marginBottom:6}}/><div style={{fontSize:12,color:B.green,fontWeight:600}}>✓ Tap to change</div></div>
                      : <div><div style={{fontSize:34,marginBottom:6}}>📤</div><div style={{fontSize:14,color:B.textMid,fontWeight:600}}>Tap to upload</div><div style={{fontSize:11,color:B.textLt,marginTop:3}}>JPG, PNG, GIF — max 5MB</div></div>
                    }
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={onUpload}/>
                </div>
              )}
              {/* Brand */}
              <div style={{marginBottom:20}}>
                <Lbl>Shirt Brand</Lbl>
                <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:6}}>
                  {SHIRT_BRANDS.map(b=>(
                    <button key={b.id} onClick={()=>{ setBrand(b); setColor(getBrandColors(b.id)[0]); }} style={{
                      display:"flex", alignItems:"center", justifyContent:"space-between",
                      padding:"12px 14px", borderRadius:10, border:"2px solid",
                      borderColor:brand.id===b.id?B.green:"#ddd",
                      background:brand.id===b.id?B.greenPale:"#fff",
                      cursor:"pointer", transition:"all .15s", textAlign:"left",
                    }}>
                      <div>
                        <div style={{fontSize:14,fontWeight:700,color:brand.id===b.id?B.green:B.text,fontFamily:"'Trebuchet MS',sans-serif"}}>{b.name}</div>
                        <div style={{fontSize:11,color:B.textLt,fontFamily:"'Trebuchet MS',sans-serif",marginTop:2}}>{b.desc}</div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
                        <div style={{fontSize:13,fontWeight:700,color:brand.id===b.id?B.green:B.textMid,fontFamily:"'Trebuchet MS',sans-serif"}}>${b.basePrice}</div>
                        <div style={{fontSize:10,color:B.textLt,fontFamily:"'Trebuchet MS',sans-serif"}}>2XL+ ${b.bigPrice}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {/* Shirt Style */}
              <div style={{marginBottom:20}}>
                <Lbl>Shirt Style</Lbl>
                <div style={{display:"flex",gap:10,marginTop:6}}>
                  {[
                    {id:"no-pocket", label:"No Pocket",   icon:"👕"},
                    {id:"pocket",    label:"Front Pocket", icon:"🔲"},
                  ].map(s=>(
                    <button key={s.id} onClick={()=>setShirtStyle(s.id)} style={{
                      flex:1, padding:"10px 8px", borderRadius:10, border:"2px solid",
                      borderColor:shirtStyle===s.id?B.green:"#ddd",
                      background:shirtStyle===s.id?B.greenPale:"#fff",
                      cursor:"pointer", transition:"all .15s",
                      display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                    }}>
                      <span style={{fontSize:22}}>{s.icon}</span>
                      <span style={{fontSize:12,fontWeight:700,color:shirtStyle===s.id?B.green:B.text,fontFamily:"'Trebuchet MS',sans-serif"}}>{s.label}</span>
                    </button>
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
                      {SIZES.map(s=><option key={s}>{s}</option>)}
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
              {/* Delivery */}
              <div style={{marginBottom:22}}>
                <Lbl>Delivery</Lbl>
                <div style={{display:"flex",gap:10,marginTop:6}}>
                  {["Pickup","Ship"].map(d=>(
                    <button key={d} onClick={()=>setDelivery(d)} style={{flex:1,padding:"10px",borderRadius:10,border:"2px solid",borderColor:delivery===d?B.green:"#ddd",background:delivery===d?B.green:"#fff",color:delivery===d?"#fff":"#888",fontFamily:"'Trebuchet MS',sans-serif",fontWeight:600,cursor:"pointer",fontSize:13}}>
                      {d==="Pickup"?"🏪 Pickup":"📦 Ship"}
                    </button>
                  ))}
                </div>
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
                      ${calcTotal(brand.id, items.filter(i=>i.size))}
                    </div>
                  </div>
                  <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:5}}>
                    {items.filter(i=>i.size).map((i,idx)=>(
                      <span key={idx} style={{fontSize:11,background:"#fff",color:B.textMid,borderRadius:6,padding:"2px 8px",border:`1px solid ${B.wood}`,fontFamily:"'Trebuchet MS',sans-serif"}}>
                        {i.size} ×{i.qty} = ${getPrice(brand.id,i.size)*Number(i.qty)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={()=>setStep(4)} style={PBTN}>Next: Your Info →</button>
            </div>
          </div>}
        </div>
      )}

      {/* STEP 4 — Info */}
      {step===4 && (
        <div style={{animation:"fup .4s ease",maxWidth:620,margin:"0 auto"}}>
          <button onClick={()=>setStep(3)} style={BBTN}>← Back</button>
          <h2 style={{fontSize:26,color:B.text,marginBottom:6,fontFamily:"'Dancing Script','Georgia',cursive"}}>Almost There!</h2>
          <p style={{color:B.textLt,marginBottom:18,fontSize:14}}>Your phone number tracks your loyalty rewards 🌟</p>
          {/* Summary */}
          <div style={{background:"#fff",borderRadius:14,padding:"14px",marginBottom:16,boxShadow:"0 2px 12px rgba(0,0,0,0.07)",display:"flex",gap:12,alignItems:"center"}}>
            {cat?.isDTF
              ? <div style={{fontSize:50,flexShrink:0}}>🖨️</div>
              : <ShirtSVG color={color} design={design} uploadImg={uploadImg} shirtStyle={shirtStyle} size={72}/>
            }
            <div>
              <div style={{fontWeight:700,color:B.text,fontSize:14}}>{design?.name}</div>
              {cat?.isDTF ? (
                <>
                  <div style={{color:B.textLt,fontSize:12,marginTop:2}}>DTF Heat Transfer Sheet · {delivery}</div>
                  <div style={{color:B.green,fontSize:12,marginTop:2,fontWeight:600}}>{items[0]?.qty||1} sheet{(items[0]?.qty||1)!==1?"s":""}</div>
                  {design.price && <div style={{fontSize:14,fontWeight:700,color:B.green,marginTop:4}}>Est. Total: ${design.price*(items[0]?.qty||1)}{delivery==="Ship"?" + $8 ship":""}</div>}
                  {!design.price && <div style={{fontSize:13,color:B.amber,marginTop:4,fontWeight:600}}>Custom quote — Tiffani will reach out!</div>}
                </>
              ) : (
                <>
                  <div style={{color:B.textLt,fontSize:12,marginTop:2}}>{color.name} · {delivery}</div>
                  <div style={{color:B.green,fontSize:12,marginTop:2,fontWeight:600}}>{totalQty} shirt{totalQty!==1?"s":""}: {(items||[]).map(i=>`${i.size}×${i.qty}`).join(", ")}</div>
                  <div style={{fontSize:12,color:B.textMid,marginTop:2}}>{brand.name} · {shirtStyle==="pocket"?"With Pocket":"No Pocket"}</div>
                  {placement.length>0 && <div style={{fontSize:11,color:B.textLt,marginTop:2}}>📍 {placement.map(p=>p.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())).join(", ")}</div>}
                  <div style={{fontSize:14,fontWeight:700,color:B.green,marginTop:4}}>Est. Total: ${calcTotal(brand.id, items.filter(i=>i.size))}{delivery==="Ship"?" + $8 ship":""}</div>
                </>
              )}
            </div>
          </div>
          {loyRec && <LoyaltyBar rec={loyRec}/>}
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div><Lbl>Your Name *</Lbl><input style={INP()} value={cust.name} onChange={e=>setCust({...cust,name:e.target.value})} placeholder="First & Last Name"/></div>
            <div>
              <Lbl>Phone Number * <span style={{color:B.green,fontWeight:600}}>(tracks loyalty rewards)</span></Lbl>
              <input style={INP()} value={cust.phone} onChange={e=>setCust({...cust,phone:e.target.value})} onBlur={onPhoneBlur} placeholder="(555) 555-5555" type="tel"/>
            </div>
            {/* Reward toggle */}
            {loyRec && (loyRec.earned_rewards||0)-(loyRec.redeemed_rewards||0)>0 && (
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
                <span>{totalQty} shirt{totalQty!==1?"s":""} ({brand.name})</span>
                <span>${shirtTotal}</span>
              </div>
              {delivery==="Ship" && (
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
                  <span>Shipping (flat rate)</span>
                  <span>$8.00</span>
                </div>
              )}
              {useReward && (
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4,color:"#FFD700"}}>
                  <span>🎁 Reward Applied</span>
                  <span>Mention at order</span>
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

      {/* STEP 5 — Done */}
      {step===5 && (
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
function LoyaltyView({customers, show}) {
  const [phone,setPhone] = useState("");
  const [rec,setRec]     = useState(null);
  const [looked,setLooked] = useState(false);

  const lookup = async () => {
    if(phone.replace(/\D/g,"").length<10){show("Enter a valid phone number","err");return;}
    const found = await db.findCustomer(phone);
    setRec(found);
    setLooked(true);
  };

  const avail = rec ? rec.earned_rewards||0-rec.redeemed_rewards||0 : 0;

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
// ORDER TRACKER
// ═══════════════════════════════════════════════════════════════════════════════
function Tracker({orders, setOrders, customers, setCustomers, show, embedded=false}) {
  const [openId,setOpenId]   = useState(null);
  const [status,setStatus]   = useState("All");
  const [search,setSearch]   = useState("");

  const filtered = orders.filter(o => {
    const ms = status==="All"||o.status===status;
    const ms2 = (o.customer_name||o.customerName||"").toLowerCase().includes(search.toLowerCase()) || pi(o).some(i=>(i.design||"").toLowerCase().includes(search.toLowerCase()));
    return ms&&ms2;
  });

  const update = async (id,ch) => {
    setOrders(prev=>prev.map(o=>o.id===id?{...o,...ch}:o)); // optimistic
    try { await db.update("orders", id, ch); } catch(e) { console.error("Update failed:",e); }
  };
  const del = async (id) => {
    setOrders(prev=>prev.filter(o=>o.id!==id)); // optimistic
    setOpenId(null);
    show("Order deleted","err");
    try { await db.delete("orders", id); } catch(e) { console.error("Delete failed:",e); }
  };
  const markRedeemed = async (order) => {
    if(!order.phone) return;
    await db.upsertCustomer(order.phone, order.customer_name||order.customerName, 0, true);
    await update(order.id, {reward_redeemed:true});
    const freshCusts = await db.get("customers");
    setCustomers(freshCusts||[]);
    show("Reward marked as redeemed!","gold");
  };

  const exportCSV = () => {
    const rows=[["Date","Customer","Phone","Delivery","Brand","Shirt Style","Design","Color","Size","Qty","Price","Placement","Payment","Paid","Status","Reward","Notes"]];
    orders.forEach(o=>pi(o).forEach(i=>rows.push([o.date,(o.customer_name||o.customerName||"Unknown"),o.phone||"",o.delivery,i.brand||o.brand||"",i.shirt_style||o.shirt_style||"",i.design,i.color,i.size,i.qty,i.price||"",i.placement||o.placement||"",(o.payment_method||o.paymentMethod),o.paid?"Yes":"No",o.status,(o.using_reward||o.usingReward)?"Yes":"No",o.notes||""])));
    const csv=rows.map(r=>r.map(c=>`"${String(c||"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="boutique-orders.csv";a.click();
    show("Exported!");
  };

  const stats = {total:orders.length, unpaid:orders.filter(o=>!o.paid).length, active:orders.filter(o=>["New","In Progress"].includes(o.status)).length, ready:orders.filter(o=>o.status==="Ready").length};

  return (
    <div style={{maxWidth:1100,margin:"0 auto",padding:"22px 16px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:10}}>
        <h2 style={{fontSize:22,color:B.text,fontFamily:"'Dancing Script','Georgia',cursive"}}>Order Tracker</h2>
        <button onClick={exportCSV} style={{...PBTN,width:"auto",padding:"9px 16px",fontSize:13}}>⬇ Export CSV</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10,marginBottom:18}}>
        {[{l:"Total",v:stats.total,c:B.green},{l:"Unpaid",v:stats.unpaid,c:"#C0392B"},{l:"Active",v:stats.active,c:"#E67E22"},{l:"Ready",v:stats.ready,c:"#27AE60"}].map(s=>(
          <div key={s.l} style={{background:"#fff",borderRadius:12,padding:"13px 11px",borderTop:`4px solid ${s.c}`,boxShadow:"0 2px 10px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:24,fontWeight:700,color:s.c}}>{s.v}</div>
            <div style={{fontSize:11,color:B.textLt,textTransform:"uppercase",letterSpacing:1}}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <input placeholder="Search name or design..." value={search} onChange={e=>setSearch(e.target.value)} style={{...INP(),flex:1,minWidth:150}}/>
        <select value={status} onChange={e=>setStatus(e.target.value)} style={{...INP(),minWidth:130}}>
          <option value="All">All Statuses</option>
          {STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>
      {filtered.length===0
        ? <div style={{textAlign:"center",padding:"50px 20px",color:B.textLt}}><div style={{fontSize:42,marginBottom:10}}>🧵</div><div>No orders yet</div></div>
        : <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filtered.map(order=>{
            const sm=STATUS_META[order.status]||STATUS_META["New"];
            const qty=pi(order).reduce((s,i)=>s+Number(i.qty||0),0);
            const open=openId===order.id;
            const cr=order.phone?customers.find(c=>c.phone===(order.phone||'').replace(/\D/g,'')):null;
            return (
              <div key={order.id} style={{background:"#fff",borderRadius:14,boxShadow:"0 2px 12px rgba(0,0,0,0.07)",borderLeft:`5px solid ${sm.dot}`,overflow:"hidden"}}>
                <div style={{padding:"13px 15px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}} onClick={()=>setOpenId(open?null:order.id)}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                      <span style={{fontWeight:700,fontSize:15,color:B.text}}>{order.customer_name||order.customerName}</span>
                      {(order.using_reward||order.usingReward) && <span style={{background:"#FFF8DC",color:"#B8860B",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,border:"1px solid #DAA520"}}>🎁 Reward</span>}
                      {cr && <span style={{background:B.greenPale,color:B.green,fontSize:10,padding:"2px 7px",borderRadius:20}}>⭐ {cr.total_shirts||0} shirts</span>}
                    </div>
                    <div style={{fontSize:11,color:B.textLt,marginTop:2}}>{order.date||new Date(order.created_at).toLocaleDateString()} · {order.delivery} · {qty} item{qty!==1?"s":""}{order.phone?` · ${order.phone}`:""}</div>
                    {order.placement && <div style={{fontSize:11,color:B.amber,marginTop:1}}>📍 {order.placement} {order.shirt_style==="pocket"?"· 🔲 Pocket":""}</div>}
                    <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:6}}>
                      {pi(order).map((item,i)=>(
                        <span key={i} style={{fontSize:11,background:B.amberPale,color:B.textMid,borderRadius:6,padding:"2px 7px"}}>{item.design} · {item.color} {item.size} ×{item.qty}{item.brand?` · ${item.brand}`:""}{item.shirt_style==="pocket"?" · 🔲 Pocket":""}{item.price?` · $${item.price}`:""}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>
                    <span style={{background:sm.bg,color:sm.color,borderRadius:20,padding:"3px 11px",fontSize:11,fontWeight:600}}>● {order.status}</span>
                    <span style={{fontSize:11,color:order.paid?"#27AE60":"#C0392B",fontWeight:600}}>{order.paid?"✓ Paid":"✗ Unpaid"} · {order.payment_method||order.paymentMethod||"Pending"}</span>
                  </div>
                </div>
                {open && (
                  <div style={{padding:"12px 15px",borderTop:`1px solid ${B.creamDk}`,background:B.cream,display:"flex",flexWrap:"wrap",gap:10,alignItems:"flex-end"}}>
                    <div><Lbl>Status</Lbl>
                      <select value={order.status} onChange={e=>update(order.id,{status:e.target.value})} style={{...INP(),minWidth:120}}>
                        {STATUSES.map(s=><option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div><Lbl>Payment</Lbl>
                      <select value={order.payment_method||order.paymentMethod||"Pending"} onChange={e=>update(order.id,{payment_method:e.target.value})} style={{...INP(),minWidth:120}}>
                        {PAYMENT_OPTS.map(p=><option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div><Lbl>Paid?</Lbl>
                      <div style={{display:"flex",gap:7,marginTop:4}}>
                        {[false,true].map(p=>(
                          <button key={String(p)} onClick={()=>update(order.id,{paid:p})} style={{padding:"7px 12px",borderRadius:8,border:"2px solid",borderColor:order.paid===p?(p?"#27AE60":"#C0392B"):"#ddd",background:order.paid===p?(p?"#27AE60":"#C0392B"):"#fff",color:order.paid===p?"#fff":"#888",cursor:"pointer",fontSize:12,fontWeight:600}}>
                            {p?"✓ Paid":"✗ Unpaid"}
                          </button>
                        ))}
                      </div>
                    </div>
                    {(order.using_reward||order.usingReward) && !(order.reward_redeemed||order.rewardRedeemed) && (
                      <button onClick={()=>markRedeemed(order)} style={{padding:"7px 12px",borderRadius:8,border:"2px solid #DAA520",background:"#FFF8DC",color:"#B8860B",cursor:"pointer",fontSize:12,fontWeight:700}}>✓ Mark Reward Redeemed</button>
                    )}
                    {(order.reward_redeemed||order.rewardRedeemed) && <span style={{fontSize:12,color:"#B8860B",fontWeight:600}}>🎁 Redeemed</span>}
                    <button onClick={()=>del(order.id)} style={{marginLeft:"auto",padding:"7px 12px",borderRadius:8,border:"none",background:"#FDECEA",color:"#C0392B",cursor:"pointer",fontWeight:600,fontSize:12}}>Delete</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      }
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
      const apiMessages = [
        ...chatLog.filter(m=>m.role!=="bot").map(m=>({role:"user",content:m.text})),
        ...chatLog.filter(m=>m.role==="bot" && chatLog.indexOf(m)>0).map(m=>({role:"assistant",content:m.text})),
        {role:"user",content:question}
      ].filter(m=>m.content);

      const res = await fetch("/.netlify/functions/chat",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ messages:[{role:"user",content:question}] })
      });
      const data = await res.json();
      const reply = data.reply || "Sorry, I had trouble with that! Please message Tiffani directly on Messenger. 💬";
      setChatLog(h=>[...h,{role:"bot",text:reply}]);
    } catch {
      setChatLog(h=>[...h,{role:"bot",text:"Something went wrong on my end! Please message Tiffani on Messenger for help. 💬"}]);
    }
    setLoading(false);
  };

  const submitForm = async () => {
    if(!form.name.trim()||!form.message.trim()){show("Please fill in your name and message","err");return;}
    const msg = {
      name: form.name,
      phone: form.phone,
      message: form.message,
      read: false,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),
    };
    const saved = await db.insert("messages", msg);
    if (saved) setMessages(prev=>[saved,...prev]);
    // Notify Tiffani by email (non-blocking)
    try {
      await fetch("/.netlify/functions/send-message-email", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify(msg),
      });
    } catch(e) { console.warn("Message email failed:", e.message); }
    setSent(true);
    show("Message sent! Tiffani will follow up soon 💬");
  };

  return (
    <div style={{maxWidth:780,margin:"0 auto",padding:"24px 16px"}}>
      {/* Messenger CTA */}
      <div style={{background:"linear-gradient(135deg,#0084FF,#0066CC)",borderRadius:18,padding:"22px",marginBottom:18,textAlign:"center",boxShadow:"0 6px 24px rgba(0,132,255,0.3)"}}>
        <div style={{fontSize:38,marginBottom:6}}>💬</div>
        <div style={{fontFamily:"'Dancing Script','Georgia',cursive",fontSize:24,color:"#fff",marginBottom:5}}>Chat with Tiffani</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.88)",marginBottom:16,lineHeight:1.6}}>For custom designs, complex orders, or anything personal — message her directly. She typically responds within a few hours!</div>
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
        <div style={{fontSize:12,color:B.textLt,marginBottom:14}}>Don't have Facebook? Leave a message and Tiffani will follow up.</div>
        {sent
          ? <div style={{textAlign:"center",padding:"24px 16px",animation:"fup .4s ease"}}>
              <div style={{fontSize:44,marginBottom:8}}>✅</div>
              <div style={{fontFamily:"'Dancing Script','Georgia',cursive",fontSize:22,color:B.green,marginBottom:5}}>Message Sent!</div>
              <div style={{fontSize:13,color:B.textLt,marginBottom:14}}>Tiffani will reach out soon.</div>
              <button onClick={()=>{setSent(false);setForm({name:"",phone:"",message:""});}} style={{...PBTN,width:"auto",padding:"10px 22px"}}>Send Another</button>
            </div>
          : <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div><Lbl>Your Name *</Lbl><input style={INP()} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="First & Last Name"/></div>
              <div><Lbl>Phone or Facebook Name</Lbl><input style={INP()} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Best way to reach you"/></div>
              <div><Lbl>Message *</Lbl><textarea style={{...INP(),height:90,resize:"vertical"}} value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder="Tell her what you need..."/></div>
              <button onClick={submitForm} style={PBTN}>Send Message 💬</button>
            </div>
        }
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN LOCK SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
const ADMIN_PASSWORD = "leo080693";

function AdminLock({onUnlock, show}) {
  const [input, setInput]     = useState("");
  const [shake, setShake]     = useState(false);
  const [visible, setVisible] = useState(false);

  const attempt = () => {
    if (input === ADMIN_PASSWORD) {
      onUnlock();
    } else {
      setShake(true);
      setInput("");
      show("Incorrect password","err");
      setTimeout(()=>setShake(false), 600);
    }
  };

  return (
    <div style={{maxWidth:460, margin:"60px auto", padding:"0 20px"}}>
      <div style={{background:"#fff", borderRadius:20, padding:"36px 28px", boxShadow:"0 8px 32px rgba(0,0,0,0.1)", textAlign:"center"}}>
        <div style={{fontSize:52, marginBottom:12}}>🔒</div>
        <h2 style={{fontFamily:"'Dancing Script','Georgia',cursive", fontSize:26, color:B.text, marginBottom:6}}>Admin Access</h2>
        <p style={{fontSize:13, color:B.textLt, marginBottom:24}}>This area is for Tiffani only. Enter the password to continue.</p>
        <div style={{
          animation: shake ? "shake .5s ease" : "none",
          display:"flex", flexDirection:"column", gap:12,
        }}>
          <div style={{position:"relative"}}>
            <input
              type={visible?"text":"password"}
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&attempt()}
              placeholder="Enter password"
              style={{...INP(), textAlign:"center", fontSize:16, letterSpacing:visible?0:4, paddingRight:42}}
              autoFocus
            />
            <button
              onClick={()=>setVisible(v=>!v)}
              style={{position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16, color:B.textLt}}
            >{visible?"🙈":"👁️"}</button>
          </div>
          <button onClick={attempt} style={PBTN}>Unlock Admin →</button>
        </div>
      </div>
      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-6px)}
          80%{transform:translateX(6px)}
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════════════════════
function Admin({cats, setCats, orders, setOrders, customers, setCustomers, messages, setMessages, onLock, show}) {
  const [tab,setTab]         = useState("designs");
  const [openCat,setOpenCat] = useState(null);
  const [newD,setNewD]       = useState({name:"",emoji:"✨",text:"",style:"bold"});
  const [newC,setNewC]       = useState({name:"",emoji:"🆕"});
  const [custQ,setCustQ]     = useState("");
  const [aiQueue,setAiQueue] = useState([]);
  const [aiRunning,setAiRunning] = useState(false);
  const dropRef              = useRef();
  const [dragOver,setDragOver] = useState(false);

  // ── Design management ──
  const addDesign = (catId) => {
    if(!newD.name.trim()){show("Enter a design name","err");return;}
    setCats(cs=>cs.map(c=>c.id===catId?{...c,designs:[...c.designs,{id:`d${Date.now()}`,name:newD.name,emoji:newD.emoji,preview:newD.text||newD.name.toUpperCase(),style:newD.style}]}:c));
    setNewD({name:"",emoji:"✨",text:"",style:"bold"});
    show("Design added!");
  };
  const removeDesign = (catId,dId) => { setCats(cs=>cs.map(c=>c.id===catId?{...c,designs:c.designs.filter(d=>d.id!==dId)}:c)); show("Removed","err"); };
  const addCat = () => {
    if(!newC.name.trim()){show("Enter a category name","err");return;}
    setCats(cs=>[...cs,{id:`c${Date.now()}`,name:newC.name,emoji:newC.emoji,designs:[]}]);
    setNewC({name:"",emoji:"🆕"}); show("Category added!");
  };

  // ── AI Categorizer ──
  const catNames = cats.map(c=>c.name).join(", ");
  const readFiles = (files) => {
    Array.from(files).filter(f=>f.type.startsWith("image/")).forEach(file=>{
      const r=new FileReader();
      r.onload=ev=>setAiQueue(prev=>[...prev,{id:`q${Date.now()}_${Math.random().toString(36).slice(2,5)}`,name:file.name.replace(/\.[^.]+$/,""),dataUrl:ev.target.result,status:"pending",suggestion:"",assignedCat:"",designName:"",confidence:"",reason:"",tags:[]}]);
      r.readAsDataURL(file);
    });
  };
  const analyzeOne = async (item) => {
    setAiQueue(prev=>prev.map(q=>q.id===item.id?{...q,status:"analyzing"}:q));
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",max_tokens:500,
          messages:[{role:"user",content:[
            {type:"image",source:{type:"base64",media_type:item.dataUrl.split(";")[0].split(":")[1]||"image/jpeg",data:item.dataUrl.split(",")[1]}},
            {type:"text",text:`Categorize this t-shirt design for To A "T" Boutique. Categories: ${catNames}. Reply ONLY with JSON: {"suggestedCategory":"<exact name>","designName":"<2-4 words>","confidence":"high|medium|low","tags":["tag1","tag2"],"reason":"<one sentence>"}`}
          ]}]
        })
      });
      const data = await res.json();
      const raw = data.content?.find(b=>b.type==="text")?.text||"{}";
      let p; try { p=JSON.parse(raw.replace(/```json|```/g,"").trim()); } catch { p={suggestedCategory:cats[0]?.name,designName:item.name,confidence:"low",tags:[],reason:"Parse error"}; }
      setAiQueue(prev=>prev.map(q=>q.id===item.id?{...q,status:"done",suggestion:p.suggestedCategory||cats[0]?.name,assignedCat:p.suggestedCategory||cats[0]?.name,designName:p.designName||item.name,confidence:p.confidence,tags:p.tags||[],reason:p.reason||""}:q));
    } catch(e) {
      setAiQueue(prev=>prev.map(q=>q.id===item.id?{...q,status:"error",reason:e.message}:q));
    }
  };
  const analyzeAll = async () => {
    const pending = aiQueue.filter(q=>q.status==="pending");
    if(!pending.length){show("No pending items","err");return;}
    setAiRunning(true);
    for(const item of pending) await analyzeOne(item);
    setAiRunning(false);
    show(`✅ Analyzed ${pending.length} design${pending.length!==1?"s":""}!`);
  };
  const approveAll = () => {
    let count=0;
    setCats(cs=>{
      let updated=[...cs];
      aiQueue.filter(q=>q.status==="done"&&q.assignedCat).forEach(item=>{
        const idx=updated.findIndex(c=>c.name===item.assignedCat);
        if(idx===-1||updated[idx].designs.some(d=>d.name===item.designName)) return;
        count++;
        updated[idx]={...updated[idx],designs:[...updated[idx].designs,{id:`ai${Date.now()}_${count}`,name:item.designName||item.name,emoji:"🎨",preview:(item.designName||item.name).toUpperCase(),style:"bold",imageUrl:item.dataUrl}]};
      });
      return updated;
    });
    setAiQueue(prev=>prev.filter(q=>q.status!=="done"));
    show(`🎉 Added ${count} design${count!==1?"s":""} to categories!`);
  };

  const pending = aiQueue.filter(q=>q.status==="pending").length;
  const done    = aiQueue.filter(q=>q.status==="done").length;
  const filteredCusts = customers.filter(c=>(c.name||"").toLowerCase().includes(custQ.toLowerCase())||(c.phone||"").includes(custQ));
  const unread = messages.filter(m=>!m.read).length;
  const topDesigns = Object.entries(orders.flatMap(o=>pi(o)).filter(i=>i.design).reduce((a,i)=>{a[i.design]=(a[i.design]||0)+Number(i.qty||1);return a;},{})).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const confColor = c=>c==="high"?"#27AE60":c==="medium"?"#E67E22":"#C0392B";

  const ADMIN_TABS = [{id:"orders",l:"📋 Orders"},{id:"designs",l:"🎨 Designs"},{id:"ai",l:"🤖 AI Sort"},{id:"loyalty",l:"⭐ Loyalty"},{id:"messages",l:`📩 Messages${unread>0?` (${unread})`:""}`},{id:"stats",l:"📊 Stats"}];

  return (
    <div style={{maxWidth:1100,margin:"0 auto",padding:"22px 16px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h2 style={{fontSize:22,color:B.text,fontFamily:"'Dancing Script','Georgia',cursive"}}>⚙️ Admin Panel</h2>
        <button onClick={onLock} style={{padding:"8px 16px",borderRadius:10,border:`1.5px solid ${B.wood}`,background:"#fff",color:B.textMid,cursor:"pointer",fontWeight:600,fontSize:13,fontFamily:"'Trebuchet MS',sans-serif",display:"flex",alignItems:"center",gap:6}}>
          🔒 Lock Admin
        </button>
      </div>
      <div style={{display:"flex",gap:7,marginBottom:20,flexWrap:"wrap"}}>
        {ADMIN_TABS.map(at=>(
          <button key={at.id} onClick={()=>setTab(at.id)} style={{padding:"8px 16px",borderRadius:10,border:"none",cursor:"pointer",fontWeight:600,fontSize:12,fontFamily:"'Trebuchet MS',sans-serif",background:tab===at.id?B.green:"#fff",color:tab===at.id?"#fff":B.textMid,boxShadow:tab===at.id?`0 3px 12px rgba(74,124,89,0.3)`:"0 1px 4px rgba(0,0,0,0.08)"}}>
            {at.l}
          </button>
        ))}
      </div>

      {/* ── ORDERS ── */}
      {tab==="orders" && (
        <Tracker orders={orders} setOrders={setOrders} customers={customers} setCustomers={setCustomers} show={show} embedded={true}/>
      )}

      {/* ── DESIGNS ── */}
      {tab==="designs" && (
        <div>
          <div style={{background:"#fff",borderRadius:14,padding:"14px",marginBottom:16,boxShadow:"0 2px 10px rgba(0,0,0,0.07)"}}>
            <SecHead>Add New Category</SecHead>
            <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
              <input value={newC.emoji} onChange={e=>setNewC({...newC,emoji:e.target.value})} style={{...INP(),width:54,textAlign:"center",fontSize:20}} placeholder="🆕"/>
              <input value={newC.name} onChange={e=>setNewC({...newC,name:e.target.value})} style={{...INP(),flex:1}} placeholder="Category name"/>
              <button onClick={addCat} style={{...PBTN,width:"auto",padding:"10px 18px"}}>+ Add</button>
            </div>
          </div>
          {cats.map(cat=>(
            <div key={cat.id} style={{background:"#fff",borderRadius:14,marginBottom:12,boxShadow:"0 2px 10px rgba(0,0,0,0.07)",overflow:"hidden"}}>
              <div style={{padding:"13px 15px",display:"flex",justifyContent:"space-between",alignItems:"center",background:B.creamDk,cursor:"pointer"}} onClick={()=>setOpenCat(openCat===cat.id?null:cat.id)}>
                <div style={{fontWeight:700,fontSize:14,color:B.text}}>{cat.emoji} {cat.name} <span style={{color:B.textLt,fontWeight:400,fontSize:12}}>({cat.designs.length})</span></div>
                <span style={{color:B.green}}>{openCat===cat.id?"▲":"▼"}</span>
              </div>
              {openCat===cat.id && (
                <div style={{padding:"14px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:9,marginBottom:14}}>
                    {cat.designs.map(d=>(
                      <div key={d.id} style={{background:B.cream,borderRadius:12,padding:"9px 7px",textAlign:"center",position:"relative"}}>
                        <ShirtSVG color={SHIRT_COLORS[0]} design={d} size={78}/>
                        <div style={{fontSize:11,fontWeight:600,color:B.text,marginTop:3}}>{d.emoji} {d.name}</div>
                        <button onClick={()=>removeDesign(cat.id,d.id)} style={{position:"absolute",top:4,right:4,background:"#C0392B",color:"#fff",border:"none",borderRadius:"50%",width:17,height:17,fontSize:10,cursor:"pointer",lineHeight:"17px",textAlign:"center"}}>×</button>
                      </div>
                    ))}
                  </div>
                  <div style={{background:B.amberPale,borderRadius:12,padding:"13px",border:`2px dashed ${B.amber}`}}>
                    <SecHead>Add Design</SecHead>
                    <div style={{display:"grid",gridTemplateColumns:"50px 1fr 85px",gap:9,marginBottom:9}}>
                      <input value={newD.emoji} onChange={e=>setNewD({...newD,emoji:e.target.value})} style={{...INP(),textAlign:"center",fontSize:18}} placeholder="✨"/>
                      <input value={newD.name}  onChange={e=>setNewD({...newD,name:e.target.value})}  style={INP()} placeholder="Design name"/>
                      <select value={newD.style} onChange={e=>setNewD({...newD,style:e.target.value})} style={INP()}>
                        <option value="bold">Bold</option><option value="script">Script</option><option value="varsity">Varsity</option><option value="chunky">Chunky</option><option value="serif">Serif</option>
                      </select>
                    </div>
                    <textarea value={newD.text} onChange={e=>setNewD({...newD,text:e.target.value})} rows={3} placeholder="Preview text (one line per row)" style={{...INP(),resize:"vertical",marginBottom:9}}/>
                    <button onClick={()=>addDesign(cat.id)} style={PBTN}>+ Add Design</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── AI SORT ── */}
      {tab==="ai" && (
        <div>
          <div style={{background:`linear-gradient(135deg,${B.greenDk},${B.green})`,borderRadius:16,padding:"16px 18px",color:"#fff",marginBottom:16}}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>🤖 AI Design Categorizer</div>
            <div style={{fontSize:13,opacity:.88,lineHeight:1.6}}>Drop design images here. Claude Vision will analyze each one and suggest a category. Review, adjust if needed, then approve all at once.</div>
            {aiQueue.length>0 && <div style={{display:"flex",gap:14,marginTop:10,fontSize:12,fontWeight:600}}><span>⏳ {pending} pending</span><span style={{color:"#90EE90"}}>✅ {done} ready</span></div>}
          </div>
          <div ref={dropRef} onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);readFiles(e.dataTransfer.files);}} onClick={()=>document.getElementById("aiIn").click()} style={{border:`3px dashed ${dragOver?B.green:B.wood}`,borderRadius:16,padding:"32px 18px",textAlign:"center",cursor:"pointer",background:dragOver?B.greenPale:"#fff",transition:"all .2s",marginBottom:16}}>
            <div style={{fontSize:44,marginBottom:8}}>📂</div>
            <div style={{fontSize:15,fontWeight:700,color:B.text,marginBottom:3}}>Drop design images here</div>
            <div style={{fontSize:13,color:B.textLt}}>Or tap to browse — JPG, PNG, GIF. Drop as many as you want.</div>
            <input id="aiIn" type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>readFiles(e.target.files)}/>
          </div>
          {aiQueue.length>0 && (
            <div style={{display:"flex",gap:9,marginBottom:16,flexWrap:"wrap"}}>
              <button onClick={analyzeAll} disabled={aiRunning||pending===0} style={{...PBTN,width:"auto",flex:1,padding:"11px 20px",opacity:(aiRunning||pending===0)?.6:1,cursor:(aiRunning||pending===0)?"not-allowed":"pointer"}}>{aiRunning?"🔄 Analyzing...":` 🤖 Analyze ${pending} Pending`}</button>
              {done>0 && <button onClick={approveAll} style={{...PBTN,width:"auto",flex:1,padding:"11px 20px",background:"linear-gradient(135deg,#B8860B,#DAA520)",boxShadow:"0 4px 14px rgba(184,134,11,0.3)"}}>✅ Approve All ({done})</button>}
              <button onClick={()=>setAiQueue([])} style={{padding:"11px 16px",borderRadius:12,border:`1.5px solid ${B.wood}`,background:"#fff",color:B.textMid,cursor:"pointer",fontWeight:600,fontSize:13}}>🗑️ Clear</button>
            </div>
          )}
          {aiQueue.length>0 && (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12}}>
              {aiQueue.map(item=>(
                <div key={item.id} style={{background:"#fff",borderRadius:14,overflow:"hidden",boxShadow:"0 3px 14px rgba(0,0,0,0.09)",border:`2px solid ${item.status==="done"?B.greenLt:item.status==="error"?"#E74C3C":B.wood}`}}>
                  <div style={{position:"relative",height:130,background:B.creamDk,overflow:"hidden"}}>
                    <img src={item.dataUrl} alt={item.name} style={{width:"100%",height:"100%",objectFit:"contain",padding:6}}/>
                    <div style={{position:"absolute",top:7,right:7,background:item.status==="analyzing"?"#2980B9":item.status==="done"?B.green:item.status==="error"?"#E74C3C":B.wood,color:"#fff",borderRadius:20,padding:"2px 9px",fontSize:10,fontWeight:700}}>
                      {item.status==="analyzing"?"🔄 Thinking...":item.status==="done"?"✅ Ready":item.status==="error"?"❌ Error":"⏳ Pending"}
                    </div>
                    <button onClick={()=>setAiQueue(prev=>prev.filter(q=>q.id!==item.id))} style={{position:"absolute",top:7,left:7,background:"rgba(0,0,0,0.5)",color:"#fff",border:"none",borderRadius:"50%",width:20,height:20,fontSize:12,cursor:"pointer",lineHeight:"20px",textAlign:"center"}}>×</button>
                  </div>
                  <div style={{padding:"11px"}}>
                    <input value={item.designName||item.name} onChange={e=>setAiQueue(prev=>prev.map(q=>q.id===item.id?{...q,designName:e.target.value}:q))} style={{...INP(),fontSize:12,fontWeight:600,marginBottom:7,padding:"6px 9px"}} placeholder="Design name"/>
                    <select value={item.assignedCat||""} onChange={e=>setAiQueue(prev=>prev.map(q=>q.id===item.id?{...q,assignedCat:e.target.value}:q))} style={{...INP(),fontSize:12,padding:"6px 9px",marginBottom:6}}>
                      <option value="">— Pick category —</option>
                      {cats.map(c=><option key={c.id} value={c.name}>{c.emoji} {c.name}</option>)}
                    </select>
                    {item.status==="done" && (
                      <div style={{fontSize:11,color:B.textLt,lineHeight:1.5}}>
                        <span style={{background:B.greenPale,color:confColor(item.confidence),borderRadius:20,padding:"2px 7px",fontWeight:700,fontSize:10}}>{item.confidence} confidence</span>
                        {item.reason && <div style={{marginTop:4,fontStyle:"italic"}}>{item.reason}</div>}
                      </div>
                    )}
                    {item.status==="error" && <div style={{fontSize:11,color:"#E74C3C"}}>{item.reason}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {aiQueue.length===0 && <div style={{textAlign:"center",padding:"40px 20px",color:B.textLt}}><div style={{fontSize:42,marginBottom:8}}>🖼️</div><div style={{fontSize:14,fontWeight:600}}>No designs in queue</div><div style={{fontSize:12,marginTop:4}}>Drop images above to get started</div></div>}
        </div>
      )}

      {/* ── LOYALTY ── */}
      {tab==="loyalty" && (
        <div>
          <div style={{background:`linear-gradient(135deg,${B.greenDk},${B.green})`,borderRadius:14,padding:"16px 18px",color:"#fff",marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
              {[{l:"Members",v:customers.length},{l:"Shirts Tracked",v:customers.reduce((s,c)=>s+(c.total_shirts||0),0)},{l:"Rewards Earned",v:customers.reduce((s,c)=>s+(c.earned_rewards||0),0)},{l:"Redeemed",v:customers.reduce((s,c)=>s+(c.redeemed_rewards||0),0)}].map(s=>(
                <div key={s.l} style={{textAlign:"center"}}><div style={{fontSize:24,fontWeight:700,color:"#FFD700"}}>{s.v}</div><div style={{fontSize:11,opacity:.75}}>{s.l}</div></div>
              ))}
            </div>
          </div>
          <input placeholder="Search by name or phone..." value={custQ} onChange={e=>setCustQ(e.target.value)} style={{...INP(),marginBottom:12}}/>
          {filteredCusts.length===0
            ? <div style={{textAlign:"center",padding:"28px",color:B.textLt}}>No customers yet</div>
            : filteredCusts.sort((a,b)=>(b.total_shirts||0)-(a.total_shirts||0)).map(c=>{
                const avail=(c.earned_rewards||0)-(c.redeemed_rewards||0);
                const prog=(c.total_shirts||0)%SHIRTS_FOR_REWARD;
                return (
                  <div key={c.phone} style={{background:"#fff",borderRadius:14,padding:"14px",marginBottom:9,boxShadow:"0 2px 10px rgba(0,0,0,0.07)",borderLeft:`4px solid ${avail>0?"#DAA520":B.green}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                      <div>
                        <div style={{fontWeight:700,color:B.text,fontSize:14}}>{c.name} {avail>0&&"🎁"}</div>
                        <div style={{fontSize:11,color:B.textLt,marginTop:2}}>{c.phone} · Since {c.since}</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:18,fontWeight:700,color:B.green}}>{c.total_shirts||0} shirts</div>
                        <div style={{fontSize:11,color:B.textLt}}>{(c.total_shirts||0)%SHIRTS_FOR_REWARD}/{SHIRTS_FOR_REWARD} to next</div>
                      </div>
                    </div>
                    <div style={{marginTop:8,height:5,background:B.creamDk,borderRadius:3}}>
                      <div style={{height:"100%",background:`linear-gradient(90deg,${B.green},${B.amber})`,borderRadius:3,width:`${((c.total_shirts||0)%SHIRTS_FOR_REWARD/SHIRTS_FOR_REWARD)*100}%`}}/>
                    </div>
                    {avail>0 && <div style={{marginTop:7,fontSize:12,color:"#B8860B",fontWeight:600}}>Code: <span style={{fontFamily:"monospace",letterSpacing:1}}>{rewardCode(c.phone||'')}</span> ({avail} available)</div>}
                  </div>
                );
              })
          }
        </div>
      )}

      {/* ── MESSAGES ── */}
      {tab==="messages" && (
        <div>
          {messages.length===0
            ? <div style={{textAlign:"center",padding:"50px 20px",color:B.textLt}}><div style={{fontSize:42,marginBottom:8}}>📭</div><div style={{fontSize:14,fontWeight:600}}>No messages yet</div><div style={{fontSize:12,marginTop:4}}>Messages from the Help tab appear here</div></div>
            : <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {messages.map(msg=>(
                <div key={msg.id} onClick={async ()=>{ await db.update("messages",msg.id,{read:true}); setMessages(prev=>prev.map(m=>m.id===msg.id?{...m,read:true}:m)); }} style={{background:"#fff",borderRadius:14,padding:"14px 16px",boxShadow:"0 2px 12px rgba(0,0,0,0.07)",borderLeft:`5px solid ${msg.read?B.wood:B.green}`,cursor:"pointer"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <span style={{fontWeight:700,fontSize:14,color:B.text}}>{msg.name}</span>
                        {!msg.read && <span style={{background:B.green,color:"#fff",fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20}}>NEW</span>}
                      </div>
                      <div style={{fontSize:11,color:B.textLt,marginTop:2}}>{msg.date} at {msg.time}{msg.phone?` · ${msg.phone}`:""}</div>
                      <div style={{fontSize:13,color:B.textMid,marginTop:8,lineHeight:1.5}}>{msg.message}</div>
                    </div>
                    <div style={{display:"flex",gap:7,flexShrink:0}}>
                      <a href={FB_URL} target="_blank" rel="noreferrer" style={{padding:"6px 12px",borderRadius:8,background:"#0084FF",color:"#fff",fontSize:11,fontWeight:600,textDecoration:"none",fontFamily:"'Trebuchet MS',sans-serif"}}>Reply on Messenger</a>
                      <button onClick={async e=>{ e.stopPropagation(); await db.delete("messages",msg.id); setMessages(prev=>prev.filter(m=>m.id!==msg.id)); }} style={{padding:"6px 10px",borderRadius:8,border:"none",background:"#FDECEA",color:"#C0392B",fontSize:11,fontWeight:600,cursor:"pointer"}}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      )}

      {/* ── STATS ── */}
      {tab==="stats" && (
        <div style={{display:"grid",gap:14}}>
          <div style={{background:"#fff",borderRadius:14,padding:"16px",boxShadow:"0 2px 10px rgba(0,0,0,0.07)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontWeight:700,color:B.text}}>🏆 Top Designs</div>
              <button onClick={async()=>{ const o=await db.get("orders"); setOrders(o||[]); show("Stats refreshed!"); }} style={{fontSize:11,color:B.green,background:B.greenPale,border:"none",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontWeight:600}}>↻ Refresh</button>
            </div>
            {topDesigns.length===0 ? <div style={{color:B.textLt,fontSize:13}}>No orders yet</div> :
              topDesigns.map(([name,qty],i)=>(
                <div key={name} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${B.creamDk}`}}>
                  <span style={{fontSize:13,color:B.text}}>{i+1}. {name}</span>
                  <span style={{fontSize:13,fontWeight:700,color:B.green}}>{qty} shirts</span>
                </div>
              ))
            }
          </div>
          <div style={{background:"#fff",borderRadius:14,padding:"16px",boxShadow:"0 2px 10px rgba(0,0,0,0.07)"}}>
            <div style={{fontWeight:700,color:B.text,marginBottom:12}}>🕐 Recent Orders</div>
            {orders.length===0 ? <div style={{color:B.textLt,fontSize:13}}>No orders yet</div> :
              [...orders].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)).slice(0,6).map(o=>{
                const sm=STATUS_META[o.status]||STATUS_META["New"];
                return (
                  <div key={o.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${B.creamDk}`}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:B.text}}>{o.customer_name||o.customerName} {(o.using_reward||o.usingReward)&&"🎁"}</div>
                      <div style={{fontSize:11,color:B.textLt}}>{o.date||new Date(o.created_at).toLocaleDateString()} · {o.delivery}</div>
                    </div>
                    <span style={{background:sm.bg,color:sm.color,borderRadius:20,padding:"3px 9px",fontSize:10,fontWeight:600}}>{o.status}</span>
                  </div>
                );
              })
            }
          </div>
        </div>
      )}
    </div>
  );
}
