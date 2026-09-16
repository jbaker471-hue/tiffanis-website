// Admin panel — lazy-loaded from App.jsx via React.lazy() so this code
// (order tracker, designs manager, AI sort, loyalty/messages/stats tabs)
// never ships in the bundle every customer downloads, only whoever
// actually opens the Admin tab.
import { useState, useEffect, useRef } from "react";
import { B, INP, PBTN, Lbl, SecHead, PAYMENT_OPTS, STATUSES, STATUS_META, SHIRTS_FOR_REWARD, admin, rewardCode, pi, SHIRT_COLORS, ShirtSVG } from "./shared.jsx";
import { availableRewards } from "./loyalty.js";

export function Tracker({orders, setOrders, customers, setCustomers, adminPassword, show, embedded=false}) {
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
    try { await admin.mutate(adminPassword, "orders", "update", id, ch); } catch(e) { console.error("Update failed:",e); }
  };
  const del = async (id) => {
    setOrders(prev=>prev.filter(o=>o.id!==id)); // optimistic
    setOpenId(null);
    show("Order deleted","err");
    try { await admin.mutate(adminPassword, "orders", "delete", id); } catch(e) { console.error("Delete failed:",e); }
  };
  const markRedeemed = async (order) => {
    if(!order.phone) return;
    const result = await admin.mutate(adminPassword, "customers", "upsertCustomer", null, {
      phone: order.phone, name: order.customer_name||order.customerName, addShirts: 0, redeem: true,
    });
    await update(order.id, {reward_redeemed:true});
    if (result) setCustomers(prev => {
      const idx = prev.findIndex(c=>c.id===result.id);
      return idx===-1 ? [...prev, result] : prev.map(c=>c.id===result.id?result:c);
    });
    show("Reward marked as redeemed!","gold");
  };

  const exportCSV = () => {
    const rows=[["Date","Customer","Phone","Delivery","Brand","Design","Color","Size","Qty","Price","Placement","Payment","Paid","Status","Reward","Notes"]];
    orders.forEach(o=>pi(o).forEach(i=>rows.push([o.date,(o.customer_name||o.customerName||"Unknown"),o.phone||"",o.delivery,i.brand||o.brand||"",i.design,i.color,i.size,i.qty,i.price||"",i.placement||o.placement||"",(o.payment_method||o.paymentMethod),o.paid?"Yes":"No",o.status,(o.using_reward||o.usingReward)?"Yes":"No",o.notes||""])));
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
                    {order.placement && <div style={{fontSize:11,color:B.amber,marginTop:1}}>📍 {order.placement}</div>}
                    <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:6}}>
                      {pi(order).map((item,i)=>(
                        <span key={i} style={{fontSize:11,background:B.amberPale,color:B.textMid,borderRadius:6,padding:"2px 7px"}}>{item.design} · {item.color} {item.size} ×{item.qty}{item.brand?` · ${item.brand}`:""}{item.price?` · $${item.price}`:""}</span>
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

export function AdminLock({onUnlock, show}) {
  const [input, setInput]     = useState("");
  const [shake, setShake]     = useState(false);
  const [visible, setVisible] = useState(false);
  const [checking, setChecking] = useState(false);

  // The password is checked server-side (netlify/functions/admin-data.js)
  // against ADMIN_PASSWORD, not against a value shipped in this bundle.
  const attempt = async () => {
    if (checking) return;
    setChecking(true);
    const ok = await onUnlock(input);
    setChecking(false);
    if (!ok) {
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
          <button onClick={attempt} disabled={checking} style={{...PBTN, opacity:checking?0.6:1}}>{checking?"Checking…":"Unlock Admin →"}</button>
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
export function Admin({cats, setCats, orders, setOrders, customers, setCustomers, messages, setMessages, adminPassword, onLock, show}) {
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
      const res = await fetch("/.netlify/functions/analyze-design",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-5",max_tokens:500,
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
        <Tracker orders={orders} setOrders={setOrders} customers={customers} setCustomers={setCustomers} adminPassword={adminPassword} show={show} embedded={true}/>
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
                const avail=availableRewards(c);
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
                <div key={msg.id} onClick={async ()=>{ await admin.mutate(adminPassword,"messages","update",msg.id,{read:true}); setMessages(prev=>prev.map(m=>m.id===msg.id?{...m,read:true}:m)); }} style={{background:"#fff",borderRadius:14,padding:"14px 16px",boxShadow:"0 2px 12px rgba(0,0,0,0.07)",borderLeft:`5px solid ${msg.read?B.wood:B.green}`,cursor:"pointer"}}>
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
                      {msg.phone && (
                        <a href={`tel:${msg.phone}`} style={{padding:"6px 12px",borderRadius:8,background:B.green,color:"#fff",fontSize:11,fontWeight:600,textDecoration:"none",fontFamily:"'Trebuchet MS',sans-serif"}}>📞 Call</a>
                      )}
                      {msg.phone && (
                        <a href={`sms:${msg.phone}`} style={{padding:"6px 12px",borderRadius:8,background:"#2980B9",color:"#fff",fontSize:11,fontWeight:600,textDecoration:"none",fontFamily:"'Trebuchet MS',sans-serif"}}>💬 Text</a>
                      )}
                      <button onClick={async e=>{ e.stopPropagation(); await admin.mutate(adminPassword,"messages","delete",msg.id); setMessages(prev=>prev.filter(m=>m.id!==msg.id)); }} style={{padding:"6px 10px",borderRadius:8,border:"none",background:"#FDECEA",color:"#C0392B",fontSize:11,fontWeight:600,cursor:"pointer"}}>Delete</button>
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
              <button onClick={async()=>{ const data=await admin.unlock(adminPassword); if(data) setOrders(data.orders||[]); show("Stats refreshed!"); }} style={{fontSize:11,color:B.green,background:B.greenPale,border:"none",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontWeight:600}}>↻ Refresh</button>
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
