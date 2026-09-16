// Shared theme/helpers used by both the customer-facing app (App.jsx) and
// the admin panel (Admin.jsx, lazy-loaded so it doesn't ship to every
// visitor). Keeping this in its own module avoids a circular import between
// the two.
import { useId } from "react";

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

// ─── BRAND-SPECIFIC SHIRT COLORS ───────────────────────────────────────────────
// Real manufacturer colors, and the shirt mockup renderer built on them.
// Shared because Admin.jsx renders design/order previews with ShirtSVG too.
export const BRAND_COLORS = {
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
export const SHIRT_COLORS = BRAND_COLORS.comfort;

function isDark(hex) { const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return (r*299+g*587+b*114)/1000<128; }

const SHIRT_IMG_SRC = "/assets/img/tshirt-mockup.webp";
const HOODIE_IMG_SRC = "/assets/img/hoodie-mockup.webp";
const LONGSLEEVE_IMG_SRC = "/assets/img/longsleeve-mockup.webp";
const SWEATSHIRT_IMG_SRC = "/assets/img/sweatshirt-mockup.webp";

export function ShirtSVG({color=SHIRT_COLORS[0], design, uploadImg, productId="", size=220}) {
  const hex    = color?.hex || "#F5F5F0";
  const dark   = isDark(hex);
  const lines  = (design?.preview||"").split("\n").slice(0,4);
  const st     = design?.style || "bold";
  const isUp   = st==="upload" || !!uploadImg;
  const imgH   = Math.round(size * 1.25);
  const isWhite = hex.toUpperCase() === "#F5F5F0";

  // Pick the garment artwork based on the selected product style
  const isHoodie = /hoodie/i.test(productId);
  const isSweat  = /sweat/i.test(productId);
  const isLong   = /(_ls$|long)/i.test(productId);

  let imgSrc;
  if (isHoodie)      imgSrc = HOODIE_IMG_SRC;
  else if (isSweat)  imgSrc = SWEATSHIRT_IMG_SRC;
  else if (isLong)   imgSrc = LONGSLEEVE_IMG_SRC;
  else               imgSrc = SHIRT_IMG_SRC;

  // Design placement: centered on the chest for all garments
  const cW     = size * 0.46;
  const cH     = imgH * 0.26;
  // Hoodie artwork sits slightly right-of-center in its source image; nudge to compensate
  const hOffset = isHoodie ? size * 0.015 : 0;
  const cLeft  = (size - cW) / 2 + hOffset; // horizontally centered on the garment
  const cTop   = imgH * 0.34;               // lowered onto the chest (was too high)

  const maxLen = Math.max(...lines.map(l=>l.length), 1);
  const fSize  = Math.max(7, Math.min(20, cW / maxLen * 1.5));
  const fontMap = {
    script:"'Georgia',serif", varsity:"'Georgia',serif",
    chunky:"'Arial Black',sans-serif", bold:"'Arial Black',sans-serif",
    serif:"'Georgia',serif",
  };
  const font = fontMap[st] || fontMap.bold;
  const uid = useId();
  const filterId = `tint_${uid.replace(/:/g,"")}_${hex.slice(1)}`;

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
        <image
          href={imgSrc}
          filter={`url(#${filterId})`}
          x="0" y="0"
          width={size}
          height={imgH}
          preserveAspectRatio="xMidYMid slice"
        />
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
        {color.name}
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
          <div style={{position:"relative", width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center"}}>
            <img src={uploadImg} alt={design?.name||"Your design"} style={{maxWidth:"100%", maxHeight:"100%", objectFit:"contain", filter:"drop-shadow(0 1px 3px rgba(0,0,0,0.3))"}}/>
            <div aria-hidden="true" style={{
              position:"absolute", inset:0, pointerEvents:"none",
              display:"flex", flexWrap:"wrap", alignContent:"center", justifyContent:"center",
              transform:"rotate(-22deg)", overflow:"hidden",
            }}>
              {Array.from({length:9}).map((_,i)=>(
                <span key={i} style={{
                  flex:"0 0 100%", textAlign:"center",
                  fontFamily:"'Trebuchet MS',sans-serif", fontWeight:700,
                  fontSize:Math.max(7, size*0.045), letterSpacing:1,
                  color:"rgba(120,120,120,0.32)",
                  textShadow:"0 1px 1px rgba(255,255,255,0.25)",
                  lineHeight:1.9, whiteSpace:"nowrap", userSelect:"none",
                }}>To A "T" Boutique</span>
              ))}
            </div>
          </div>
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
export function SecHead({children}) { return <div style={{fontSize:11,letterSpacing:2,textTransform:"uppercase",color:B.amber,fontFamily:"'Trebuchet MS',sans-serif",fontWeight:700,marginBottom:10}}>{children}</div>; }
