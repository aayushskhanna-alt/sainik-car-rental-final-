import { useState, useMemo, useEffect } from 'react'
import { supabase, uploadCarPhoto, deleteCarPhoto } from './supabase'

const REVENUE_PASSWORD = 'vasant3061'
const SETTINGS = { businessName:'Sainik Cars', tagline:'Serving those who serve the nation', whatsapp:{ aayush:'9891993389', father:'9891093389', brother:'9971333061' } }
const C = { navy:'#0d1f3c', saffron:'#f47920', green:'#1a5c2e', gold:'#c9a84c', bg:'#f4f6fb', border:'#e4e8f0', text:'#1a1a2e', muted:'#8892a4', card:'#ffffff', red:'#dc2626', purple:'#7c3aed', blue:'#1d4ed8' }

const DRIVERS_LIST = ['Ashok','Ajit Saha','Tapas','SELF']
const DEMAND_TAGS = ['High Demand','Available Now','For Sale','Last Unit','New Addition','Premium Car']
const DEMAND_ICONS = {'High Demand':'🔥','Available Now':'✅','For Sale':'🏷️','Last Unit':'⚠️','New Addition':'✨','Premium Car':'⭐'}
const DEMAND_COLORS = {'High Demand':['#fff7ed','#c2410c'],'Available Now':['#e6f9f0','#0a7a45'],'For Sale':['#f5f0ff','#7c3aed'],'Last Unit':['#fef0f0','#c0392b'],'New Addition':['#eff6ff','#1d4ed8'],'Premium Car':['#fefce8','#854d0e']}
const FEATURE_OPTIONS = ['Great Mileage','Very Reliable','Comfortable AC','Spacious Cabin','Fuel Efficient','Smooth Drive','Compact SUV','Easy Parking','Good Ground Clearance','Auto Transmission','7 Seater','Family Car','Highway Cruiser','Low Maintenance','Premium Feel','Power Steering','Reverse Camera','Sunroof']

const CHECKLIST_ITEMS = [
  {id:'ext_scratch',label:'No scratches on exterior',cat:'Exterior'},
  {id:'ext_dent',label:'No dents or damage',cat:'Exterior'},
  {id:'ext_tyre',label:'All 4 tyres in good condition',cat:'Exterior'},
  {id:'ext_glass',label:'Windshield & windows intact',cat:'Exterior'},
  {id:'int_seat',label:'Seats clean & undamaged',cat:'Interior'},
  {id:'int_dash',label:'Dashboard & controls working',cat:'Interior'},
  {id:'int_ac',label:'AC working properly',cat:'Interior'},
  {id:'int_clean',label:'Car returned clean',cat:'Interior'},
  {id:'fuel',label:'Fuel level same as given',cat:'Fuel & Mileage'},
  {id:'docs',label:'All documents in car',cat:'Documents'},
]

const WA_TERMS = `
📜 *TERMS & CONDITIONS*
━━━━━━━━━━━━━━━━━━━━
• Security deposit is refundable at end of rental subject to car condition
• All legal liability lies with the user during the complete rental period
• All challans/fines to be paid by the user
• In case of accident/breakdown, call immediately: 📞 9891093389 / 9891993389
• For full insurance protection with minimum deductible, contact us post-booking
• Please return vehicle in same condition as received — repairs for any damage borne by user
• Do NOT recharge FASTag without discussing with us first
• Kindly make a 360° video of the car noting KM reading & fuel level at pickup
• Rates outside NCR are different — please confirm before travel

📍 *Pickup/Drop Coverage:*
Gopinath Bazaar, New Delhi Cantt OR Airport/Railway Station/Mess at ₹500 extra (upto 13 KMs of Vasant Kunj).

_Sainik Cars — Est 2004 | Serving those who serve the nation_ 🇮🇳`

const fmt = n => '₹' + Number(n||0).toLocaleString('en-IN')
const today = new Date().toISOString().split('T')[0]
const daysUntil = d => !d ? 999 : Math.ceil((new Date(d)-new Date(today))/86400000)
const expColor = d => { const n=daysUntil(d); return n<0?C.red:n<=30?'#f59e0b':'#16a34a' }
const isOutsideHours = t => { if(!t) return false; const [h]=t.split(':').map(Number); return h<9||h>=20 }
const fmtDate = d => { if(!d) return '—'; const dt=new Date(d); return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}` }

const generateWAMessage = b => `🚗 *SAINIK CARS — BOOKING CONFIRMATION*
━━━━━━━━━━━━━━━━━━━━
📋 *Booking ID:* ${b.id}
👤 *Customer:* ${b.customer}${b.rank?` (${b.rank})`:''}
📱 *Phone:* ${b.phone||'—'}
🚙 *Vehicle:* ${b.car} (${b.file_no||b.fileNo||'—'})
📅 *Type:* ${b.type} | ${b.travel}
⏰ *Pickup:* ${b.start_date||b.start} at ${b.start_time||b.startTime||'09:00'}
📍 *From:* ${b.start_location||b.startLocation||'—'}
👨‍✈️ *Pickup Driver:* ${b.pickup_driver||b.pickupDriver}
⏰ *Return:* ${b.end_date||b.end} at ${b.end_time||b.endTime||'18:00'}
📍 *To:* ${b.end_location||b.endLocation||'—'}
👨‍✈️ *Return Driver:* ${b.return_driver||b.returnDriver||'TBD'}
💰 *Security Deposit:* ${fmt(b.security)}
📝 *Notes:* ${b.notes||'None'}
${WA_TERMS}`

// Map Supabase row to app format
const mapBooking = b => ({
  id:b.id, fileNo:b.file_no, car:b.car, dailyRate:b.daily_rate,
  customer:b.customer, phone:b.phone, rank:b.rank, type:b.type,
  travel:b.travel, start:b.start_date, startTime:b.start_time||'09:00',
  end:b.end_date, endTime:b.end_time||'18:00', days:b.days, revenue:b.revenue,
  security:b.security, refund:b.refund, refundPaid:b.refund_paid,
  status:b.status, startLocation:b.start_location, endLocation:b.end_location,
  pickupDriver:b.pickup_driver, returnDriver:b.return_driver,
  review:b.review, notes:b.notes, inspection:b.inspection,
  odometerStart:b.odometer_start||0,
})

const mapFleet = c => ({
  fileNo:c.file_no, regNo:c.reg_no, name:c.name, brand:c.brand,
  year:c.year, color:c.color, fuel:c.fuel, transmission:c.transmission,
  seats:c.seats, odometerReading:c.odometer_reading, kmpl:c.kmpl,
  insuranceExpiry:c.insurance_expiry, pollutionExpiry:c.pollution_expiry,
  fitnessExpiry:c.fitness_expiry, lastServiceDate:c.last_service_date,
  lastServiceKm:c.last_service_km, lastBatteryChange:c.last_battery_change,
  lastTyreChange:c.last_tyre_change, purchasePrice:c.purchase_price,
  purchaseDate:c.purchase_date, purchaseSource:c.purchase_source,
  dailyRate:c.daily_rate, weeklyRate:c.weekly_rate, monthlyRate:c.monthly_rate,
  status:c.status, forSale:c.for_sale, askingPrice:c.asking_price,
  demandTag:c.demand_tag||'Available Now', featureTags:c.feature_tags||[],
  bestPoints:c.best_points||'', whyRent:c.why_rent||'', whyBuy:c.why_buy||'',
  photos:c.photos||[], expenses:c.expenses||[],
})

// Supabase save helpers
const saveBooking = async b => {
  const row = {
    id:b.id,
    file_no:b.fileNo||'',
    car:b.car||'',
    daily_rate:Number(b.dailyRate||0),
    customer:b.customer||'',
    phone:b.phone||'',
    rank:b.rank||'',
    type:b.type||'Daily',
    travel:b.travel||'Instation',
    start_date:b.start||'',
    start_time:b.startTime||'09:00',
    end_date:b.end||'',
    end_time:b.endTime||'18:00',
    days:Number(b.days||0),
    revenue:Number(b.revenue||0),
    security:Number(b.security||0),
    refund:Number(b.refund||0),
    refund_paid:b.refundPaid||false,
    status:b.status||'Active',
    start_location:b.startLocation||'',
    end_location:b.endLocation||'',
    pickup_driver:b.pickupDriver||'',
    return_driver:b.returnDriver||'',
    review:b.review||'Pending',
    notes:b.notes||'',
    inspection:b.inspection||null,
    odometer_start:Number(b.odometerStart||0),
  }
  const { error } = await supabase.from('bookings').upsert(row, { onConflict: 'id' })
  if(error) console.error('saveBooking error:', JSON.stringify(error))
  return !error
}

const saveFleet = async c => {
  const row = {
    file_no:c.fileNo, reg_no:c.regNo, name:c.name, brand:c.brand,
    year:c.year, color:c.color, fuel:c.fuel, transmission:c.transmission,
    seats:c.seats, odometer_reading:c.odometerReading, kmpl:c.kmpl,
    insurance_expiry:c.insuranceExpiry, pollution_expiry:c.pollutionExpiry,
    fitness_expiry:c.fitnessExpiry, last_service_date:c.lastServiceDate,
    last_service_km:c.lastServiceKm, last_battery_change:c.lastBatteryChange,
    last_tyre_change:c.lastTyreChange, purchase_price:c.purchasePrice,
    purchase_date:c.purchaseDate, purchase_source:c.purchaseSource,
    daily_rate:c.dailyRate, weekly_rate:c.weeklyRate, monthly_rate:c.monthlyRate,
    status:c.status, for_sale:c.forSale, asking_price:c.askingPrice,
    demand_tag:c.demandTag, feature_tags:c.featureTags,
    best_points:c.bestPoints, why_rent:c.whyRent, why_buy:c.whyBuy,
    photos:c.photos, expenses:c.expenses,
  }
  await supabase.from('fleet').upsert(row)
}

// UI COMPONENTS
const SBadge = ({s}) => {
  const m = {
    Active:['#e6f9f0','#0a7a45'], Done:['#f0f2f5','#5a6478'],
    Cancelled:['#fef0f0','#c0392b'], Available:['#e6f9f0','#0a7a45'],
    'On Rent':['#e8f0fe','#1a56db'], Maintenance:['#fffbeb','#b45309'],
    'For Sale':['#f5f0ff','#7c3aed'], Upcoming:['#eff6ff','#1d4ed8'],
  }
  const [bg,col] = m[s]||['#f0f2f5','#5a6478']
  return <span style={{display:'inline-block',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:bg,color:col}}>{s}</span>
}
const Card = ({children,style={}}) => <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20,...style}}>{children}</div>
const Lbl = ({t}) => <div style={{fontSize:11,fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:5}}>{t}</div>
const Inp = ({label,warn,...p}) => <div>{label&&<Lbl t={label}/>}<input {...p} style={{width:'100%',padding:'9px 12px',border:`1px solid ${warn?'#f59e0b':C.border}`,borderRadius:8,fontSize:13,outline:'none',background:'#fff',boxSizing:'border-box',...p.style}}/>{warn&&<div style={{fontSize:11,color:'#d97706',marginTop:3}}>⚠️ {warn}</div>}</div>
const Sel = ({label,children,...p}) => <div>{label&&<Lbl t={label}/>}<select {...p} style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,background:'#fff',outline:'none',boxSizing:'border-box'}}>{children}</select></div>
const Btn = ({children,onClick,v='primary',small,style={}}) => {
  const s={primary:{background:C.saffron,color:'#fff',border:'none'},secondary:{background:'#fff',color:C.navy,border:`1px solid ${C.border}`},navy:{background:C.navy,color:'#fff',border:'none'},red:{background:C.red,color:'#fff',border:'none'},green:{background:'#16a34a',color:'#fff',border:'none'}}
  return <button onClick={onClick} style={{borderRadius:8,cursor:'pointer',fontWeight:700,fontSize:small?11:13,padding:small?'6px 12px':'9px 18px',...s[v],...style}}>{children}</button>
}
const SecTitle = ({t}) => <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:1,margin:'16px 0 8px',paddingBottom:6,borderBottom:`1px solid ${C.border}`}}>{t}</div>
const DR = ({l,v,hi}) => <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:`1px solid ${C.bg}`}}><span style={{fontSize:13,color:C.muted}}>{l}</span><span style={{fontSize:13,fontWeight:hi?700:500,color:hi?C.navy:C.text}}>{v}</span></div>
const Modal = ({onClose,title,sub,children,maxW=540,noPad}) => (
  <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(13,31,60,0.5)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:20,overflowY:'auto'}}>
    <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:maxW,maxHeight:'92vh',overflowY:'auto',boxShadow:'0 24px 64px rgba(0,0,0,0.18)'}}>
      <div style={{padding:'18px 24px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,background:'#fff',zIndex:10,borderRadius:'16px 16px 0 0'}}>
        <div>{sub&&<div style={{fontSize:11,color:C.muted,marginBottom:2}}>{sub}</div>}<div style={{fontSize:17,fontWeight:700,color:C.navy}}>{title}</div></div>
        <button onClick={onClose} style={{background:C.bg,border:'none',width:32,height:32,borderRadius:'50%',cursor:'pointer',fontSize:15,color:C.muted}}>✕</button>
      </div>
      {noPad?children:<div style={{padding:'20px 24px'}}>{children}</div>}
    </div>
  </div>
)

// INSPECTION MODAL
function InspectionModal({booking,onClose,onSave}) {
  const [checks,setChecks] = useState({})
  const [damage,setDamage] = useState('')
  const [startKm] = useState(booking.odometerStart||0)
  const [endKm,setEndKm] = useState('')
  const [fuel,setFuel] = useState('Same as given')
  const [by,setBy] = useState('')
  const [photos,setPhotos] = useState([])
  const cats = [...new Set(CHECKLIST_ITEMS.map(i=>i.cat))]
  const allDone = CHECKLIST_ITEMS.every(i=>checks[i.id])
  const kmsUsed = endKm && startKm ? Math.max(0, Number(endKm)-Number(startKm)) : null

  return (
    <Modal onClose={onClose} title="Return Inspection" sub={`${booking.id} · ${booking.customer} · ${booking.car}`} maxW={560}>
      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:10,padding:12,marginBottom:16,fontSize:13,color:'#92400e'}}>⚠️ Complete all checks carefully. You are accountable for this inspection.</div>
      {cats.map(cat=>(
        <div key={cat}>
          <SecTitle t={cat}/>
          {CHECKLIST_ITEMS.filter(i=>i.cat===cat).map(item=>(
            <div key={item.id} onClick={()=>setChecks(c=>({...c,[item.id]:!c[item.id]}))} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',borderRadius:8,cursor:'pointer',background:checks[item.id]?'#f0fdf4':'#fff',border:`1px solid ${checks[item.id]?'#86efac':C.border}`,marginBottom:6}}>
              <div style={{width:22,height:22,borderRadius:6,border:`2px solid ${checks[item.id]?'#16a34a':C.border}`,background:checks[item.id]?'#16a34a':'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{checks[item.id]&&<span style={{color:'#fff',fontSize:13,fontWeight:900}}>✓</span>}</div>
              <span style={{fontSize:13}}>{item.label}</span>
            </div>
          ))}
        </div>
      ))}
      <SecTitle t="Odometer & Fuel"/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12}}>
        <div style={{padding:12,background:C.bg,borderRadius:8}}><div style={{fontSize:11,color:C.muted,marginBottom:3}}>Start KM</div><div style={{fontSize:15,fontWeight:700,color:C.navy}}>{startKm?.toLocaleString()||'—'}</div></div>
        <Inp label="End KM (Return)" type="number" value={endKm} onChange={e=>setEndKm(e.target.value)} placeholder="e.g. 45230"/>
        <div style={{padding:12,background:kmsUsed!==null?'#e6f9f0':C.bg,borderRadius:8}}><div style={{fontSize:11,color:C.muted,marginBottom:3}}>KMs Used</div><div style={{fontSize:15,fontWeight:700,color:kmsUsed!==null?'#0a7a45':C.muted}}>{kmsUsed!==null?`${kmsUsed.toLocaleString()} km`:'—'}</div></div>
      </div>
      <Sel label="Fuel Level" value={fuel} onChange={e=>setFuel(e.target.value)} style={{marginBottom:12}}>{['Same as given','Full','3/4','Half','1/4','Empty'].map(o=><option key={o}>{o}</option>)}</Sel>
      <div style={{marginBottom:12}}><Lbl t="Damage Notes (if any)"/><textarea value={damage} onChange={e=>setDamage(e.target.value)} placeholder="Describe any damage..." style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,outline:'none',height:70,resize:'vertical',boxSizing:'border-box'}}/></div>
      <SecTitle t="Photos"/>
      <div style={{border:`2px dashed ${C.border}`,borderRadius:10,padding:16,textAlign:'center',marginBottom:16,background:C.bg}}>
        <div style={{fontSize:24,marginBottom:4}}>📷</div>
        <div style={{fontSize:12,color:C.muted}}>All 4 sides + any damage</div>
        <input type="file" multiple accept="image/*" onChange={e=>setPhotos(Array.from(e.target.files))} style={{display:'none'}} id="insp-photos"/>
        <label htmlFor="insp-photos" style={{display:'inline-block',marginTop:8,padding:'6px 14px',background:C.navy,color:'#fff',borderRadius:8,fontSize:12,cursor:'pointer',fontWeight:600}}>Choose Photos</label>
        {photos.length>0&&<div style={{fontSize:12,color:'#16a34a',marginTop:6,fontWeight:600}}>✓ {photos.length} photo{photos.length>1?'s':''} selected</div>}
      </div>
      <Inp label="Inspected By" value={by} onChange={e=>setBy(e.target.value)} placeholder="Enter your name" style={{marginBottom:16}}/>
      <div style={{background:allDone?'#f0fdf4':'#fff7ed',border:`1px solid ${allDone?'#86efac':'#fed7aa'}`,borderRadius:10,padding:12,marginBottom:16,fontSize:13,color:allDone?'#15803d':'#92400e',textAlign:'center',fontWeight:600}}>
        {allDone?'✅ All checks completed':`⚠️ ${CHECKLIST_ITEMS.filter(i=>!checks[i.id]).length} checks remaining`}
      </div>
      <Btn onClick={()=>{ if(!by) return alert('Enter your name'); onSave({date:today,confirmedBy:by,checks,damage,endKm:Number(endKm)||0,kmsUsed,fuel,photos:photos.length,timestamp:new Date().toISOString()}); onClose() }} style={{width:'100%',padding:'13px',fontSize:14}}>
        {allDone?'✅ Save & Close Booking':'Save Inspection'}
      </Btn>
    </Modal>
  )
}

// EXTEND MODAL
function ExtendModal({booking,onClose,onExtend}) {
  const [newEnd,setNewEnd] = useState(booking.end)
  const [newTime,setNewTime] = useState(booking.endTime||'18:00')
  const extraDays = newEnd>booking.end ? Math.ceil((new Date(newEnd)-new Date(booking.end))/86400000) : 0
  const ratePerDay = booking.days>0 ? Math.round((booking.revenue||0)/booking.days) : (booking.dailyRate||0)
  const extraRevenue = extraDays * ratePerDay
  return (
    <Modal onClose={onClose} title="Extend Booking" sub={`${booking.id} · ${booking.customer}`} maxW={420}>
      <div style={{background:C.bg,borderRadius:10,padding:14,marginBottom:16}}>
        <div style={{fontSize:12,color:C.muted,marginBottom:4}}>Current End</div>
        <div style={{fontSize:18,fontWeight:700,color:C.navy}}>{booking.end} at {booking.endTime||'18:00'}</div>
        <div style={{fontSize:12,color:C.muted,marginTop:6}}>Rate per day: {fmt(ratePerDay)} (from original booking)</div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
        <Inp label="New End Date" type="date" value={newEnd} onChange={e=>setNewEnd(e.target.value)}/>
        <Inp label="New End Time" type="time" value={newTime} onChange={e=>setNewTime(e.target.value)}/>
      </div>
      {extraDays>0&&(
        <div style={{background:'#e6f9f0',border:'1px solid #86efac',borderRadius:10,padding:14,marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:13,color:C.muted}}>Extra Days</span><span style={{fontSize:14,fontWeight:700,color:'#15803d'}}>+{extraDays} days</span></div>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:13,color:C.muted}}>Rate per Day</span><span style={{fontSize:13,fontWeight:600,color:'#15803d'}}>{fmt(ratePerDay)}</span></div>
          <div style={{display:'flex',justifyContent:'space-between',borderTop:'1px solid #86efac',paddingTop:8}}><span style={{fontSize:13,color:C.muted}}>Additional Revenue</span><span style={{fontSize:18,fontWeight:900,color:'#15803d'}}>+{fmt(extraRevenue)}</span></div>
        </div>
      )}
      <Btn onClick={()=>{ if(newEnd<=booking.end) return alert('New end date must be after current end date'); const days=Math.ceil((new Date(newEnd)-new Date(booking.start))/86400000); onExtend({...booking,end:newEnd,endTime:newTime,days,revenue:(booking.revenue||0)+extraRevenue}); onClose() }} style={{width:'100%',padding:'13px'}}>Confirm Extension</Btn>
    </Modal>
  )
}

// SHORTEN MODAL
function ShortenModal({booking,onClose,onShorten}) {
  const [newEnd,setNewEnd] = useState(booking.end)
  const [newTime,setNewTime] = useState(booking.endTime||'18:00')
  const daysRemoved = newEnd<booking.end&&newEnd>=today ? Math.ceil((new Date(booking.end)-new Date(newEnd))/86400000) : 0
  const ratePerDay = booking.days>0 ? Math.round((booking.revenue||0)/booking.days) : (booking.dailyRate||0)
  const revenueReduction = daysRemoved * ratePerDay
  const newRevenue = Math.max(0, (booking.revenue||0) - revenueReduction)
  return (
    <Modal onClose={onClose} title="Shorten Booking" sub={`${booking.id} · ${booking.customer}`} maxW={420}>
      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:10,padding:14,marginBottom:16}}>
        <div style={{fontSize:12,color:C.muted,marginBottom:4}}>Current End</div>
        <div style={{fontSize:18,fontWeight:700,color:C.navy}}>{booking.end} at {booking.endTime||'18:00'}</div>
        <div style={{fontSize:12,color:C.muted,marginTop:6}}>Rate per day: {fmt(ratePerDay)} (from original booking)</div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:8}}>
        <Inp label="New End Date" type="date" value={newEnd} onChange={e=>setNewEnd(e.target.value)} style={{borderColor:newEnd<today?C.red:undefined}}/>
        <Inp label="New End Time" type="time" value={newTime} onChange={e=>setNewTime(e.target.value)}/>
      </div>
      <div style={{fontSize:11,color:C.muted,marginBottom:16}}>New end date must be after today ({today}) and before current end ({booking.end})</div>
      {daysRemoved>0&&(
        <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:10,padding:14,marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:13,color:C.muted}}>Days Removed</span><span style={{fontSize:14,fontWeight:700,color:'#c2410c'}}>-{daysRemoved} days</span></div>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:13,color:C.muted}}>Revenue Deduction</span><span style={{fontSize:13,fontWeight:600,color:'#c2410c'}}>{fmt(revenueReduction)}</span></div>
          <div style={{display:'flex',justifyContent:'space-between',borderTop:'1px solid #fed7aa',paddingTop:8}}><span style={{fontSize:13,color:C.muted}}>New Revenue</span><span style={{fontSize:18,fontWeight:900,color:C.navy}}>{fmt(newRevenue)}</span></div>
        </div>
      )}
      <Btn onClick={()=>{
        if(newEnd>=booking.end) return alert('New end date must be before current end date')
        if(newEnd<today) return alert('New end date must be today or later')
        const days=Math.ceil((new Date(newEnd)-new Date(booking.start))/86400000)
        onShorten({...booking,end:newEnd,endTime:newTime,days,revenue:newRevenue,status:'Done'})
        onClose()
      }} style={{width:'100%',padding:'13px'}} v="red">Confirm Early Return</Btn>
    </Modal>
  )
}

// EDIT BOOKING MODAL
function EditBookingModal({booking,fleet,onClose,onSave}) {
  const [form,setForm] = useState({...booking})
  const upd = (k,v) => setForm(f=>({...f,[k]:v}))
  return (
    <Modal onClose={onClose} title="Edit Booking" sub={`${booking.id} · ${booking.customer}`} maxW={640}>
      <SecTitle t="Customer"/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:4}}>
        <Inp label="Customer Name" value={form.customer||''} onChange={e=>upd('customer',e.target.value)}/>
        <Inp label="Phone" value={form.phone||''} onChange={e=>upd('phone',e.target.value)}/>
        <Inp label="Rank" value={form.rank||''} onChange={e=>upd('rank',e.target.value)}/>
      </div>
      <SecTitle t="Vehicle"/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:4}}>
        <Sel label="Car" value={form.car||''} onChange={e=>{
          const car = fleet.find(c=>`${c.brand} ${c.name} ${c.year}`===e.target.value||c.name===e.target.value)
          upd('car',e.target.value)
          if(car) upd('fileNo',car.fileNo)
        }}>
          <option value="">Select car...</option>
          {fleet.map(c=><option key={c.fileNo}>{c.brand} {c.name} {c.year}</option>)}
        </Sel>
        <Inp label="File No" value={form.fileNo||''} onChange={e=>upd('fileNo',e.target.value)}/>
      </div>
      <SecTitle t="Schedule"/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:12,marginBottom:4}}>
        <Inp label="Start Date" type="date" value={form.start||''} onChange={e=>upd('start',e.target.value)}/>
        <Inp label="Start Time" type="time" value={form.startTime||'09:00'} onChange={e=>upd('startTime',e.target.value)} warn={isOutsideHours(form.startTime)?'Outside 9AM–8PM. Extra charges apply.':undefined}/>
        <Inp label="End Date" type="date" value={form.end||''} onChange={e=>upd('end',e.target.value)}/>
        <Inp label="End Time" type="time" value={form.endTime||'18:00'} onChange={e=>upd('endTime',e.target.value)} warn={isOutsideHours(form.endTime)?'Outside 9AM–8PM. Extra charges apply.':undefined}/>
      </div>
      <SecTitle t="Locations"/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:4}}>
        <Inp label="Start Location" value={form.startLocation||''} onChange={e=>upd('startLocation',e.target.value)}/>
        <Inp label="End Location" value={form.endLocation||''} onChange={e=>upd('endLocation',e.target.value)}/>
      </div>
      <SecTitle t="Drivers"/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:4}}>
        <Sel label="Pickup Driver" value={form.pickupDriver||''} onChange={e=>upd('pickupDriver',e.target.value)}>{DRIVERS_LIST.map(o=><option key={o}>{o}</option>)}</Sel>
        <Sel label="Return Driver" value={form.returnDriver||''} onChange={e=>upd('returnDriver',e.target.value)}>{DRIVERS_LIST.map(o=><option key={o}>{o}</option>)}</Sel>
      </div>
      <SecTitle t="Financials"/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:12,marginBottom:4}}>
        <Inp label="Revenue ₹" type="number" value={form.revenue||''} onChange={e=>upd('revenue',Number(e.target.value))}/>
        <Inp label="Security ₹" type="number" value={form.security||''} onChange={e=>upd('security',Number(e.target.value))}/>
        <Inp label="Refund ₹" type="number" value={form.refund||''} onChange={e=>upd('refund',Number(e.target.value))}/>
        <Inp label="Odometer Start" type="number" value={form.odometerStart||''} onChange={e=>upd('odometerStart',Number(e.target.value))}/>
      </div>
      <SecTitle t="Other"/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12}}>
        <Sel label="Rental Type" value={form.type||'Daily'} onChange={e=>upd('type',e.target.value)}>{['Daily','Weekly','Monthly'].map(o=><option key={o}>{o}</option>)}</Sel>
        <Sel label="Travel Type" value={form.travel||'Instation'} onChange={e=>upd('travel',e.target.value)}>{['Instation','Outstation'].map(o=><option key={o}>{o}</option>)}</Sel>
        <Sel label="Status" value={form.status||'Active'} onChange={e=>upd('status',e.target.value)}>{['Active','Upcoming','Done','Cancelled'].map(o=><option key={o}>{o}</option>)}</Sel>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
        <Sel label="Google Review" value={form.review||'Pending'} onChange={e=>upd('review',e.target.value)}>{['Pending','Yes'].map(o=><option key={o}>{o}</option>)}</Sel>
        <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,marginTop:20}}>
          <input type="checkbox" checked={!!form.refundPaid} onChange={e=>upd('refundPaid',e.target.checked)} style={{width:16,height:16}}/> Refund Paid
        </label>
      </div>
      <Lbl t="Notes"/><textarea value={form.notes||''} onChange={e=>upd('notes',e.target.value)} style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,outline:'none',height:60,resize:'vertical',boxSizing:'border-box',marginBottom:16}}/>
      <Btn onClick={()=>{onSave(form);onClose()}} style={{width:'100%',padding:'13px',fontSize:14}}>Save Changes</Btn>
    </Modal>
  )
}

// DASHBOARD
function Dashboard({bookings,fleet}) {
  const active = bookings.filter(b=>b.status==='Active')
  const upcoming = bookings.filter(b=>b.status==='Upcoming')
  const todayPU = bookings.filter(b=>b.start===today)
  const todayDR = bookings.filter(b=>b.end===today)
  const refunds = bookings.filter(b=>b.status==='Done'&&b.refund>0&&!b.refundPaid)
  const reviews = bookings.filter(b=>b.status==='Done'&&b.review!=='Yes')
  const avail = fleet.filter(f=>f.status==='Available').length
  const alerts = []
  fleet.forEach(car=>{
    if(daysUntil(car.insuranceExpiry)<=30) alerts.push({car:`${car.fileNo} ${car.name}`,type:'Insurance',days:daysUntil(car.insuranceExpiry)})
    if(daysUntil(car.pollutionExpiry)<=30) alerts.push({car:`${car.fileNo} ${car.name}`,type:'PUC',days:daysUntil(car.pollutionExpiry)})
    if(daysUntil(car.fitnessExpiry)<=30) alerts.push({car:`${car.fileNo} ${car.name}`,type:'Fitness',days:daysUntil(car.fitnessExpiry)})
  })
  const h=new Date().getHours()
  const greet=h<12?'Good Morning':h<17?'Good Afternoon':'Good Evening'
  return (
    <div>
      <div style={{marginBottom:24}}><div style={{fontSize:24,fontWeight:900,color:C.navy}}>{greet} 👋</div><div style={{fontSize:14,color:C.muted,marginTop:4}}>Here's what's happening at Sainik Cars today</div></div>
      {alerts.length>0&&(
        <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'14px 18px',marginBottom:20}}>
          <div style={{fontSize:13,fontWeight:700,color:'#c2410c',marginBottom:8}}>⚠️ {alerts.length} Compliance Alert{alerts.length>1?'s':''} — Action Required</div>
          {alerts.map((a,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#9a3412',padding:'3px 0'}}><span><strong>{a.car}</strong> — {a.type}</span><span style={{fontWeight:700}}>{a.days<0?`Expired ${Math.abs(a.days)}d ago`:`${a.days}d left`}</span></div>)}
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24}}>
        {[
          {l:'Active Rentals',v:active.length,icon:'🟢',color:'#0a7a45',bg:'#e6f9f0'},
          {l:'Upcoming',v:upcoming.length,icon:'📅',color:C.blue,bg:'#eff6ff'},
          {l:"Today's Pickups",v:todayPU.length,icon:'📍',color:'#c2410c',bg:'#fff7ed'},
          {l:"Today's Returns",v:todayDR.length,icon:'🏁',color:C.purple,bg:'#f5f0ff'},
        ].map(({l,v,icon,color,bg})=>(
          <Card key={l} style={{padding:'18px 20px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div><Lbl t={l}/><div style={{fontSize:36,fontWeight:900,color,lineHeight:1}}>{v}</div></div>
              <div style={{width:44,height:44,background:bg,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>{icon}</div>
            </div>
          </Card>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
        <Card>
          <div style={{fontWeight:700,fontSize:14,color:C.navy,marginBottom:14,display:'flex',justifyContent:'space-between'}}><span>🟢 Active Rentals</span><span style={{fontSize:12,background:C.bg,color:C.muted,padding:'2px 8px',borderRadius:10}}>{active.length}</span></div>
          {active.length===0&&<div style={{color:C.muted,fontSize:13,textAlign:'center',padding:16}}>No active rentals</div>}
          {active.slice(0,6).map(b=><div key={b.id} style={{padding:'10px 0',borderBottom:`1px solid ${C.bg}`}}><div style={{fontSize:13,fontWeight:600}}>{b.customer}</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>{b.car} · {b.type}</div><div style={{fontSize:11,color:C.saffron,marginTop:2}}>Ends {b.end}</div></div>)}
        </Card>
        <Card>
          <div style={{fontWeight:700,fontSize:14,color:C.navy,marginBottom:14,display:'flex',justifyContent:'space-between'}}><span>💰 Pending Refunds</span><span style={{fontSize:12,background:C.bg,color:C.muted,padding:'2px 8px',borderRadius:10}}>{refunds.length}</span></div>
          {refunds.length===0&&<div style={{color:C.muted,fontSize:13,textAlign:'center',padding:16}}>All refunds cleared ✓</div>}
          {refunds.slice(0,5).map(b=><div key={b.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:`1px solid ${C.bg}`}}><div><div style={{fontSize:13,fontWeight:500}}>{b.customer}</div><div style={{fontSize:11,color:C.muted}}>{b.car}</div></div><div style={{fontSize:14,fontWeight:900,color:C.red}}>{fmt(b.refund)}</div></div>)}
        </Card>
        <Card>
          <div style={{fontWeight:700,fontSize:14,color:C.navy,marginBottom:14,display:'flex',justifyContent:'space-between'}}><span>⭐ Review Reminders</span><span style={{fontSize:12,background:C.bg,color:C.muted,padding:'2px 8px',borderRadius:10}}>{reviews.length}</span></div>
          {reviews.length===0&&<div style={{color:C.muted,fontSize:13,textAlign:'center',padding:16}}>All reviews received ✓</div>}
          {reviews.slice(0,5).map(b=><div key={b.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:`1px solid ${C.bg}`}}><div><div style={{fontSize:13,fontWeight:500}}>{b.customer}</div><div style={{fontSize:11,color:C.muted}}>{b.car}</div></div><a href={`https://wa.me/91${b.phone||SETTINGS.whatsapp.aayush}?text=Dear ${b.customer}, Thank you for choosing Sainik Cars! We'd love a Google Review 🙏`} target="_blank" rel="noreferrer" style={{fontSize:11,background:'#25d366',color:'#fff',padding:'5px 10px',borderRadius:10,textDecoration:'none',fontWeight:700}}>WA ↗</a></div>)}
        </Card>
      </div>
    </div>
  )
}

// BOOKINGS
function Bookings({bookings,setBookings,fleet,drivers}) {
  const [search,setSearch] = useState('')
  const [filter,setFilter] = useState('All')
  const [sel,setSel] = useState(null)
  const [adding,setAdding] = useState(false)
  const [extending,setExtending] = useState(null)
  const [shortening,setShortening] = useState(null)
  const [inspecting,setInspecting] = useState(null)
  const [editing,setEditing] = useState(null)
  const [waCopied,setWaCopied] = useState(false)
  const [staffChecks,setStaffChecks] = useState({video:false,fasttag:false,emergency:false,fuekm:false})
  const defF = {status:'Active',type:'Daily',travel:'Instation',pickupDriver:'Ashok',returnDriver:'Ashok',startTime:'09:00',endTime:'18:00',startLocation:'',endLocation:'',refundPaid:false,odometerStart:0}
  const [form,setForm] = useState(defF)
  const upd = (k,v)=>setForm(f=>({...f,[k]:v}))

  const filtered = useMemo(()=>bookings.filter(b=>{
    const s=search.toLowerCase()
    return (!s||b.customer?.toLowerCase().includes(s)||b.car?.toLowerCase().includes(s)||b.id?.toLowerCase().includes(s))&&(filter==='All'||b.status===filter||b.type===filter)
  }),[bookings,search,filter])

  const updB = async u => {
    setBookings(bs=>bs.map(b=>b.id===u.id?u:b))
    if(sel?.id===u.id) setSel(u)
    const ok = await saveBooking(u)
    if(ok) {
      const { data } = await supabase.from('bookings').select('*').eq('id', u.id).single()
      if(data) {
        const mapped = mapBooking(data)
        setBookings(bs=>bs.map(b=>b.id===mapped.id?mapped:b))
        if(sel?.id===mapped.id) setSel(mapped)
      }
    }
  }

  const copyWA = b => { navigator.clipboard.writeText(generateWAMessage(b)).then(()=>{ setWaCopied(true); setTimeout(()=>setWaCopied(false),2500) }) }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div><div style={{fontSize:22,fontWeight:800,color:C.navy}}>Bookings</div><div style={{fontSize:13,color:C.muted}}>{bookings.length} total</div></div>
        <Btn onClick={()=>{setAdding(true);setStaffChecks({video:false,fasttag:false,emergency:false,fuekm:false})}}>+ New Booking</Btn>
      </div>
      <div style={{display:'flex',gap:10,marginBottom:14}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by customer, car or booking ID..." style={{flex:1,padding:'10px 14px',border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,outline:'none'}}/>
        <select value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:'10px 14px',border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,background:'#fff',outline:'none'}}>
          {['All','Active','Upcoming','Done','Cancelled','Daily','Weekly','Monthly'].map(o=><option key={o}>{o}</option>)}
        </select>
      </div>
      <div style={{fontSize:12,color:C.muted,marginBottom:10}}>{filtered.length} bookings shown</div>
      <Card style={{padding:0,overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'75px 1fr 130px 80px 90px 60px',gap:12,padding:'10px 18px',background:C.bg,fontSize:11,color:C.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:0.5}}>
          <span>ID</span><span>Customer</span><span>Schedule</span><span>Type</span><span>Status</span><span>Review</span>
        </div>
        <div style={{maxHeight:520,overflowY:'auto'}}>
          {filtered.map((b,i)=>(
            <div key={b.id} onClick={()=>setSel(b)} style={{display:'grid',gridTemplateColumns:'75px 1fr 130px 80px 90px 60px',gap:12,padding:'13px 18px',borderBottom:`1px solid ${C.bg}`,cursor:'pointer',alignItems:'center',background:i%2===0?'#fff':'#fafbfd'}} onMouseEnter={e=>e.currentTarget.style.background='#f0f4ff'} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'#fff':'#fafbfd'}>
              <span style={{fontSize:12,color:C.saffron,fontWeight:700}}>{b.id}</span>
              <div>
                <div style={{fontSize:13,fontWeight:600}}>{b.customer}</div>
                <div style={{fontSize:11,color:C.muted}}>{b.fileNo} · {b.car}</div>
                <div style={{fontSize:11,color:C.muted}}>{b.pickupDriver} → {b.returnDriver||'TBD'}</div>
                {b.phone&&<a href={`tel:${b.phone}`} onClick={e=>e.stopPropagation()} style={{fontSize:11,color:'#1a56db',textDecoration:'none'}}>📞 {b.phone}</a>}
              </div>
              <div style={{fontSize:11,color:C.muted}}><div>{b.start} {b.startTime}</div><div>→ {b.end} {b.endTime}</div></div>
              <div><div style={{fontSize:11,color:C.muted}}>{b.type}</div><div style={{fontSize:11,color:C.muted}}>{b.travel}</div></div>
              <SBadge s={b.status}/>
              <div style={{fontSize:14}}>{b.review==='Yes'?'✅':'⏳'}{b.inspection?' 📋':''}</div>
            </div>
          ))}
        </div>
      </Card>

      {sel&&(
        <Modal onClose={()=>{setSel(null);setWaCopied(false)}} title={sel.customer} sub={`${sel.id} · ${sel.fileNo} · ${sel.car}`} maxW={580}>
          <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
            <SBadge s={sel.status}/>
            <span style={{display:'inline-block',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,background:C.bg,color:C.muted}}>{sel.type}</span>
            <span style={{display:'inline-block',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,background:C.bg,color:C.muted}}>{sel.travel}</span>
            {sel.inspection&&<span style={{display:'inline-block',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,background:'#e6f9f0',color:'#0a7a45'}}>Inspected ✓</span>}
          </div>
          <div style={{background:C.bg,borderRadius:10,padding:14,marginBottom:16}}>
            <div style={{fontSize:11,color:C.muted,marginBottom:4}}>Customer</div>
            <div style={{fontSize:15,fontWeight:700,color:C.navy}}>{sel.customer} <span style={{fontSize:12,color:C.muted,fontWeight:400}}>({sel.rank||'—'})</span></div>
            {sel.phone&&<div style={{display:'flex',gap:8,marginTop:8}}>
              <a href={`tel:${sel.phone}`} style={{fontSize:12,background:C.navy,color:'#fff',padding:'5px 14px',borderRadius:8,textDecoration:'none',fontWeight:600}}>📞 Call</a>
              <a href={`https://wa.me/91${sel.phone}`} target="_blank" rel="noreferrer" style={{fontSize:12,background:'#25d366',color:'#fff',padding:'5px 14px',borderRadius:8,textDecoration:'none',fontWeight:600}}>💬 WhatsApp</a>
            </div>}
          </div>
          <SecTitle t="Trip Details"/>
          <DR l="Start" v={`${sel.start} at ${sel.startTime}`}/><DR l="End" v={`${sel.end} at ${sel.endTime}`}/><DR l="Duration" v={`${sel.days} days`}/><DR l="Start Location" v={sel.startLocation||'—'}/><DR l="End Location" v={sel.endLocation||'—'}/>
          <SecTitle t="Drivers"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <div style={{background:C.bg,borderRadius:10,padding:12}}><div style={{fontSize:11,color:C.muted,marginBottom:4}}>Pickup Driver</div><div style={{fontSize:15,fontWeight:700,color:C.navy}}>{sel.pickupDriver||'—'}</div></div>
            <div style={{background:C.bg,borderRadius:10,padding:12}}><div style={{fontSize:11,color:C.muted,marginBottom:4}}>Return Driver</div><div style={{fontSize:15,fontWeight:700,color:C.navy}}>{sel.returnDriver||'TBD'}</div></div>
          </div>
          <SecTitle t="Financials"/>
          <DR l="Revenue" v={fmt(sel.revenue)} hi/><DR l="Security" v={fmt(sel.security)}/>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:`1px solid ${C.bg}`}}>
            <span style={{fontSize:13,color:C.muted}}>Refund Amount</span>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <span style={{fontSize:13,fontWeight:500}}>{fmt(sel.refund)}</span>
              {sel.refund>0&&(
                <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:12,fontWeight:700,color:sel.refundPaid?'#16a34a':C.red}}>
                  <input type="checkbox" checked={!!sel.refundPaid} onChange={e=>updB({...sel,refundPaid:e.target.checked})} style={{width:16,height:16,cursor:'pointer'}}/>
                  {sel.refundPaid?'Paid ✓':'Mark Paid'}
                </label>
              )}
            </div>
          </div>
          <SecTitle t="Other"/>
          <DR l="Google Review" v={sel.review==='Yes'?'✅ Received':'⏳ Pending'}/><DR l="Notes" v={sel.notes||'—'}/>
          {sel.inspection&&(<><SecTitle t="Return Inspection"/><div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:10,padding:12}}><div style={{fontSize:13,fontWeight:600,color:'#15803d'}}>✅ By {sel.inspection.confirmedBy} on {sel.inspection.date}</div>{sel.inspection.kmsUsed&&<div style={{fontSize:12,color:C.muted,marginTop:4}}>KMs used: {sel.inspection.kmsUsed?.toLocaleString()} km</div>}{sel.inspection.damage&&<div style={{fontSize:12,color:C.red,marginTop:4}}>Damage: {sel.inspection.damage}</div>}</div></>)}
          <div style={{display:'flex',gap:8,marginTop:20,flexWrap:'wrap'}}>
            <Btn small v="secondary" onClick={()=>setEditing(sel)}>✏️ Edit</Btn>
            {sel.status==='Active'&&<Btn small onClick={()=>setExtending(sel)}>📅 Extend</Btn>}
            {sel.status==='Active'&&<Btn small v="red" onClick={()=>setShortening(sel)}>✂️ Shorten</Btn>}
            {sel.status==='Active'&&!sel.inspection&&<Btn small v="navy" onClick={()=>setInspecting(sel)}>📋 Return Inspection</Btn>}
            {sel.review!=='Yes'&&<a href={`https://wa.me/91${sel.phone||SETTINGS.whatsapp.aayush}?text=Dear ${sel.customer}, Thank you for choosing Sainik Cars! We'd love a Google Review 🙏`} target="_blank" rel="noreferrer" style={{display:'inline-block',padding:'6px 12px',background:'#25d366',color:'#fff',borderRadius:8,textDecoration:'none',fontSize:11,fontWeight:700}}>⭐ Review Reminder</a>}
            <Btn small v="secondary" onClick={()=>copyWA(sel)}>{waCopied?'✅ Copied!':'📋 Copy WA Message'}</Btn>
          </div>
        </Modal>
      )}

      {editing&&<EditBookingModal booking={editing} fleet={fleet} onClose={()=>setEditing(null)} onSave={b=>{updB(b);setEditing(null)}}/>}
      {extending&&<ExtendModal booking={extending} onClose={()=>setExtending(null)} onExtend={b=>{updB(b);setExtending(null)}}/>}
      {shortening&&<ShortenModal booking={shortening} onClose={()=>setShortening(null)} onShorten={b=>{updB(b);setShortening(null)}}/>}
      {inspecting&&<InspectionModal booking={inspecting} onClose={()=>setInspecting(null)} onSave={insp=>updB({...inspecting,inspection:insp,status:'Done'})}/>}

      {adding&&(
        <Modal onClose={()=>{setAdding(false);setForm(defF)}} title="New Booking" maxW={640}>
          <SecTitle t="Customer"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:4}}>
            <Inp label="Customer Name *" value={form.customer||''} onChange={e=>upd('customer',e.target.value)} placeholder="e.g. Col Arun Kumar"/>
            <Inp label="Phone" value={form.phone||''} onChange={e=>upd('phone',e.target.value)} placeholder="10 digit number"/>
            <Inp label="Rank / Designation" value={form.rank||''} onChange={e=>upd('rank',e.target.value)} placeholder="e.g. Colonel"/>
          </div>
          <SecTitle t="Vehicle"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:4}}>
            <Sel label="Select Car *" value={form.car||''} onChange={e=>{
              const car = fleet.find(c=>`${c.brand} ${c.name} ${c.year}`===e.target.value)
              upd('car',e.target.value)
              if(car){ upd('fileNo',car.fileNo); upd('dailyRate',car.dailyRate||0) }
            }}>
              <option value="">Choose from fleet...</option>
              {fleet.map(c=><option key={c.fileNo}>{c.brand} {c.name} {c.year}</option>)}
            </Sel>
            <Inp label="File No" value={form.fileNo||''} onChange={e=>upd('fileNo',e.target.value)} placeholder="Auto-fills on car select"/>
          </div>
          <SecTitle t="Rental Details"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:4}}>
            <Sel label="Rental Type" value={form.type} onChange={e=>upd('type',e.target.value)}>{['Daily','Weekly','Monthly'].map(o=><option key={o}>{o}</option>)}</Sel>
            <Sel label="Travel Type" value={form.travel} onChange={e=>upd('travel',e.target.value)}>{['Instation','Outstation'].map(o=><option key={o}>{o}</option>)}</Sel>
            <Inp label="Days" type="number" value={form.days||''} onChange={e=>upd('days',e.target.value)}/>
          </div>
          <SecTitle t="Schedule"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:12,marginBottom:4}}>
            <Inp label="Start Date" type="date" value={form.start||''} onChange={e=>upd('start',e.target.value)}/>
            <Inp label="Start Time" type="time" value={form.startTime} onChange={e=>upd('startTime',e.target.value)} warn={isOutsideHours(form.startTime)?'Outside 9AM–8PM. Extra charges apply. Please confirm availability on call.':undefined}/>
            <Inp label="End Date" type="date" value={form.end||''} onChange={e=>upd('end',e.target.value)}/>
            <Inp label="End Time" type="time" value={form.endTime} onChange={e=>upd('endTime',e.target.value)} warn={isOutsideHours(form.endTime)?'Outside 9AM–8PM. Extra charges apply. Please confirm availability on call.':undefined}/>
          </div>
          <SecTitle t="Locations"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:4}}>
            <Inp label="Start Location" value={form.startLocation||''} onChange={e=>upd('startLocation',e.target.value)} placeholder="e.g. Airport T3"/>
            <Inp label="End Location" value={form.endLocation||''} onChange={e=>upd('endLocation',e.target.value)} placeholder="e.g. Home, Office"/>
          </div>
          <SecTitle t="Drivers"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:4}}>
            <Sel label="Pickup Driver" value={form.pickupDriver} onChange={e=>upd('pickupDriver',e.target.value)}>{DRIVERS_LIST.map(o=><option key={o}>{o}</option>)}</Sel>
            <Sel label="Return Driver" value={form.returnDriver} onChange={e=>upd('returnDriver',e.target.value)}>{DRIVERS_LIST.map(o=><option key={o}>{o}</option>)}</Sel>
          </div>
          <SecTitle t="Financials"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:12,marginBottom:4}}>
            <Inp label="Revenue ₹" type="number" value={form.revenue||''} onChange={e=>upd('revenue',e.target.value)}/>
            <Inp label="Security ₹" type="number" value={form.security||''} onChange={e=>upd('security',e.target.value)}/>
            <Inp label="Refund ₹" type="number" value={form.refund||''} onChange={e=>upd('refund',e.target.value)}/>
            <Inp label="Odometer Start" type="number" value={form.odometerStart||''} onChange={e=>upd('odometerStart',e.target.value)} placeholder="km"/>
          </div>
          <SecTitle t="Other"/>
          <Sel label="Status" value={form.status} onChange={e=>upd('status',e.target.value)}>{['Active','Upcoming','Done','Cancelled'].map(o=><option key={o}>{o}</option>)}</Sel>
          <div style={{marginTop:12}}><Lbl t="Notes"/><textarea value={form.notes||''} onChange={e=>upd('notes',e.target.value)} placeholder="Any special instructions..." style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,outline:'none',height:60,resize:'vertical',boxSizing:'border-box'}}/></div>
          <SecTitle t="Staff Checklist — Before Handing Over Car"/>
          <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:10,padding:14}}>
            {[{key:'video',label:'✅ Customer informed to make 360° video of car at pickup (KM reading + fuel level)'},{key:'fasttag',label:'✅ Customer briefed — Do NOT recharge FASTag without discussion'},{key:'emergency',label:'✅ Emergency numbers shared: 9891093389 / 9891993389'},{key:'fuekm',label:'✅ Fuel level and KM reading noted by staff before handover'}].map(({key,label})=>(
              <label key={key} style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:10,cursor:'pointer'}}>
                <input type="checkbox" checked={staffChecks[key]} onChange={e=>setStaffChecks(c=>({...c,[key]:e.target.checked}))} style={{width:16,height:16,marginTop:2,cursor:'pointer',flexShrink:0}}/>
                <span style={{fontSize:13,color:'#92400e',lineHeight:1.4}}>{label}</span>
              </label>
            ))}
          </div>
          <Btn onClick={()=>{
            if(!form.customer||!form.car) return alert('Customer name and car are required')
            const id='B'+Date.now()
            const newB={
              id, fileNo:form.fileNo||'', car:form.car||'',
              dailyRate:Number(form.dailyRate||0),
              customer:form.customer||'', phone:form.phone||'',
              rank:form.rank||'', type:form.type||'Daily',
              travel:form.travel||'Instation',
              start:form.start||'', startTime:form.startTime||'09:00',
              end:form.end||'', endTime:form.endTime||'18:00',
              days:Number(form.days||0),
              revenue:Number(form.revenue||0),
              security:Number(form.security||0),
              refund:Number(form.refund||0),
              refundPaid:false,
              status:form.status||'Active',
              startLocation:form.startLocation||'',
              endLocation:form.endLocation||'',
              pickupDriver:form.pickupDriver||'',
              returnDriver:form.returnDriver||'',
              review:'Pending', inspection:null, notes:form.notes||'',
              odometerStart:Number(form.odometerStart||0),
            }
            saveBooking(newB).then(ok => {
              if(ok) {
                setBookings([newB,...bookings])
                setAdding(false); setForm(defF)
              } else {
                alert('Error saving booking. Please try again.')
              }
            })
          }} style={{width:'100%',marginTop:16,padding:'13px',fontSize:14}}>Save Booking</Btn>
        </Modal>
      )}
    </div>
  )
}

// FLEET
function Fleet({fleet,setFleet}) {
  const [sel,setSel] = useState(null)
  const [tab,setTab] = useState('details')
  const [filter,setFilter] = useState('All')
  const [sortBy,setSortBy] = useState('none')
  const [addExp,setAddExp] = useState(false)
  const [addingCar,setAddingCar] = useState(false)
  const [editRates,setEditRates] = useState(false)
  const [rateForm,setRateForm] = useState({})
  const [editingDetails,setEditingDetails] = useState(false)
  const [detailForm,setDetailForm] = useState({})
  const [editingCompliance,setEditingCompliance] = useState(false)
  const [compForm,setCompForm] = useState({})
  const [expF,setExpF] = useState({type:'Maintenance',date:today,amount:'',note:''})
  const [newCarForm,setNewCarForm] = useState({status:'Available',fuel:'Petrol',transmission:'Manual',seats:5,forSale:false,demandTag:'Available Now',featureTags:[],expenses:[],photos:[],kmpl:15})

  const forSaleCount = fleet.filter(c=>c.forSale).length

  const filtered = useMemo(()=>{
    let f = fleet.filter(c=>filter==='All'||c.status===filter||(filter==='For Sale'&&c.forSale))
    if(sortBy==='dailyRate') f=[...f].sort((a,b)=>b.dailyRate-a.dailyRate)
    if(sortBy==='kmpl') f=[...f].sort((a,b)=>b.kmpl-a.kmpl)
    if(sortBy==='seats') f=[...f].sort((a,b)=>b.seats-a.seats)
    return f
  },[fleet,filter,sortBy])

  const totExp = car=>car.expenses.reduce((s,e)=>s+e.amount,0)

  const updateCar = async updated => {
    setFleet(f=>f.map(c=>c.fileNo===updated.fileNo?updated:c))
    setSel(updated)
    await saveFleet(updated)
  }

  const toggleFeatureTag = tag => {
    if(!sel) return
    const tags=sel.featureTags||[]
    const updated=tags.includes(tag)?tags.filter(t=>t!==tag):tags.length<3?[...tags,tag]:tags
    updateCar({...sel,featureTags:updated})
  }

  const MAX_KMPL = 30

  const handlePhotoUpload = async (files) => {
    if(!sel) return
    const uploaded = []
    for(const file of Array.from(files)) {
      const url = await uploadCarPhoto(sel.fileNo, file)
      if(url) uploaded.push(url)
    }
    const updated = {...sel, photos:[...(sel.photos||[]), ...uploaded].slice(0,10)}
    updateCar(updated)
  }

  const handlePhotoDelete = async (url) => {
    await deleteCarPhoto(url)
    const updated = {...sel, photos:(sel.photos||[]).filter(p=>p!==url)}
    updateCar(updated)
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div><div style={{fontSize:22,fontWeight:800,color:C.navy}}>Fleet</div><div style={{fontSize:13,color:C.muted}}>{fleet.length} vehicles</div></div>
        <div style={{display:'flex',gap:8}}>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{padding:'9px 14px',border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,background:'#fff',outline:'none'}}>
            <option value="none">Sort by...</option>
            <option value="dailyRate">Daily Rate</option>
            <option value="kmpl">Mileage (kmpl)</option>
            <option value="seats">Seats</option>
          </select>
          <select value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:'9px 14px',border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,background:'#fff',outline:'none'}}>
            {['All','Available','On Rent','Maintenance','For Sale'].map(o=><option key={o}>{o}</option>)}
          </select>
          <Btn v="secondary" onClick={()=>{/* show for sale modal */setAddingCar('forsale')}}>🏷️ For Sale ({forSaleCount})</Btn>
          <Btn onClick={()=>setAddingCar(true)}>+ Add Car</Btn>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
        {filtered.map(car=>{
          const insC=expColor(car.insuranceExpiry),polC=expColor(car.pollutionExpiry)
          const [dBg,dCol]=(DEMAND_COLORS[car.demandTag])||['#f0f2f5','#5a6478']
          const kmpl=car.kmpl||0
          const kmplPct=Math.min(100,Math.round((kmpl/MAX_KMPL)*100))
          const kmplColor=kmpl>=18?'#16a34a':kmpl>=12?'#f59e0b':C.red
          return (
            <div key={car.fileNo} onClick={()=>{setSel(car);setTab('details');setEditRates(false);setEditingDetails(false);setEditingCompliance(false)}} style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:16,overflow:'hidden',cursor:'pointer',transition:'all 0.2s',display:'flex',flexDirection:'column'}} onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 8px 24px rgba(13,31,60,0.12)';e.currentTarget.style.transform='translateY(-2px)'}} onMouseLeave={e=>{e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='translateY(0)'}}>
              <div style={{height:160,background:`linear-gradient(160deg,${C.navy} 0%,#1e3a5f 100%)`,display:'flex',alignItems:'center',justifyContent:'center',position:'relative',flexShrink:0}}>
                {car.photos&&car.photos[0]?<img src={car.photos[0]} alt={car.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{textAlign:'center'}}><div style={{fontSize:44}}>🚗</div><div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:4}}>No photo</div></div>}
                <div style={{position:'absolute',top:10,right:10}}><SBadge s={car.forSale?'For Sale':car.status}/></div>
                <div style={{position:'absolute',top:10,left:10,fontSize:10,color:C.gold,fontWeight:700,letterSpacing:1.5,background:'rgba(0,0,0,0.4)',padding:'2px 8px',borderRadius:20}}>{car.fileNo}</div>
              </div>
              <div style={{padding:14,flex:1}}>
                <div style={{fontSize:15,fontWeight:800,color:C.navy,marginBottom:2}}>{car.brand} {car.name} {car.year}</div>
                <div style={{fontSize:12,color:C.muted,marginBottom:10}}>{car.color} · {car.fuel} · {car.transmission}</div>
                <div style={{marginBottom:8}}><span style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:dBg,color:dCol,fontWeight:700}}>{DEMAND_ICONS[car.demandTag]||'•'} {car.demandTag}</span></div>
                <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:10}}>{car.featureTags?.map(t=><span key={t} style={{fontSize:10,padding:'2px 8px',background:C.bg,color:C.navy,borderRadius:6,border:`1px solid ${C.border}`,fontWeight:600}}>{t}</span>)}</div>
                <div style={{marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:4}}><span style={{color:C.muted}}>Mileage</span><span style={{fontWeight:700,color:kmplColor}}>{kmpl} kmpl</span></div>
                  <div style={{height:5,background:C.bg,borderRadius:3}}><div style={{height:'100%',width:`${kmplPct}%`,background:kmplColor,borderRadius:3}}/></div>
                </div>
                <div style={{display:'flex',gap:5,marginBottom:12}}>
                  <span style={{fontSize:10,padding:'3px 8px',borderRadius:6,background:insC+'20',color:insC,border:`1px solid ${insC}40`,fontWeight:600}}>Ins {daysUntil(car.insuranceExpiry)}d</span>
                  <span style={{fontSize:10,padding:'3px 8px',borderRadius:6,background:polC+'20',color:polC,border:`1px solid ${polC}40`,fontWeight:600}}>PUC {daysUntil(car.pollutionExpiry)}d</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:5}}>
                  {[['Daily',car.dailyRate],['Weekly',car.weeklyRate],['Monthly',car.monthlyRate]].map(([l,v])=>(
                    <div key={l} style={{textAlign:'center',background:C.bg,borderRadius:8,padding:'7px 4px'}}>
                      <div style={{fontSize:9,color:C.muted,fontWeight:600}}>{l}</div>
                      <div style={{fontSize:12,fontWeight:800,color:C.navy}}>{fmt(v)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* For Sale Modal */}
      {addingCar==='forsale'&&(
        <Modal onClose={()=>setAddingCar(false)} title="Cars for Sale" sub={`${forSaleCount} car${forSaleCount!==1?'s':''} listed`} maxW={580}>
          {forSaleCount===0?<div style={{textAlign:'center',padding:40,color:C.muted}}><div style={{fontSize:40,marginBottom:12}}>🏷️</div><div style={{fontSize:15,fontWeight:600}}>No cars marked for sale</div><div style={{fontSize:13,marginTop:6}}>Go to a car's Details tab and mark "For Sale"</div></div>:(
            <>
              {fleet.filter(c=>c.forSale).map(c=>(
                <div key={c.fileNo} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 0',borderBottom:`1px solid ${C.bg}`}}>
                  <div><div style={{fontSize:14,fontWeight:700,color:C.navy}}>{c.brand} {c.name} {c.year}</div><div style={{fontSize:12,color:C.muted}}>{c.color} · {c.fuel} · {(c.odometerReading||0).toLocaleString()} km · {c.kmpl||0} kmpl</div></div>
                  <div style={{fontSize:16,fontWeight:900,color:C.saffron}}>{fmt(c.askingPrice)}</div>
                </div>
              ))}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:20}}>
                <button onClick={()=>{
                  const msg=`🚗 *SAINIK CARS — PRE-OWNED CARS FOR SALE*\n━━━━━━━━━━━━━━━━━━━━\n${fleet.filter(c=>c.forSale).map((c,i)=>`\n*${i+1}. ${c.brand} ${c.name} ${c.year}*\n💰 Asking Price: ${fmt(c.askingPrice)}\n🎨 Color: ${c.color} | ⛽ ${c.fuel} | ⚙️ ${c.transmission}\n🛣️ Odometer: ${(c.odometerReading||0).toLocaleString()} km | 📊 ${c.kmpl||0} kmpl\n${c.whyBuy||c.bestPoints||''}`).join('\n━━━━━━━━━━━━━━━━━━━━')}\n━━━━━━━━━━━━━━━━━━━━\n📞 Aayush: 9891993389 | Father: 9891093389\n_Sainik Cars — Serving those who serve the nation_ 🇮🇳`
                  navigator.clipboard.writeText(msg)
                  alert('WhatsApp message copied!')
                }} style={{padding:'14px',background:'#25d366',color:'#fff',border:'none',borderRadius:10,cursor:'pointer',fontWeight:700,fontSize:14}}>📱 Copy WhatsApp Message</button>
                <button onClick={()=>{
                  const w=window.open('','_blank')
                  w.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Sainik Cars — Pre-Owned Cars for Sale</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background:#fff; color:#1a1a2e; }

  /* COVER PAGE */
  .cover { 
    width:100%; height:100vh; 
    background:linear-gradient(135deg,#0d1f3c 0%,#1a3a6b 60%,#0d1f3c 100%);
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    page-break-after:always;
  }
  .cover-logo { font-size:80px; margin-bottom:20px; }
  .cover-title { font-size:52px; font-weight:900; color:#fff; letter-spacing:3px; margin-bottom:10px; }
  .cover-sub { font-size:20px; color:#c9a84c; letter-spacing:2px; margin-bottom:40px; }
  .cover-line { width:80px; height:3px; background:#f47920; margin:0 auto 40px; }
  .cover-tagline { font-size:16px; color:rgba(255,255,255,0.6); font-style:italic; margin-bottom:60px; }
  .cover-badge { 
    background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2);
    border-radius:50px; padding:12px 32px; font-size:14px; color:rgba(255,255,255,0.7);
  }
  .cover-date { margin-top:20px; font-size:13px; color:rgba(255,255,255,0.4); }

  /* CAR PAGE */
  .car-page { page-break-before:always; padding:0; }
  
  /* Hero Photo */
  .hero { width:100%; height:320px; position:relative; overflow:hidden; background:#0d1f3c; }
  .hero img { width:100%; height:100%; object-fit:cover; }
  .hero-overlay { 
    position:absolute; bottom:0; left:0; right:0;
    background:linear-gradient(transparent,rgba(13,31,60,0.95));
    padding:30px 40px 24px;
  }
  .hero-badge { 
    display:inline-block; background:#f47920; color:#fff; 
    font-size:11px; font-weight:800; padding:4px 14px; border-radius:20px;
    letter-spacing:2px; text-transform:uppercase; margin-bottom:10px;
  }
  .hero-name { font-size:32px; font-weight:900; color:#fff; margin-bottom:6px; }
  .hero-price { font-size:40px; font-weight:900; color:#c9a84c; }

  /* Specs Strip */
  .specs-strip { 
    display:grid; grid-template-columns:repeat(6,1fr);
    background:#0d1f3c; padding:0;
  }
  .spec-item { 
    padding:16px 12px; text-align:center; 
    border-right:1px solid rgba(255,255,255,0.1);
  }
  .spec-icon { font-size:18px; margin-bottom:4px; }
  .spec-label { font-size:9px; color:rgba(255,255,255,0.5); text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; }
  .spec-val { font-size:13px; font-weight:800; color:#fff; }

  /* Body */
  .car-body { padding:32px 40px; }
  
  /* Why Buy */
  .why-section { margin-bottom:28px; }
  .section-title { 
    font-size:11px; font-weight:800; color:#f47920; 
    text-transform:uppercase; letter-spacing:2px; 
    margin-bottom:12px; padding-bottom:8px;
    border-bottom:2px solid #f47920;
    display:inline-block;
  }
  .why-text { font-size:14px; color:#4a5568; line-height:1.8; }

  /* Photo Grid */
  .photo-section { margin-top:24px; }
  .photo-grid { 
    display:grid; 
    grid-template-columns:repeat(3,1fr); 
    gap:10px; 
    margin-top:12px;
  }
  .photo-grid img { 
    width:100%; height:160px; object-fit:cover; 
    border-radius:10px; border:2px solid #e4e8f0;
  }
  .photo-grid img:first-child {
    grid-column: span 3;
    height:240px;
  }

  /* Verified Badge */
  .verified { 
    display:inline-flex; align-items:center; gap:8px;
    background:#e6f9f0; border:1px solid #86efac;
    border-radius:20px; padding:6px 16px;
    font-size:12px; font-weight:700; color:#15803d;
    margin-bottom:20px;
  }

  /* Footer */
  .page-footer {
    background:#0d1f3c; padding:20px 40px;
    display:flex; justify-content:space-between; align-items:center;
    margin-top:32px;
  }
  .footer-brand { font-size:14px; font-weight:800; color:#fff; }
  .footer-contact { font-size:14px; color:#c9a84c; font-weight:700; }
  .footer-tag { font-size:11px; color:rgba(255,255,255,0.4); font-style:italic; }

  /* Final Footer */
  .final-footer {
    page-break-before:always;
    background:linear-gradient(135deg,#0d1f3c,#1a3a6b);
    min-height:100vh; display:flex; flex-direction:column;
    align-items:center; justify-content:center; text-align:center;
    padding:60px;
  }

  @media print { 
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .cover { height:100vh; }
  }
</style>
</head>
<body>

  <!-- COVER PAGE -->
  <div class="cover">
    <div class="cover-logo">🚗</div>
    <div class="cover-title">SAINIK CARS</div>
    <div class="cover-sub">EST. 2004 · DELHI NCR</div>
    <div class="cover-line"></div>
    <div class="cover-tagline">"Serving those who serve the nation"</div>
    <div class="cover-badge">Pre-Owned Cars for Sale · ${new Date().toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</div>
    <div class="cover-date">📞 9891993389 · 9891093389</div>
  </div>

  <!-- CAR PAGES -->
  ${fleet.filter(c=>c.forSale||c.demandTag==='For Sale').map((c,idx) => `
  <div class="car-page">
    
    <!-- Hero Photo -->
    <div class="hero">
      ${c.photos&&c.photos[0] 
        ? `<img src="${c.photos[0]}" alt="${c.name}"/>`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:80px">🚗</div>`
      }
      <div class="hero-overlay">
        <div class="hero-badge">✦ For Sale</div>
        <div class="hero-name">${c.brand} ${c.name} ${c.year}</div>
        <div class="hero-price">${fmt(c.askingPrice)}</div>
      </div>
    </div>

    <!-- Specs Strip -->
    <div class="specs-strip">
      <div class="spec-item"><div class="spec-icon">🎨</div><div class="spec-label">Color</div><div class="spec-val">${c.color||'—'}</div></div>
      <div class="spec-item"><div class="spec-icon">⛽</div><div class="spec-label">Fuel</div><div class="spec-val">${c.fuel||'—'}</div></div>
      <div class="spec-item"><div class="spec-icon">⚙️</div><div class="spec-label">Transmission</div><div class="spec-val">${c.transmission||'—'}</div></div>
      <div class="spec-item"><div class="spec-icon">🛣️</div><div class="spec-label">Odometer</div><div class="spec-val">${(c.odometerReading||0).toLocaleString()} km</div></div>
      <div class="spec-item"><div class="spec-icon">📊</div><div class="spec-label">Mileage</div><div class="spec-val">${c.kmpl||0} kmpl</div></div>
      <div class="spec-item"><div class="spec-icon">👥</div><div class="spec-label">Seats</div><div class="spec-val">${c.seats||5}</div></div>
    </div>

    <!-- Body -->
    <div class="car-body">
      <div class="verified">✅ Personally Verified by Sainik Cars</div>
      
      ${c.whyBuy ? `
      <div class="why-section">
        <div class="section-title">Why Buy This Car</div>
        <div class="why-text">${c.whyBuy}</div>
      </div>` : ''}

      ${c.bestPoints ? `
      <div class="why-section">
        <div class="section-title">Key Highlights</div>
        <div class="why-text">${c.bestPoints}</div>
      </div>` : ''}

      <!-- All Photos -->
      ${c.photos&&c.photos.length>0 ? `
      <div class="photo-section">
        <div class="section-title">Photo Gallery (${c.photos.length} Photos)</div>
        <div class="photo-grid">
          ${c.photos.map((p,i) => `<img src="${p}" alt="Photo ${i+1}"/>`).join('')}
        </div>
      </div>` : ''}
    </div>

    <!-- Page Footer -->
    <div class="page-footer">
      <div>
        <div class="footer-brand">🚗 SAINIK CARS</div>
        <div class="footer-tag">Serving those who serve the nation</div>
      </div>
      <div class="footer-contact">📞 9891993389 · 9891093389</div>
    </div>

  </div>
  `).join('')}

  <!-- FINAL CONTACT PAGE -->
  <div class="final-footer">
    <div style="font-size:60px;margin-bottom:24px">🚗</div>
    <div style="font-size:40px;font-weight:900;color:#fff;margin-bottom:8px">SAINIK CARS</div>
    <div style="font-size:16px;color:#c9a84c;margin-bottom:40px;letter-spacing:2px">EST. 2004 · DELHI NCR</div>
    <div style="width:60px;height:3px;background:#f47920;margin:0 auto 40px;"></div>
    <div style="font-size:22px;color:#fff;font-weight:700;margin-bottom:24px">Interested? Get in Touch</div>
    <div style="font-size:32px;color:#f47920;font-weight:900;margin-bottom:12px">📞 9891993389</div>
    <div style="font-size:24px;color:#c9a84c;font-weight:700;margin-bottom:40px">9891093389</div>
    <div style="font-size:14px;color:rgba(255,255,255,0.5);font-style:italic">"Serving those who serve the nation" 🇮🇳</div>
    <div style="margin-top:40px;font-size:12px;color:rgba(255,255,255,0.3)">All cars personally maintained & verified by Sainik Cars · Prices negotiable · Inspection welcome</div>
  </div>

</body>
</html>`)
                  w.document.close(); w.print()
                }} style={{padding:'14px',background:C.navy,color:'#fff',border:'none',borderRadius:10,cursor:'pointer',fontWeight:700,fontSize:14}}>🖨️ Print / Save PDF</button>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Add Car Modal */}
      {addingCar===true&&(
        <Modal onClose={()=>setAddingCar(false)} title="Add New Car" maxW={640}>
          <SecTitle t="Identity"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:4}}>
            <Inp label="File No *" value={newCarForm.fileNo||''} onChange={e=>setNewCarForm(f=>({...f,fileNo:e.target.value}))} placeholder="e.g. SHB051"/>
            <Inp label="Registration No *" value={newCarForm.regNo||''} onChange={e=>setNewCarForm(f=>({...f,regNo:e.target.value}))} placeholder="e.g. DL3CAF1234"/>
            <Inp label="Brand *" value={newCarForm.brand||''} onChange={e=>setNewCarForm(f=>({...f,brand:e.target.value}))} placeholder="e.g. Hyundai"/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:4}}>
            <Inp label="Model Name *" value={newCarForm.name||''} onChange={e=>setNewCarForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Creta"/>
            <Inp label="Year" type="number" value={newCarForm.year||''} onChange={e=>setNewCarForm(f=>({...f,year:Number(e.target.value)}))}/>
            <Inp label="Color" value={newCarForm.color||''} onChange={e=>setNewCarForm(f=>({...f,color:e.target.value}))} placeholder="e.g. White"/>
          </div>
          <SecTitle t="Specs"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:12,marginBottom:4}}>
            <Sel label="Fuel" value={newCarForm.fuel} onChange={e=>setNewCarForm(f=>({...f,fuel:e.target.value}))}>{['Petrol','Diesel','CNG','Electric'].map(o=><option key={o}>{o}</option>)}</Sel>
            <Sel label="Transmission" value={newCarForm.transmission} onChange={e=>setNewCarForm(f=>({...f,transmission:e.target.value}))}>{['Manual','Automatic','AMT'].map(o=><option key={o}>{o}</option>)}</Sel>
            <Inp label="Seats" type="number" value={newCarForm.seats} onChange={e=>setNewCarForm(f=>({...f,seats:Number(e.target.value)}))}/>
            <Inp label="Mileage (kmpl)" type="number" value={newCarForm.kmpl||''} onChange={e=>setNewCarForm(f=>({...f,kmpl:Number(e.target.value)}))} placeholder="e.g. 15"/>
          </div>
          <Inp label="Odometer Reading (km)" type="number" value={newCarForm.odometerReading||''} onChange={e=>setNewCarForm(f=>({...f,odometerReading:Number(e.target.value)}))} placeholder="Current km reading" style={{marginBottom:4}}/>
          <SecTitle t="Compliance"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:4}}>
            <Inp label="Insurance Expiry" type="date" value={newCarForm.insuranceExpiry||''} onChange={e=>setNewCarForm(f=>({...f,insuranceExpiry:e.target.value}))}/>
            <Inp label="PUC Expiry" type="date" value={newCarForm.pollutionExpiry||''} onChange={e=>setNewCarForm(f=>({...f,pollutionExpiry:e.target.value}))}/>
            <Inp label="Fitness Expiry" type="date" value={newCarForm.fitnessExpiry||''} onChange={e=>setNewCarForm(f=>({...f,fitnessExpiry:e.target.value}))}/>
          </div>
          <SecTitle t="Rates"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:4}}>
            <Inp label="Daily Rate ₹" type="number" value={newCarForm.dailyRate||''} onChange={e=>setNewCarForm(f=>({...f,dailyRate:Number(e.target.value)}))}/>
            <Inp label="Weekly Rate ₹" type="number" value={newCarForm.weeklyRate||''} onChange={e=>setNewCarForm(f=>({...f,weeklyRate:Number(e.target.value)}))}/>
            <Inp label="Monthly Rate ₹" type="number" value={newCarForm.monthlyRate||''} onChange={e=>setNewCarForm(f=>({...f,monthlyRate:Number(e.target.value)}))}/>
          </div>
          <Btn onClick={async()=>{
            if(!newCarForm.fileNo||!newCarForm.brand||!newCarForm.name) return alert('File No, Brand and Model required')
            const car={...newCarForm,bestPoints:'',whyRent:'',whyBuy:'',lastServiceDate:'',lastServiceKm:0,lastBatteryChange:'',lastTyreChange:'',purchasePrice:0,purchaseDate:'',purchaseSource:'',askingPrice:0,forSale:false}
            setFleet(f=>[...f,car])
            await saveFleet(car)
            setAddingCar(false)
            setNewCarForm({status:'Available',fuel:'Petrol',transmission:'Manual',seats:5,forSale:false,demandTag:'Available Now',featureTags:[],expenses:[],photos:[],kmpl:15})
          }} style={{width:'100%',marginTop:16,padding:'13px',fontSize:14}}>Add Car to Fleet</Btn>
        </Modal>
      )}

      {/* Car Detail Modal */}
      {sel&&(
        <Modal onClose={()=>setSel(null)} title={`${sel.brand} ${sel.name} ${sel.year}`} sub={`${sel.fileNo} · ${sel.regNo}`} maxW={660} noPad>
          <div style={{display:'flex',padding:'0 24px',borderBottom:`1px solid ${C.border}`,background:'#fafbfd',overflowX:'auto'}}>
            {['details','compliance','financials','marketing'].map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{padding:'12px 16px',border:'none',background:'none',cursor:'pointer',fontSize:13,fontWeight:tab===t?700:400,color:tab===t?C.saffron:C.muted,borderBottom:tab===t?`2px solid ${C.saffron}`:'2px solid transparent',textTransform:'capitalize',whiteSpace:'nowrap'}}>{t}</button>
            ))}
          </div>
          <div style={{padding:'20px 24px'}}>
            {tab==='details'&&(
              <>
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.navy,marginBottom:8}}>📷 Photos ({(sel.photos||[]).length}/10)</div>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    {(sel.photos||[]).map((p,i)=>(
                      <div key={i} style={{position:'relative'}}>
                        <img src={p} alt="" style={{height:80,width:110,objectFit:'cover',borderRadius:8}}/>
                        <button onClick={()=>handlePhotoDelete(p)} style={{position:'absolute',top:4,right:4,background:'rgba(220,38,38,0.9)',border:'none',borderRadius:'50%',width:20,height:20,color:'#fff',cursor:'pointer',fontSize:10,fontWeight:700}}>✕</button>
                      </div>
                    ))}
                    {(sel.photos||[]).length<10&&(
                      <label style={{height:80,width:110,background:C.bg,border:`2px dashed ${C.border}`,borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                        <div style={{fontSize:20}}>📷</div>
                        <div style={{fontSize:10,color:C.muted,marginTop:4}}>Add Photo</div>
                        <input type="file" accept="image/*" multiple onChange={e=>handlePhotoUpload(e.target.files)} style={{display:'none'}}/>
                      </label>
                    )}
                  </div>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.navy}}>Car Details</div>
                  {!editingDetails
                    ?<Btn small v="secondary" onClick={()=>{setDetailForm({...sel});setEditingDetails(true)}}>✏️ Edit All</Btn>
                    :<div style={{display:'flex',gap:8}}><Btn small v="green" onClick={()=>{updateCar({...sel,...detailForm});setEditingDetails(false)}}>Save</Btn><Btn small v="secondary" onClick={()=>setEditingDetails(false)}>Cancel</Btn></div>
                  }
                </div>
                {editingDetails?(
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                    <Inp label="Brand" value={detailForm.brand||''} onChange={e=>setDetailForm(f=>({...f,brand:e.target.value}))}/>
                    <Inp label="Model Name" value={detailForm.name||''} onChange={e=>setDetailForm(f=>({...f,name:e.target.value}))}/>
                    <Inp label="Year" type="number" value={detailForm.year||''} onChange={e=>setDetailForm(f=>({...f,year:Number(e.target.value)}))}/>
                    <Inp label="Color" value={detailForm.color||''} onChange={e=>setDetailForm(f=>({...f,color:e.target.value}))}/>
                    <Sel label="Fuel" value={detailForm.fuel||'Petrol'} onChange={e=>setDetailForm(f=>({...f,fuel:e.target.value}))}>{['Petrol','Diesel','CNG','Electric'].map(o=><option key={o}>{o}</option>)}</Sel>
                    <Sel label="Transmission" value={detailForm.transmission||'Manual'} onChange={e=>setDetailForm(f=>({...f,transmission:e.target.value}))}>{['Manual','Automatic','AMT'].map(o=><option key={o}>{o}</option>)}</Sel>
                    <Inp label="Seats" type="number" value={detailForm.seats||''} onChange={e=>setDetailForm(f=>({...f,seats:Number(e.target.value)}))}/>
                    <Inp label="Mileage (kmpl)" type="number" value={detailForm.kmpl||''} onChange={e=>setDetailForm(f=>({...f,kmpl:Number(e.target.value)}))}/>
                    <Inp label="Odometer Reading (km)" type="number" value={detailForm.odometerReading||''} onChange={e=>setDetailForm(f=>({...f,odometerReading:Number(e.target.value)}))}/>
                    <Sel label="Status" value={detailForm.status||'Available'} onChange={e=>setDetailForm(f=>({...f,status:e.target.value}))}>{['Available','On Rent','Maintenance','For Sale'].map(o=><option key={o}>{o}</option>)}</Sel>
                    <Inp label="Purchase Price ₹" type="number" value={detailForm.purchasePrice||''} onChange={e=>setDetailForm(f=>({...f,purchasePrice:Number(e.target.value)}))}/>
                    <Inp label="Purchase Date" type="date" value={detailForm.purchaseDate||''} onChange={e=>setDetailForm(f=>({...f,purchaseDate:e.target.value}))}/>
                    <Inp label="Purchased From" value={detailForm.purchaseSource||''} onChange={e=>setDetailForm(f=>({...f,purchaseSource:e.target.value}))}/>
                    <Inp label="Registration No" value={detailForm.regNo||''} onChange={e=>setDetailForm(f=>({...f,regNo:e.target.value}))}/>
                    <div style={{display:'flex',alignItems:'center',gap:8,padding:'9px 0'}}>
                      <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13}}>
                        <input type="checkbox" checked={!!detailForm.forSale} onChange={e=>setDetailForm(f=>({...f,forSale:e.target.checked}))} style={{width:16,height:16}}/> For Sale
                      </label>
                    </div>
                    {detailForm.forSale&&<Inp label="Asking Price ₹" type="number" value={detailForm.askingPrice||''} onChange={e=>setDetailForm(f=>({...f,askingPrice:Number(e.target.value)}))}/>}
                  </div>
                ):(
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                    {[['File No',sel.fileNo],['Registration',sel.regNo],['Brand',sel.brand],['Model',sel.name],['Year',sel.year],['Color',sel.color],['Fuel',sel.fuel],['Transmission',sel.transmission],['Seats',sel.seats],['Mileage',`${sel.kmpl||0} kmpl`],['Odometer',`${(sel.odometerReading||0).toLocaleString()} km`],['Status',sel.status],['Purchase Price',fmt(sel.purchasePrice)],['Purchase Date',sel.purchaseDate||'—'],['Purchased From',sel.purchaseSource||'—'],['For Sale',sel.forSale?`Yes — ${fmt(sel.askingPrice)}`:'No']].map(([l,v])=>(
                      <div key={l} style={{padding:12,background:C.bg,borderRadius:8}}><div style={{fontSize:11,color:C.muted,marginBottom:3}}>{l}</div><div style={{fontSize:13,fontWeight:600,color:C.navy}}>{v}</div></div>
                    ))}
                  </div>
                )}
              </>
            )}
            {tab==='compliance'&&(
              <>
                <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
                  {[['🛡️ Insurance',sel.insuranceExpiry],['💨 PUC',sel.pollutionExpiry],['✅ Fitness',sel.fitnessExpiry]].map(([l,d])=>{
                    const c=expColor(d),days=daysUntil(d)
                    return <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:14,background:c+'10',border:`1px solid ${c}30`,borderRadius:10}}>
                      <div><div style={{fontSize:13,fontWeight:700,color:C.navy}}>{l}</div><div style={{fontSize:12,color:C.muted,marginTop:2}}>Expires: {d}</div></div>
                      <div style={{textAlign:'right'}}><div style={{fontSize:20,fontWeight:900,color:c}}>{Math.abs(days)}d</div><div style={{fontSize:11,color:c,fontWeight:600}}>{days<0?'EXPIRED':'remaining'}</div></div>
                    </div>
                  })}
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:1}}>Compliance Dates & Service History</div>
                  {!editingCompliance
                    ?<Btn small v="secondary" onClick={()=>{setCompForm({insuranceExpiry:sel.insuranceExpiry||'',pollutionExpiry:sel.pollutionExpiry||'',fitnessExpiry:sel.fitnessExpiry||'',lastServiceDate:sel.lastServiceDate||'',lastServiceKm:sel.lastServiceKm||'',lastBatteryChange:sel.lastBatteryChange||'',lastTyreChange:sel.lastTyreChange||''});setEditingCompliance(true)}}>✏️ Edit</Btn>
                    :<div style={{display:'flex',gap:8}}><Btn small v="green" onClick={()=>{updateCar({...sel,...compForm,lastServiceKm:Number(compForm.lastServiceKm||0)});setEditingCompliance(false)}}>Save</Btn><Btn small v="secondary" onClick={()=>setEditingCompliance(false)}>Cancel</Btn></div>
                  }
                </div>
                {editingCompliance?(
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    <Inp label="Insurance Expiry" type="date" value={compForm.insuranceExpiry} onChange={e=>setCompForm(f=>({...f,insuranceExpiry:e.target.value}))}/>
                    <Inp label="PUC Expiry" type="date" value={compForm.pollutionExpiry} onChange={e=>setCompForm(f=>({...f,pollutionExpiry:e.target.value}))}/>
                    <Inp label="Fitness Expiry" type="date" value={compForm.fitnessExpiry} onChange={e=>setCompForm(f=>({...f,fitnessExpiry:e.target.value}))}/>
                    <Inp label="Last Service Date" type="date" value={compForm.lastServiceDate} onChange={e=>setCompForm(f=>({...f,lastServiceDate:e.target.value}))}/>
                    <Inp label="Last Service KM" type="number" value={compForm.lastServiceKm} onChange={e=>setCompForm(f=>({...f,lastServiceKm:e.target.value}))} placeholder="e.g. 85000"/>
                    <Inp label="Last Battery Change" type="date" value={compForm.lastBatteryChange} onChange={e=>setCompForm(f=>({...f,lastBatteryChange:e.target.value}))}/>
                    <Inp label="Last Tyre Change" type="date" value={compForm.lastTyreChange} onChange={e=>setCompForm(f=>({...f,lastTyreChange:e.target.value}))}/>
                  </div>
                ):(
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    {[['Last Service Date',sel.lastServiceDate||'—'],['Last Service KM',sel.lastServiceKm?`${Number(sel.lastServiceKm).toLocaleString()} km`:'—'],['Last Battery Change',sel.lastBatteryChange||'—'],['Last Tyre Change',sel.lastTyreChange||'—']].map(([l,v])=>(
                      <div key={l} style={{padding:12,background:C.bg,borderRadius:8}}><div style={{fontSize:11,color:C.muted,marginBottom:3}}>{l}</div><div style={{fontSize:13,fontWeight:600,color:C.navy}}>{v}</div></div>
                    ))}
                  </div>
                )}
              </>
            )}
            {tab==='financials'&&(
              <>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:20}}>
                  {[['Purchase Price',fmt(sel.purchasePrice),C.navy],['Total Expenses',fmt(totExp(sel)),C.red],['Total Cost',fmt((sel.purchasePrice||0)+totExp(sel)),C.purple]].map(([l,v,c])=>(
                    <div key={l} style={{padding:14,background:C.bg,borderRadius:10,textAlign:'center'}}><div style={{fontSize:11,color:C.muted,marginBottom:4}}>{l}</div><div style={{fontSize:18,fontWeight:900,color:c}}>{v}</div></div>
                  ))}
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.navy}}>Rental Rates</div>
                  {!editRates?<Btn small v="secondary" onClick={()=>{setRateForm({dailyRate:sel.dailyRate,weeklyRate:sel.weeklyRate,monthlyRate:sel.monthlyRate});setEditRates(true)}}>✏️ Edit</Btn>:<div style={{display:'flex',gap:8}}><Btn small v="green" onClick={()=>{updateCar({...sel,...rateForm});setEditRates(false)}}>Save</Btn><Btn small v="secondary" onClick={()=>setEditRates(false)}>Cancel</Btn></div>}
                </div>
                {editRates?(
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
                    {[['Daily Rate','dailyRate'],['Weekly Rate','weeklyRate'],['Monthly Rate','monthlyRate']].map(([l,k])=>(
                      <div key={k}><Lbl t={l}/><input type="number" value={rateForm[k]||''} onChange={e=>setRateForm(f=>({...f,[k]:Number(e.target.value)}))} style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.saffron}`,borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box'}}/></div>
                    ))}
                  </div>
                ):(
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
                    {[['Daily',sel.dailyRate],['Weekly',sel.weeklyRate],['Monthly',sel.monthlyRate]].map(([l,v])=>(
                      <div key={l} style={{padding:14,background:C.bg,borderRadius:10,textAlign:'center'}}><div style={{fontSize:11,color:C.muted,marginBottom:4}}>{l}</div><div style={{fontSize:20,fontWeight:900,color:C.navy}}>{fmt(v)}</div></div>
                    ))}
                  </div>
                )}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.navy}}>Expense Log</div>
                  <Btn small onClick={()=>setAddExp(true)}>+ Add</Btn>
                </div>
                {sel.expenses.length===0&&<div style={{color:C.muted,fontSize:13,textAlign:'center',padding:12}}>No expenses recorded yet</div>}
                {sel.expenses.map((e,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:`1px solid ${C.bg}`}}><div><div style={{fontSize:13,fontWeight:600}}>{e.type}</div><div style={{fontSize:11,color:C.muted}}>{e.date} · {e.note}</div></div><div style={{fontSize:14,fontWeight:800,color:C.red}}>{fmt(e.amount)}</div></div>)}
                {addExp&&(
                  <div style={{background:C.bg,borderRadius:10,padding:14,marginTop:12,border:`1px solid ${C.border}`}}>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                      <Sel label="Type" value={expF.type} onChange={e=>setExpF(f=>({...f,type:e.target.value}))}>{['Maintenance','Insurance','PUC','Fuel','Cleaning','Repair','Battery','Tyres','Other'].map(o=><option key={o}>{o}</option>)}</Sel>
                      <Inp label="Date" type="date" value={expF.date} onChange={e=>setExpF(f=>({...f,date:e.target.value}))}/>
                      <Inp label="Amount ₹" type="number" value={expF.amount} onChange={e=>setExpF(f=>({...f,amount:e.target.value}))}/>
                      <Inp label="Note" value={expF.note} onChange={e=>setExpF(f=>({...f,note:e.target.value}))} placeholder="Details..."/>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <Btn small onClick={()=>{ if(!expF.amount) return alert('Enter amount'); const u={...sel,expenses:[...sel.expenses,{...expF,amount:Number(expF.amount)}]}; updateCar(u); setAddExp(false); setExpF({type:'Maintenance',date:today,amount:'',note:''}) }}>Save</Btn>
                      <Btn small v="secondary" onClick={()=>setAddExp(false)}>Cancel</Btn>
                    </div>
                  </div>
                )}
              </>
            )}
            {tab==='marketing'&&(
              <div style={{display:'flex',flexDirection:'column',gap:16}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:C.navy,marginBottom:8}}>🏷️ Demand Tag — click to change</div>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    {DEMAND_TAGS.map(tag=>{
                      const [dBg,dCol]=DEMAND_COLORS[tag]||['#f0f2f5','#5a6478']
                      return <span key={tag} onClick={()=>updateCar({...sel,demandTag:tag})} style={{padding:'7px 14px',borderRadius:20,fontSize:12,fontWeight:700,cursor:'pointer',background:sel.demandTag===tag?C.navy:dBg,color:sel.demandTag===tag?'#fff':dCol,border:`2px solid ${sel.demandTag===tag?C.navy:'transparent'}`}}>{DEMAND_ICONS[tag]} {tag}</span>
                    })}
                  </div>
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:C.navy,marginBottom:4}}>⚡ Feature Tags — select up to 3</div>
                  <div style={{fontSize:11,color:C.muted,marginBottom:8}}>Selected: {sel.featureTags?.length||0}/3</div>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    {FEATURE_OPTIONS.map(t=>{
                      const selected=sel.featureTags?.includes(t)
                      return <span key={t} onClick={()=>toggleFeatureTag(t)} style={{padding:'6px 12px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',background:selected?C.saffron:C.bg,color:selected?'#fff':C.muted,border:`1px solid ${selected?C.saffron:C.border}`}}>{selected?'✓ ':''}{t}</span>
                    })}
                  </div>
                </div>
                {[['✨ Best Points','bestPoints'],['🚗 Why Rent This Car','whyRent'],['🏷️ Why Buy This Car','whyBuy']].map(([l,k])=>(
                  <div key={k}>
                    <div style={{fontSize:12,fontWeight:700,color:C.navy,marginBottom:6}}>{l}</div>
                    <textarea value={sel[k]||''} onChange={e=>updateCar({...sel,[k]:e.target.value})} style={{width:'100%',padding:'10px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,outline:'none',height:80,resize:'vertical',boxSizing:'border-box',lineHeight:1.6}} placeholder="Click to edit..."/>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

// DRIVERS
function Drivers({drivers,setDrivers,bookings}) {
  const [period,setPeriod] = useState('month')
  const [addingDriver,setAddingDriver] = useState(false)
  const [editingDriver,setEditingDriver] = useState(null)
  const [driverForm,setDriverForm] = useState({name:'',phone:'',hindi:true,active:true})
  const weekAgo = new Date(new Date()-7*86400000).toISOString().split('T')[0]
  const monthAgo = new Date(new Date()-30*86400000).toISOString().split('T')[0]

  const getCount = (name,field) => bookings.filter(b=>{
    const inP=period==='week'?b.start>=weekAgo:period==='month'?b.start>=monthAgo:true
    return b[field]===name&&inP
  }).length

  const saveDriver = async d => {
    await supabase.from('drivers').upsert(d)
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div><div style={{fontSize:22,fontWeight:800,color:C.navy}}>Drivers</div><div style={{fontSize:13,color:C.muted}}>{drivers.length} drivers</div></div>
        <div style={{display:'flex',gap:8}}>
          {[['week','This Week'],['month','This Month'],['all','All Time']].map(([v,l])=>(
            <button key={v} onClick={()=>setPeriod(v)} style={{padding:'7px 14px',border:`1px solid ${period===v?C.navy:C.border}`,background:period===v?C.navy:'#fff',color:period===v?'#fff':C.muted,borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:700}}>{l}</button>
          ))}
          <Btn small onClick={()=>{setDriverForm({name:'',phone:'',hindi:true,active:true});setAddingDriver(true)}}>+ Add Driver</Btn>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
        {drivers.map(d=>{
          const pickups=getCount(d.name,'pickupDriver')
          const returns=getCount(d.name,'returnDriver')
          const active=bookings.filter(b=>(b.pickupDriver===d.name||b.returnDriver===d.name)&&b.status==='Active')
          return (
            <Card key={d.id}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
                <div style={{width:52,height:52,background:d.active?C.navy:'#8892a4',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>👤</div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <SBadge s={d.active?'Active':'Done'}/>
                  <button onClick={()=>{setDriverForm({...d});setEditingDriver(d)}} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,padding:'4px 8px',cursor:'pointer',fontSize:11,color:C.muted}}>✏️</button>
                </div>
              </div>
              <div style={{fontSize:20,fontWeight:800,color:C.navy}}>{d.name}</div>
              <div style={{display:'flex',gap:8,marginTop:6,marginBottom:12,alignItems:'center',flexWrap:'wrap'}}>
                <a href={`tel:${d.phone}`} style={{fontSize:13,color:'#1a56db',fontWeight:700,textDecoration:'none'}}>📞 {d.phone}</a>
                {d.hindi&&<span style={{fontSize:11,padding:'2px 10px',background:'#e8f0fe',color:'#1a56db',borderRadius:10,fontWeight:600}}>Hindi</span>}
              </div>
              <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                <div style={{background:C.bg,borderRadius:8,padding:'10px',textAlign:'center'}}><div style={{fontSize:11,color:C.muted}}>Pickups</div><div style={{fontSize:26,fontWeight:900,color:C.saffron}}>{pickups}</div></div>
                <div style={{background:'#e6f9f0',borderRadius:8,padding:'10px',textAlign:'center'}}><div style={{fontSize:11,color:C.muted}}>Returns</div><div style={{fontSize:26,fontWeight:900,color:'#0a7a45'}}>{returns}</div></div>
              </div>
              {active.length>0&&(
                <div style={{background:'#f0fdf4',borderRadius:10,padding:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#15803d',marginBottom:8}}>ACTIVE NOW</div>
                  {active.map(b=>(
                    <div key={b.id} style={{marginBottom:8,paddingBottom:8,borderBottom:'1px solid #dcfce7'}}>
                      <div style={{fontSize:12,color:'#15803d',fontWeight:600}}>🚗 {b.car}</div>
                      <div style={{fontSize:11,color:'#15803d'}}>{b.customer}</div>
                      <div style={{fontSize:11,color:'#15803d'}}>{fmtDate(b.end)} · {b.endTime} · {b.endLocation||'—'}</div>
                      {b.phone&&<a href={`tel:${b.phone}`} style={{fontSize:11,color:'#1a56db',textDecoration:'none',fontWeight:600}}>📞 {b.phone}</a>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Add/Edit Driver Modal */}
      {(addingDriver||editingDriver)&&(
        <Modal onClose={()=>{setAddingDriver(false);setEditingDriver(null)}} title={editingDriver?'Edit Driver':'Add New Driver'} maxW={400}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <Inp label="Name" value={driverForm.name||''} onChange={e=>setDriverForm(f=>({...f,name:e.target.value}))} placeholder="Driver name"/>
            <Inp label="Phone" value={driverForm.phone||''} onChange={e=>setDriverForm(f=>({...f,phone:e.target.value}))} placeholder="10 digit number"/>
            <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13}}>
              <input type="checkbox" checked={!!driverForm.hindi} onChange={e=>setDriverForm(f=>({...f,hindi:e.target.checked}))} style={{width:16,height:16}}/> Hindi Speaking
            </label>
            <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13}}>
              <input type="checkbox" checked={!!driverForm.active} onChange={e=>setDriverForm(f=>({...f,active:e.target.checked}))} style={{width:16,height:16}}/> Active (currently working)
            </label>
          </div>
          <Btn onClick={async()=>{
            if(!driverForm.name) return alert('Name required')
            const id=editingDriver?editingDriver.id:'D'+Date.now()
            const d={...driverForm,id}
            if(editingDriver) setDrivers(ds=>ds.map(x=>x.id===d.id?d:x))
            else setDrivers(ds=>[...ds,d])
            await saveDriver(d)
            setAddingDriver(false); setEditingDriver(null)
          }} style={{width:'100%',marginTop:16,padding:'13px'}}>
            {editingDriver?'Save Changes':'Add Driver'}
          </Btn>
        </Modal>
      )}
    </div>
  )
}

// AVAILABILITY CALENDAR
function AvailabilityCalendar({bookings,fleet}) {
  const now = new Date()
  const [year,setYear] = useState(now.getFullYear())
  const [month,setMonth] = useState(now.getMonth())
  const [selCar,setSelCar] = useState('All')
  const [hoveredDay,setHoveredDay] = useState(null)
  const carNames = ['All',...new Set([...bookings.map(b=>b.car),...fleet.map(f=>`${f.brand} ${f.name} ${f.year}`)])]
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const daysInMonth = new Date(year,month+1,0).getDate()
  const firstDay = new Date(year,month,1).getDay()
  const todayDay = now.getFullYear()===year&&now.getMonth()===month?now.getDate():null

  const getBookings = day => {
    const ds=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    return bookings.filter(b=>(selCar==='All'||b.car===selCar)&&b.status!=='Cancelled'&&ds>=b.start&&ds<=b.end)
  }
  const bookedCount = Array.from({length:daysInMonth},(_,i)=>i+1).filter(d=>getBookings(d).length>0).length
  const prevM = ()=>{ if(month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1) }
  const nextM = ()=>{ if(month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1) }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div><div style={{fontSize:22,fontWeight:800,color:C.navy}}>Availability Calendar</div><div style={{fontSize:13,color:C.muted}}>Quick check while on call with a customer</div></div>
      </div>
      <div style={{display:'flex',gap:12,marginBottom:20,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,background:'#fff',border:`1px solid ${C.border}`,borderRadius:10,padding:'8px 14px'}}>
          <button onClick={prevM} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:C.navy,fontWeight:700,lineHeight:1}}>‹</button>
          <div style={{fontSize:15,fontWeight:700,color:C.navy,minWidth:150,textAlign:'center'}}>{monthNames[month]} {year}</div>
          <button onClick={nextM} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:C.navy,fontWeight:700,lineHeight:1}}>›</button>
        </div>
        <select value={selCar} onChange={e=>setSelCar(e.target.value)} style={{padding:'9px 14px',border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,background:'#fff',outline:'none',flex:1,maxWidth:280}}>
          {carNames.map(c=><option key={c}>{c}</option>)}
        </select>
        <div style={{display:'flex',gap:8,marginLeft:'auto'}}>
          <span style={{fontSize:12,padding:'5px 12px',background:'#e6f9f0',color:'#0a7a45',borderRadius:20,fontWeight:700}}>🟢 {daysInMonth-bookedCount} Free</span>
          <span style={{fontSize:12,padding:'5px 12px',background:'#fef0f0',color:C.red,borderRadius:20,fontWeight:700}}>🔴 {bookedCount} Booked</span>
        </div>
      </div>
      <Card style={{padding:0,overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',background:C.navy}}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d} style={{padding:'10px 0',textAlign:'center',fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.7)'}}>{d}</div>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',padding:6,gap:3}}>
          {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
          {Array.from({length:daysInMonth},(_,i)=>i+1).map(day=>{
            const bkgs=getBookings(day)
            const booked=bkgs.length>0
            const isToday=day===todayDay
            return (
              <div key={day} onMouseEnter={()=>setHoveredDay(day)} onMouseLeave={()=>setHoveredDay(null)} style={{position:'relative',borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:booked?'#fef0f0':isToday?'#e8f0fe':'#f0fdf4',border:`1px solid ${isToday?C.navy:booked?'#fca5a5':'#86efac'}`,cursor:'pointer',padding:'6px 2px',minHeight:44}}>
                <div style={{fontSize:13,fontWeight:isToday?900:600,color:booked?C.red:isToday?C.navy:'#15803d',lineHeight:1}}>{day}</div>
                <div style={{fontSize:8,marginTop:2,color:booked?C.red:'#15803d',fontWeight:600}}>{booked?`${bkgs.length} booked`:'Free'}</div>
                {isToday&&<div style={{position:'absolute',top:3,right:3,width:5,height:5,borderRadius:'50%',background:C.saffron}}/>}
                {hoveredDay===day&&bkgs.length>0&&(
                  <div style={{position:'absolute',top:'110%',left:'50%',transform:'translateX(-50%)',background:C.navy,color:'#fff',borderRadius:10,padding:'10px 14px',zIndex:50,minWidth:180,boxShadow:'0 8px 24px rgba(0,0,0,0.2)',fontSize:11,whiteSpace:'nowrap',maxHeight:200,overflowY:'auto'}}>
                    {bkgs.map(b=><div key={b.id} style={{marginBottom:6,paddingBottom:6,borderBottom:'1px solid rgba(255,255,255,0.15)'}}><div style={{fontWeight:700}}>{b.customer}</div><div style={{color:'rgba(255,255,255,0.7)'}}>{b.car}</div><div style={{color:C.gold}}>{b.start} → {b.end}</div></div>)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>
      <div style={{display:'flex',gap:16,marginTop:14,justifyContent:'center'}}>
        {[['#f0fdf4','#86efac','Available'],['#fef0f0','#fca5a5','Booked'],['#e8f0fe',C.navy,'Today']].map(([bg,bc,l])=>(
          <div key={l} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:C.muted}}><div style={{width:16,height:16,borderRadius:4,background:bg,border:`1px solid ${bc}`}}/>{l}</div>
        ))}
      </div>
    </div>
  )
}

// REVENUE
function Revenue({bookings,fleet}) {
  const [unlocked,setUnlocked] = useState(false)
  const [input,setInput] = useState('')
  const [err,setErr] = useState(false)
  const [period,setPeriod] = useState('monthly')
  const [carF,setCarF] = useState('All')

  const cars = useMemo(()=>['All',...new Set(bookings.map(b=>b.car))],[bookings])
  const bycar = useMemo(()=>carF==='All'?bookings:bookings.filter(b=>b.car===carF),[bookings,carF])
  const thisMonth = today.slice(0,7)
  const weekAgo = useMemo(()=>new Date(new Date()-7*86400000).toISOString().split('T')[0],[])
  const periodB = useMemo(()=>bycar.filter(b=>period==='daily'?b.start===today:period==='weekly'?b.start>=weekAgo:period==='monthly'?b.start?.startsWith(thisMonth):true),[bycar,period,weekAgo,thisMonth])
  const totRev = useMemo(()=>periodB.reduce((s,b)=>s+(b.revenue||0),0),[periodB])
  const totSec = useMemo(()=>periodB.reduce((s,b)=>s+(b.security||0),0),[periodB])
  const netRev = totRev
  const totalExpenses = useMemo(()=>fleet.reduce((s,c)=>s+(c.expenses||[]).reduce((es,e)=>es+e.amount,0),0),[fleet])
  const carBD = useMemo(()=>{
    const m={}
    bycar.forEach(b=>{if(!m[b.car])m[b.car]={car:b.car,revenue:0,bookings:0};m[b.car].revenue+=b.revenue||0;m[b.car].bookings+=1})
    return Object.values(m).sort((a,b)=>b.revenue-a.revenue)
  },[bycar])

  const tryUnlock = () => {
    if(input.trim()===REVENUE_PASSWORD){setUnlocked(true);setErr(false);setInput('')}
    else{setErr(true);setInput('')}
  }

  if(!unlocked) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh'}}>
      <Card style={{maxWidth:380,width:'100%',textAlign:'center',padding:40}}>
        <div style={{fontSize:48,marginBottom:16}}>🔒</div>
        <div style={{fontSize:20,fontWeight:800,color:C.navy,marginBottom:6}}>Revenue Access</div>
        <div style={{fontSize:13,color:C.muted,marginBottom:24}}>This section is password protected</div>
        <input type="password" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&tryUnlock()} placeholder="Enter password" autoFocus style={{width:'100%',padding:'12px 16px',border:`2px solid ${err?C.red:C.border}`,borderRadius:10,fontSize:14,outline:'none',textAlign:'center',boxSizing:'border-box',marginBottom:err?8:16}}/>
        {err&&<div style={{fontSize:12,color:C.red,marginBottom:12}}>Incorrect password. Try again.</div>}
        <button onClick={tryUnlock} style={{width:'100%',padding:'13px',fontSize:15,background:C.saffron,color:'#fff',border:'none',borderRadius:10,cursor:'pointer',fontWeight:700}}>Unlock Revenue</button>
      </Card>
    </div>
  )

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div><div style={{fontSize:22,fontWeight:800,color:C.navy}}>Revenue</div><div style={{fontSize:13,color:C.muted}}>Financial overview — confidential</div></div>
        <Btn onClick={()=>{setUnlocked(false);setInput('');setErr(false)}} v="secondary">🔒 Lock</Btn>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap',alignItems:'center'}}>
        {[['daily','Today'],['weekly','This Week'],['monthly','This Month'],['alltime','All Time']].map(([v,l])=>(
          <button key={v} onClick={()=>setPeriod(v)} style={{padding:'9px 18px',border:`1px solid ${period===v?C.navy:C.border}`,background:period===v?C.navy:'#fff',color:period===v?'#fff':C.muted,borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:700}}>{l}</button>
        ))}
        <select value={carF} onChange={e=>setCarF(e.target.value)} style={{padding:'9px 14px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,background:'#fff',outline:'none',marginLeft:'auto'}}>
          {cars.map(c=><option key={c}>{c}</option>)}
        </select>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24}}>
        {[['Total Revenue',fmt(totRev),C.navy],['Security Collected',fmt(totSec),C.purple],['Total Expenses (Fleet)',fmt(totalExpenses),C.red],['Net Revenue',fmt(netRev),'#16a34a']].map(([l,v,c])=>(
          <Card key={l} style={{textAlign:'center',borderTop:`3px solid ${c}`}}><Lbl t={l}/><div style={{fontSize:26,fontWeight:900,color:c}}>{v}</div><div style={{fontSize:12,color:C.muted,marginTop:4}}>{periodB.length} bookings</div></Card>
        ))}
      </div>
      <Card>
        <div style={{fontWeight:700,fontSize:15,color:C.navy,marginBottom:16}}>Revenue by Vehicle</div>
        {carBD.length===0&&<div style={{color:C.muted,fontSize:13,textAlign:'center',padding:20}}>No data for this period</div>}
        {carBD.map(({car,revenue,bookings:b},i)=>(
          <div key={car} style={{marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:11,color:C.muted,width:20}}>#{i+1}</span><span style={{fontWeight:600}}>{car}</span></div>
              <span><span style={{fontWeight:800,color:C.navy}}>{fmt(revenue)}</span><span style={{color:C.muted,fontSize:11}}> · {b} job{b!==1?'s':''}</span></span>
            </div>
            <div style={{height:8,background:C.bg,borderRadius:4}}>
              <div style={{height:'100%',width:`${carBD.length>0&&carBD[0].revenue>0?Math.round((revenue/carBD[0].revenue)*100):0}%`,background:`linear-gradient(90deg,${C.navy},${C.saffron})`,borderRadius:4}}/>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}

// MAIN APP
export default function App() {
  const [page,setPage] = useState('dashboard')
  const [bookings,setBookings] = useState([])
  const [fleet,setFleet] = useState([])
  const [drivers,setDrivers] = useState([])
  const [loading,setLoading] = useState(true)

  useEffect(()=>{ loadData() },[])

  const loadData = async () => {
    setLoading(true)
    try {
      const [b,f,d] = await Promise.all([
        supabase.from('bookings').select('*').order('created_at',{ascending:false}),
        supabase.from('fleet').select('*'),
        supabase.from('drivers').select('*'),
      ])
      if(b.data) setBookings(b.data.map(mapBooking))
      if(f.data) setFleet(f.data.map(mapFleet))
      if(d.data) setDrivers(d.data)
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  if(loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:C.bg}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:40,marginBottom:16}}>🚗</div>
        <div style={{fontSize:16,fontWeight:700,color:C.navy}}>Loading Sainik Cars...</div>
      </div>
    </div>
  )

  const nav = [
    {id:'dashboard',label:'Dashboard',icon:'📊'},
    {id:'bookings',label:'Bookings',icon:'📋'},
    {id:'fleet',label:'Fleet',icon:'🚗'},
    {id:'drivers',label:'Drivers',icon:'👤'},
    {id:'calendar',label:'Availability',icon:'📅'},
    {id:'revenue',label:'Revenue',icon:'🔒'},
  ]

  return (
    <div style={{minHeight:'100vh',background:C.bg,fontFamily:"'Segoe UI', system-ui, sans-serif",color:C.text}}>
      <div style={{background:C.navy,position:'sticky',top:0,zIndex:40,boxShadow:'0 2px 16px rgba(13,31,60,0.2)'}}>
        <div style={{maxWidth:1400,margin:'0 auto',padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:62}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:40,height:40,background:C.saffron,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🚗</div>
            <div><div style={{fontSize:16,fontWeight:800,color:'#fff',letterSpacing:0.5}}>Sainik Cars</div><div style={{fontSize:9,color:C.gold,letterSpacing:2,textTransform:'uppercase'}}>Admin Panel · Est 2004</div></div>
          </div>
          <div style={{display:'flex',gap:2}}>
            {nav.map(n=>(
              <button key={n.id} onClick={()=>setPage(n.id)} style={{padding:'8px 14px',border:'none',background:page===n.id?C.saffron:'transparent',color:page===n.id?'#fff':'rgba(255,255,255,0.6)',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:page===n.id?700:400,display:'flex',alignItems:'center',gap:6}} onMouseEnter={e=>{if(page!==n.id){e.currentTarget.style.background='rgba(255,255,255,0.1)';e.currentTarget.style.color='#fff'}}} onMouseLeave={e=>{if(page!==n.id){e.currentTarget.style.background='transparent';e.currentTarget.style.color='rgba(255,255,255,0.6)'}}}>
                {n.icon} {n.label}
              </button>
            ))}
          </div>
          <div style={{fontSize:11,color:C.gold,fontStyle:'italic',opacity:0.8}}>Serving those who serve the nation</div>
        </div>
      </div>
      <div style={{maxWidth:1400,margin:'0 auto',padding:'28px 24px'}}>
        {page==='dashboard'&&<Dashboard bookings={bookings} fleet={fleet}/>}
        {page==='bookings'&&<Bookings bookings={bookings} setBookings={setBookings} fleet={fleet} drivers={drivers}/>}
        {page==='fleet'&&<Fleet fleet={fleet} setFleet={setFleet}/>}
        {page==='drivers'&&<Drivers drivers={drivers} setDrivers={setDrivers} bookings={bookings}/>}
        {page==='calendar'&&<AvailabilityCalendar bookings={bookings} fleet={fleet}/>}
        {page==='revenue'&&<Revenue bookings={bookings} fleet={fleet}/>}
      </div>
    </div>
  )
}