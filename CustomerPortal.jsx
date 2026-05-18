import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabase'

const C = { navy:'#0d1f3c', saffron:'#f47920', gold:'#c9a84c', bg:'#f4f6fb', border:'#e4e8f0', muted:'#8892a4', card:'#ffffff', red:'#dc2626', green:'#16a34a' }

const fmt = n => '₹' + Number(n||0).toLocaleString('en-IN')
const today = new Date().toISOString().split('T')[0]
const daysUntil = d => !d ? 999 : Math.ceil((new Date(d)-new Date(today))/86400000)
const expColor = d => { const n=daysUntil(d); return n<0?C.red:n<=30?'#f59e0b':C.green }

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function CustomerPortal() {
  const [cars, setCars] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selCar, setSelCar] = useState(null)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [section, setSection] = useState('home')
  const [filterFuel, setFilterFuel] = useState('All')
  const [filterSeats, setFilterSeats] = useState('All')
  const [sortBy, setSortBy] = useState('none')
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [form, setForm] = useState({ name:'', phone:'', rank:'', startDate:'', startTime:'09:00', startLocation:'Vasant Kunj Parking Lot', startOther:'', endDate:'', endTime:'18:00', endLocation:'Vasant Kunj Parking Lot', endOther:'', notes:'', travelType:'Instation' })
  const [submitted, setSubmitted] = useState(false)
  const upd = (k,v) => setForm(f=>({...f,[k]:v}))

  const LOCATIONS = [
    { label:'Vasant Kunj Parking Lot', extra:0 },
    { label:'Gopinath Bazaar Office', extra:500 },
    { label:'Airport IGI', extra:500 },
    { label:'Railway Station NDLS', extra:500 },
    { label:'Other (within 15 kms of Vasant Kunj)', extra:500 },
  ]

  const getLocationExtra = (loc) => LOCATIONS.find(l=>l.label===loc)?.extra || 0

  const calcEstimate = () => {
    if(!form.startDate || !form.endDate) return null
    const days = Math.ceil((new Date(form.endDate)-new Date(form.startDate))/86400000)
    if(days <= 0) return null
    const dailyRate = selCar?.dailyRate || 0
    const weeklyRate = selCar?.weeklyRate || 0
    const monthlyRate = selCar?.monthlyRate || 0
    let baseRate = 0
    let rateLabel = ''
    if(days >= 30) { baseRate = monthlyRate * Math.ceil(days/30); rateLabel = 'Monthly rate' }
    else if(days >= 7) { baseRate = weeklyRate * Math.ceil(days/7); rateLabel = 'Weekly rate' }
    else { baseRate = dailyRate * days; rateLabel = 'Daily rate' }
    const outstationExtra = form.travelType === 'Outstation' ? 500 * days : 0
    const pickupExtra = getLocationExtra(form.startLocation)
    const dropExtra = getLocationExtra(form.endLocation)
    const total = baseRate + outstationExtra + pickupExtra + dropExtra
    return { days, baseRate, rateLabel, outstationExtra, pickupExtra, dropExtra, total }
  }

  const isOutsideHours = (t) => { 
    if(!t) return false
    const [h] = t.split(':').map(Number)
    return h < 9 || h >= 20
  }

  const VALID_TIMES = Array.from({length:11},(_,i)=>{
    const h = 9 + i
    return `${String(h).padStart(2,'0')}:00`
  })

  const LOCATIONS = [
    { label:'Vasant Kunj Parking Lot', charge:0 },
    { label:'Gopinath Bazaar Office', charge:500 },
    { label:'Airport IGI', charge:500 },
    { label:'Railway Station NDLS', charge:500 },
    { label:'Other (within 15 kms of Vasant Kunj)', charge:500 },
  ]
  const getCharge = loc => LOCATIONS.find(l=>l.label===loc)?.charge||0
  const isOther = loc => loc === 'Other (within 15 kms of Vasant Kunj)'

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [c, b] = await Promise.all([
      supabase.from('fleet').select('*'),
      supabase.from('bookings').select('start_date,end_date,car,file_no,status').neq('status','Cancelled')
    ])
    if(c.data) setCars(c.data.map(mapFleet))
    if(b.data) setBookings(b.data)
    setLoading(false)
  }

  const mapFleet = c => ({
    fileNo:c.file_no, regNo:c.reg_no, name:c.name, brand:c.brand,
    year:c.year, color:c.color, fuel:c.fuel, transmission:c.transmission,
    seats:c.seats, odometerReading:c.odometer_reading, kmpl:c.kmpl,
    dailyRate:c.daily_rate, weeklyRate:c.weekly_rate, monthlyRate:c.monthly_rate,
    status:c.status, forSale:c.for_sale, demandTag:c.demand_tag,
    featureTags:c.feature_tags||[], bestPoints:c.best_points||'',
    whyRent:c.why_rent||'', photos:c.photos||[],
    insuranceExpiry:c.insurance_expiry,
  })

  const isDateBooked = (car, dateStr) => {
    return bookings.some(b => {
      const matchFileNo = b.file_no === car.fileNo
      return matchFileNo && b.start_date && b.end_date && dateStr >= b.start_date && dateStr <= b.end_date
    })
  }

  const filteredCars = useMemo(() => {
    let f = cars.filter(c => c.status !== 'Maintenance')
    if(filterFuel !== 'All') f = f.filter(c => c.fuel === filterFuel)
    if(filterSeats !== 'All') f = f.filter(c => String(c.seats) === filterSeats)
    if(sortBy === 'price_low') f = [...f].sort((a,b) => a.dailyRate - b.dailyRate)
    if(sortBy === 'price_high') f = [...f].sort((a,b) => b.dailyRate - a.dailyRate)
    if(sortBy === 'seats') f = [...f].sort((a,b) => b.seats - a.seats)
    return f
  }, [cars, filterFuel, filterSeats, sortBy])

  const handleBookingRequest = () => {
    if(!form.name || !form.phone || !form.startDate || !form.endDate) {
      alert('Please fill all required fields')
      return
    }
    const est = calcEstimate()
    if(!est) { alert('Please select valid dates'); return }
    const startLocFull = form.startLocation.includes('Other') && form.startOtherAddress ? `${form.startLocation} — ${form.startOtherAddress}` : form.startLocation
    const endLocFull = form.endLocation.includes('Other') && form.endOtherAddress ? `${form.endLocation} — ${form.endOtherAddress}` : form.endLocation
    const msg = `🚗 *NEW BOOKING REQUEST — SAINIK CARS*
━━━━━━━━━━━━━━━━━━━━
👤 *Name:* ${form.name}${form.rank ? ` (${form.rank})` : ''}
📞 *Phone:* ${form.phone}
🚙 *Car:* ${selCar?.brand} ${selCar?.name} ${selCar?.year}
🗺️ *Trip Type:* ${form.travelType}

📍 *Pickup:* ${form.startDate} at ${form.startTime}
🏠 *From:* ${startLocFull}${est.pickupExtra>0?' (+₹500)':''}

🏁 *Return:* ${form.endDate} at ${form.endTime}
🏠 *To:* ${endLocFull}${est.dropExtra>0?' (+₹500)':''}

📆 *Days:* ${est.days}
💰 *Cost Breakdown:*
  • ${est.rateLabel}: ${fmt(est.baseRate)}${est.outstationExtra>0?'
  • Outstation: +'+fmt(est.outstationExtra):''}${est.pickupExtra>0?'
  • Pickup: +'+fmt(est.pickupExtra):''}${est.dropExtra>0?'
  • Drop: +'+fmt(est.dropExtra):''}
  • *Total Estimated: ${fmt(est.total)}*
📝 *Notes:* ${form.notes || 'None'}
━━━━━━━━━━━━━━━━━━━━
_Please call customer to confirm booking_`
    const waUrl = `https://wa.me/919891993389?text=${encodeURIComponent(msg)}`
    window.open(waUrl, '_blank')
    setSubmitted(true)
  }

  // Calendar for selected car
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate()
  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const todayDay = new Date().getFullYear()===calYear&&new Date().getMonth()===calMonth?new Date().getDate():null

  if(loading) return (
    <div style={{minHeight:'100vh',background:C.navy,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center',color:'#fff'}}>
        <div style={{fontSize:56,marginBottom:16}}>🚗</div>
        <div style={{fontSize:20,fontWeight:700,color:'#fff'}}>Loading Sainik Cars...</div>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:C.bg,fontFamily:"'Segoe UI',system-ui,sans-serif",color:C.navy}}>

      {/* NAVBAR */}
      <nav style={{background:C.navy,position:'sticky',top:0,zIndex:50,boxShadow:'0 2px 20px rgba(0,0,0,0.2)'}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'0 20px',display:'flex',alignItems:'center',justifyContent:'space-between',height:64}}>
          <div style={{display:'flex',alignItems:'center',gap:12,cursor:'pointer'}} onClick={()=>setSection('home')}>
            <div style={{width:42,height:42,background:C.saffron,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🚗</div>
            <div>
              <div style={{fontSize:18,fontWeight:900,color:'#fff',letterSpacing:0.5}}>Sainik Cars</div>
              <div style={{fontSize:9,color:C.gold,letterSpacing:2,textTransform:'uppercase'}}>Est 2004 · Delhi NCR</div>
            </div>
          </div>
          <div style={{display:'flex',gap:4}}>
            {[['home','Home'],['cars','Our Cars'],['about','About Us']].map(([s,l])=>(
              <button key={s} onClick={()=>setSection(s)} style={{padding:'8px 16px',border:'none',background:section===s?C.saffron:'transparent',color:section===s?'#fff':'rgba(255,255,255,0.7)',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600}}>
                {l}
              </button>
            ))}
          </div>
          <a href="tel:9891993389" style={{background:C.saffron,color:'#fff',padding:'9px 18px',borderRadius:10,textDecoration:'none',fontWeight:700,fontSize:13,display:'flex',alignItems:'center',gap:6}}>
            📞 Call Us
          </a>
        </div>
      </nav>

      {/* HOME SECTION */}
      {section==='home'&&(
        <>
          {/* Hero */}
          <div style={{background:`linear-gradient(135deg, ${C.navy} 0%, #1a3a6b 60%, ${C.navy} 100%)`,padding:'80px 20px',textAlign:'center'}}>
            <div style={{maxWidth:700,margin:'0 auto'}}>
              <div style={{display:'inline-block',background:'rgba(244,121,32,0.15)',border:'1px solid rgba(244,121,32,0.3)',borderRadius:20,padding:'6px 18px',fontSize:13,color:C.saffron,fontWeight:700,marginBottom:20,letterSpacing:1}}>
                ★ Trusted by Armed Forces since 2004
              </div>
              <h1 style={{fontSize:48,fontWeight:900,color:'#fff',margin:'0 0 16px',lineHeight:1.15}}>
                Premium Cars for <span style={{color:C.saffron}}>Every Journey</span>
              </h1>
              <p style={{fontSize:18,color:'rgba(255,255,255,0.65)',marginBottom:36,lineHeight:1.7}}>
                Delhi NCR's most trusted car rental service. Daily, Weekly & Monthly rentals with professional drivers.
              </p>
              <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
                <button onClick={()=>setSection('cars')} style={{background:C.saffron,color:'#fff',border:'none',padding:'14px 32px',borderRadius:12,fontSize:16,fontWeight:700,cursor:'pointer'}}>
                  Browse Our Cars →
                </button>
                <a href="https://wa.me/919891993389" target="_blank" rel="noreferrer" style={{background:'#25d366',color:'#fff',border:'none',padding:'14px 32px',borderRadius:12,fontSize:16,fontWeight:700,cursor:'pointer',textDecoration:'none',display:'inline-flex',alignItems:'center',gap:8}}>
                  💬 WhatsApp Us
                </a>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{background:'#fff',borderBottom:`1px solid ${C.border}`}}>
            <div style={{maxWidth:1200,margin:'0 auto',padding:'32px 20px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:20,textAlign:'center'}}>
              {[['20+','Years of Service'],['35+','Cars in Fleet'],['1000+','Happy Customers'],['95%','Military Clientele']].map(([n,l])=>(
                <div key={l}>
                  <div style={{fontSize:36,fontWeight:900,color:C.saffron}}>{n}</div>
                  <div style={{fontSize:13,color:C.muted,marginTop:4}}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Why Choose Us */}
          <div style={{maxWidth:1200,margin:'0 auto',padding:'60px 20px'}}>
            <div style={{textAlign:'center',marginBottom:40}}>
              <div style={{fontSize:13,fontWeight:700,color:C.saffron,letterSpacing:2,textTransform:'uppercase',marginBottom:8}}>Why Choose Sainik Cars</div>
              <h2 style={{fontSize:32,fontWeight:900,color:C.navy}}>Reliability You Can Count On</h2>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:24}}>
              {[
                {icon:'🛡️',title:'Trusted Since 2004',desc:'Over two decades of trusted service to Delhi NCR\'s armed forces community and beyond.'},
                {icon:'🚗',title:'Well Maintained Fleet',desc:'Every car personally maintained and verified. Regular servicing, insurance and compliance.'},
                {icon:'📍',title:'Pickup & Drop Service',desc:'Convenient pickup from Gopinath Bazaar, New Delhi Cantt, Airport, Railway Station or Mess.'},
                {icon:'📅',title:'Flexible Rentals',desc:'Daily, weekly or monthly rentals. Instation and outstation. Rates that work for you.'},
                {icon:'🔒',title:'Fully Insured',desc:'All cars fully insured. Security deposit refundable. Your safety is our priority.'},
                {icon:'📞',title:'24/7 Support',desc:'We\'re always available. In case of any issue, call us anytime on 9891993389.'},
              ].map(({icon,title,desc})=>(
                <div key={title} style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:14,padding:24}}>
                  <div style={{fontSize:36,marginBottom:14}}>{icon}</div>
                  <div style={{fontSize:16,fontWeight:700,color:C.navy,marginBottom:8}}>{title}</div>
                  <div style={{fontSize:14,color:C.muted,lineHeight:1.7}}>{desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Featured Cars */}
          <div style={{background:'#fff',padding:'60px 20px'}}>
            <div style={{maxWidth:1200,margin:'0 auto'}}>
              <div style={{textAlign:'center',marginBottom:40}}>
                <div style={{fontSize:13,fontWeight:700,color:C.saffron,letterSpacing:2,textTransform:'uppercase',marginBottom:8}}>Our Fleet</div>
                <h2 style={{fontSize:32,fontWeight:900,color:C.navy}}>Featured Cars</h2>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20,marginBottom:32}}>
                {cars.filter(c=>c.status!=='Maintenance').slice(0,3).map(car=>(
                  <CarCard key={car.fileNo} car={car} onClick={()=>{setSelCar(car);setSection('cars');setShowBookingForm(false)}}/>
                ))}
              </div>
              <div style={{textAlign:'center'}}>
                <button onClick={()=>setSection('cars')} style={{background:C.navy,color:'#fff',border:'none',padding:'12px 32px',borderRadius:10,fontSize:15,fontWeight:700,cursor:'pointer'}}>
                  View All {cars.length} Cars →
                </button>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div style={{background:`linear-gradient(135deg,${C.navy},#1a3a6b)`,padding:'60px 20px',textAlign:'center'}}>
            <div style={{maxWidth:600,margin:'0 auto'}}>
              <h2 style={{fontSize:32,fontWeight:900,color:'#fff',marginBottom:12}}>Ready to Book?</h2>
              <p style={{fontSize:16,color:'rgba(255,255,255,0.6)',marginBottom:32}}>Browse our fleet and send a booking request. We'll call you back to confirm within minutes.</p>
              <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
                <button onClick={()=>setSection('cars')} style={{background:C.saffron,color:'#fff',border:'none',padding:'14px 32px',borderRadius:12,fontSize:16,fontWeight:700,cursor:'pointer'}}>Browse Cars</button>
                <a href="tel:9891993389" style={{background:'rgba(255,255,255,0.1)',color:'#fff',border:'1px solid rgba(255,255,255,0.3)',padding:'14px 32px',borderRadius:12,fontSize:16,fontWeight:700,textDecoration:'none'}}>📞 9891993389</a>
              </div>
            </div>
          </div>
        </>
      )}

      {/* CARS SECTION */}
      {section==='cars'&&!selCar&&(
        <div style={{maxWidth:1200,margin:'0 auto',padding:'32px 20px'}}>
          <div style={{marginBottom:24}}>
            <h2 style={{fontSize:28,fontWeight:900,color:C.navy,marginBottom:4}}>Our Fleet</h2>
            <div style={{fontSize:14,color:C.muted}}>{filteredCars.length} cars available</div>
          </div>
          {/* Filters */}
          <div style={{display:'flex',gap:10,marginBottom:24,flexWrap:'wrap',background:'#fff',padding:16,borderRadius:12,border:`1px solid ${C.border}`}}>
            <select value={filterFuel} onChange={e=>setFilterFuel(e.target.value)} style={{padding:'9px 14px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,background:'#fff',outline:'none'}}>
              <option value="All">All Fuel Types</option>
              {['Petrol','Diesel','CNG','Electric'].map(o=><option key={o}>{o}</option>)}
            </select>
            <select value={filterSeats} onChange={e=>setFilterSeats(e.target.value)} style={{padding:'9px 14px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,background:'#fff',outline:'none'}}>
              <option value="All">All Seats</option>
              {['4','5','6','7','8'].map(o=><option key={o}>{o} Seater</option>)}
            </select>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{padding:'9px 14px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,background:'#fff',outline:'none'}}>
              <option value="none">Sort By</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="seats">Seats</option>
            </select>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
            {filteredCars.map(car=>(
              <CarCard key={car.fileNo} car={car} onClick={()=>{setSelCar(car);setShowBookingForm(false);setSubmitted(false)}}/>
            ))}
          </div>
        </div>
      )}

      {/* CAR DETAIL */}
      {section==='cars'&&selCar&&(
        <div style={{maxWidth:1000,margin:'0 auto',padding:'32px 20px'}}>
          <button onClick={()=>{setSelCar(null);setShowBookingForm(false);setSubmitted(false)}} style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 16px',cursor:'pointer',fontSize:13,fontWeight:600,color:C.navy,marginBottom:20}}>
            ← Back to Fleet
          </button>

          {/* Photos */}
          {selCar.photos&&selCar.photos.length>0?(
            <div style={{marginBottom:24}}>
              <img src={selCar.photos[0]} alt={selCar.name} style={{width:'100%',height:360,objectFit:'cover',borderRadius:16,marginBottom:8}}/>
              {selCar.photos.length>1&&(
                <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(selCar.photos.length-1,4)},1fr)`,gap:8}}>
                  {selCar.photos.slice(1,5).map((p,i)=>(
                    <img key={i} src={p} alt="" style={{width:'100%',height:100,objectFit:'cover',borderRadius:10}}/>
                  ))}
                </div>
              )}
            </div>
          ):(
            <div style={{height:300,background:`linear-gradient(135deg,${C.navy},#1a3a6b)`,borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:24}}>
              <div style={{fontSize:80}}>🚗</div>
            </div>
          )}

          <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:24}}>
            {/* Left */}
            <div>
              <div style={{background:'#fff',borderRadius:14,padding:24,border:`1px solid ${C.border}`,marginBottom:20}}>
                <div style={{fontSize:28,fontWeight:900,color:C.navy,marginBottom:4}}>{selCar.brand} {selCar.name} {selCar.year}</div>
                <div style={{fontSize:14,color:C.muted,marginBottom:20}}>{selCar.color} · {selCar.fuel} · {selCar.transmission} · {selCar.seats} Seats</div>

                {/* Rates */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:20}}>
                  {[['Daily',selCar.dailyRate],['Weekly',selCar.weeklyRate],['Monthly',selCar.monthlyRate]].map(([l,v])=>(
                    <div key={l} style={{background:C.bg,borderRadius:10,padding:14,textAlign:'center'}}>
                      <div style={{fontSize:11,color:C.muted,fontWeight:600,marginBottom:4}}>{l.toUpperCase()}</div>
                      <div style={{fontSize:20,fontWeight:900,color:C.navy}}>{fmt(v)}</div>
                    </div>
                  ))}
                </div>

                {/* Specs */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
                  {[['⛽ Fuel',selCar.fuel],['⚙️ Transmission',selCar.transmission],['👥 Seats',selCar.seats],['📊 Mileage',`${selCar.kmpl||0} kmpl`],['🛣️ Odometer',`${(selCar.odometerReading||0).toLocaleString()} km`],['🎨 Color',selCar.color]].map(([l,v])=>(
                    <div key={l} style={{background:C.bg,borderRadius:8,padding:'10px 14px'}}>
                      <div style={{fontSize:12,color:C.muted,marginBottom:2}}>{l}</div>
                      <div style={{fontSize:14,fontWeight:700,color:C.navy}}>{v}</div>
                    </div>
                  ))}
                </div>

                {selCar.featureTags?.length>0&&(
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
                    {selCar.featureTags.map(t=><span key={t} style={{fontSize:12,padding:'4px 12px',background:C.navy,color:'#fff',borderRadius:20,fontWeight:600}}>{t}</span>)}
                  </div>
                )}

                {selCar.whyRent&&(
                  <div style={{background:'#e6f9f0',borderRadius:10,padding:16}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#15803d',marginBottom:6}}>WHY RENT THIS CAR</div>
                    <div style={{fontSize:14,color:'#15803d',lineHeight:1.7}}>{selCar.whyRent}</div>
                  </div>
                )}
              </div>

              {/* Availability Calendar */}
              <div style={{background:'#fff',borderRadius:14,padding:24,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:16,fontWeight:700,color:C.navy,marginBottom:16}}>📅 Availability Calendar</div>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                  <button onClick={()=>{ if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1)}else setCalMonth(m=>m-1) }} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,width:32,height:32,cursor:'pointer',fontSize:16}}>‹</button>
                  <div style={{fontWeight:700,color:C.navy,flex:1,textAlign:'center'}}>{MONTHS[calMonth]} {calYear}</div>
                  <button onClick={()=>{ if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1)}else setCalMonth(m=>m+1) }} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,width:32,height:32,cursor:'pointer',fontSize:16}}>›</button>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,marginBottom:8}}>
                  {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=><div key={d} style={{textAlign:'center',fontSize:11,fontWeight:700,color:C.muted,padding:'4px 0'}}>{d}</div>)}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
                  {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
                  {Array.from({length:daysInMonth},(_,i)=>i+1).map(day=>{
                    const ds=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                    const booked=isDateBooked(selCar,ds)
                    const isPast=ds<today
                    const isToday=day===todayDay
                    return (
                      <div key={day} style={{textAlign:'center',padding:'6px 2px',borderRadius:6,background:isPast?'#f9f9f9':booked?'#fef0f0':isToday?'#e8f0fe':'#f0fdf4',border:`1px solid ${isPast?C.border:booked?'#fca5a5':isToday?C.navy:'#86efac'}`,fontSize:12,fontWeight:isToday?700:500,color:isPast?C.muted:booked?C.red:isToday?C.navy:'#15803d'}}>
                        {day}
                      </div>
                    )
                  })}
                </div>
                <div style={{display:'flex',gap:16,marginTop:12,justifyContent:'center'}}>
                  {[['#f0fdf4','#86efac','Available'],['#fef0f0','#fca5a5','Booked'],['#e8f0fe',C.navy,'Today']].map(([bg,bc,l])=>(
                    <div key={l} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:C.muted}}><div style={{width:12,height:12,borderRadius:3,background:bg,border:`1px solid ${bc}`}}/>{l}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — Booking Form */}
            <div style={{position:'sticky',top:80,alignSelf:'start'}}>
              {!showBookingForm&&!submitted&&(
                <div style={{background:'#fff',borderRadius:14,padding:24,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:18,fontWeight:800,color:C.navy,marginBottom:4}}>Request Booking</div>
                  <div style={{fontSize:13,color:C.muted,marginBottom:20}}>Fill in your details and we'll call you to confirm.</div>
                  <button onClick={()=>setShowBookingForm(true)} style={{width:'100%',background:C.saffron,color:'#fff',border:'none',padding:'14px',borderRadius:10,fontSize:15,fontWeight:700,cursor:'pointer',marginBottom:12}}>
                    🚗 Book This Car
                  </button>
                  <a href={`https://wa.me/919891993389?text=Hi, I'm interested in renting the ${selCar.brand} ${selCar.name} ${selCar.year}. Please contact me.`} target="_blank" rel="noreferrer" style={{display:'block',width:'100%',background:'#25d366',color:'#fff',border:'none',padding:'14px',borderRadius:10,fontSize:15,fontWeight:700,cursor:'pointer',textAlign:'center',textDecoration:'none',boxSizing:'border-box'}}>
                    💬 WhatsApp Enquiry
                  </a>
                  <div style={{textAlign:'center',marginTop:16,fontSize:13,color:C.muted}}>
                    or call us at<br/>
                    <a href="tel:9891993389" style={{fontSize:16,fontWeight:700,color:C.navy,textDecoration:'none'}}>📞 9891993389</a>
                  </div>
                </div>
              )}

              {showBookingForm&&!submitted&&(
                <div style={{background:'#fff',borderRadius:14,padding:24,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:18,fontWeight:800,color:C.navy,marginBottom:20}}>Booking Request</div>
                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    
                    {/* Customer Details */}
                    <div style={{background:'#f8faff',borderRadius:10,padding:12,border:`1px solid ${C.border}`}}>
                      <div style={{fontSize:11,fontWeight:800,color:C.navy,letterSpacing:1,marginBottom:10}}>👤 YOUR DETAILS</div>
                      <div style={{display:'flex',flexDirection:'column',gap:8}}>
                        <div>
                          <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:4}}>FULL NAME *</div>
                          <input value={form.name} onChange={e=>upd('name',e.target.value)} placeholder="Your name" style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box'}}/>
                        </div>
                        <div>
                          <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:4}}>PHONE *</div>
                          <input value={form.phone} onChange={e=>upd('phone',e.target.value)} placeholder="10 digit number" style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box'}}/>
                        </div>
                        <div>
                          <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:4}}>RANK / DESIGNATION</div>
                          <input value={form.rank} onChange={e=>upd('rank',e.target.value)} placeholder="e.g. Colonel, Civilian" style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box'}}/>
                        </div>
                      </div>
                    </div>

                    {/* Trip Type */}
                    <div>
                      <div style={{fontSize:11,fontWeight:800,color:C.navy,letterSpacing:1,marginBottom:8}}>🗺️ TRIP TYPE *</div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                        {['Instation','Outstation'].map(t=>(
                          <button key={t} onClick={()=>upd('travelType',t)} style={{padding:'10px',border:`2px solid ${form.travelType===t?C.saffron:C.border}`,background:form.travelType===t?'#fff7ed':'#fff',borderRadius:8,cursor:'pointer',fontWeight:700,fontSize:12,color:form.travelType===t?C.saffron:C.muted}}>
                            {t==='Instation'?'🏙️ NCR / Instation':'🛣️ Outstation'}
                            {t==='Outstation'&&<div style={{fontSize:10,color:'#d97706',fontWeight:500,marginTop:2}}>+₹500/day extra</div>}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pickup Details */}
                    <div style={{background:'#f0fdf4',borderRadius:10,padding:12,border:'1px solid #86efac'}}>
                      <div style={{fontSize:11,fontWeight:800,color:'#15803d',letterSpacing:1,marginBottom:10}}>📍 PICKUP DETAILS</div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                        <div>
                          <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:4}}>DATE *</div>
                          <input type="date" value={form.startDate} onChange={e=>upd('startDate',e.target.value)} min={today} style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box'}}/>
                        </div>
                        <div>
                          <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:4}}>TIME * (9AM–8PM)</div>
                          <select value={form.startTime} onChange={e=>upd('startTime',e.target.value)} style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,background:'#fff',outline:'none',boxSizing:'border-box'}}>
                            {VALID_TIMES.map(t=><option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:4}}>PICKUP LOCATION *</div>
                        <select value={form.startLocation} onChange={e=>upd('startLocation',e.target.value)} style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,background:'#fff',outline:'none',boxSizing:'border-box',marginBottom:6}}>
                          {LOCATIONS.map(l=><option key={l.label} value={l.label}>{l.label}{l.extra>0?` (+₹${l.extra})`:'  ✓ No extra charge'}</option>)}
                        </select>
                        {form.startLocation.includes('Other')&&(
                          <input value={form.startOtherAddress} onChange={e=>upd('startOtherAddress',e.target.value)} placeholder="Enter address or Google Maps link" style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box'}}/>
                        )}
                        {getLocationExtra(form.startLocation)>0&&<div style={{fontSize:11,color:'#d97706',marginTop:4}}>⚠️ +₹500 pickup charge applies</div>}
                      </div>
                    </div>

                    {/* Return Details */}
                    <div style={{background:'#fff7ed',borderRadius:10,padding:12,border:'1px solid #fed7aa'}}>
                      <div style={{fontSize:11,fontWeight:800,color:'#c2410c',letterSpacing:1,marginBottom:10}}>🏁 RETURN DETAILS</div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                        <div>
                          <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:4}}>DATE *</div>
                          <input type="date" value={form.endDate} onChange={e=>upd('endDate',e.target.value)} min={form.startDate||today} style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box'}}/>
                        </div>
                        <div>
                          <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:4}}>TIME * (9AM–8PM)</div>
                          <select value={form.endTime} onChange={e=>upd('endTime',e.target.value)} style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,background:'#fff',outline:'none',boxSizing:'border-box'}}>
                            {VALID_TIMES.map(t=><option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:4}}>RETURN LOCATION *</div>
                        <select value={form.endLocation} onChange={e=>upd('endLocation',e.target.value)} style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,background:'#fff',outline:'none',boxSizing:'border-box',marginBottom:6}}>
                          {LOCATIONS.map(l=><option key={l.label} value={l.label}>{l.label}{l.extra>0?` (+₹${l.extra})`:'  ✓ No extra charge'}</option>)}
                        </select>
                        {form.endLocation.includes('Other')&&(
                          <input value={form.endOtherAddress} onChange={e=>upd('endOtherAddress',e.target.value)} placeholder="Enter address or Google Maps link" style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box'}}/>
                        )}
                        {getLocationExtra(form.endLocation)>0&&<div style={{fontSize:11,color:'#d97706',marginTop:4}}>⚠️ +₹500 drop charge applies</div>}
                      </div>
                    </div>

                    {/* Cost Estimate */}
                    {calcEstimate()&&(()=>{
                      const est = calcEstimate()
                      return (
                        <div style={{background:'#e6f9f0',borderRadius:10,padding:14,border:'1px solid #86efac'}}>
                          <div style={{fontSize:12,fontWeight:800,color:'#15803d',marginBottom:10}}>💰 COST ESTIMATE</div>
                          <div style={{display:'flex',flexDirection:'column',gap:6,fontSize:13,color:'#15803d'}}>
                            <div style={{display:'flex',justifyContent:'space-between'}}><span>{est.rateLabel} ({est.days} days)</span><span style={{fontWeight:600}}>{fmt(est.baseRate)}</span></div>
                            {est.outstationExtra>0&&<div style={{display:'flex',justifyContent:'space-between'}}><span>Outstation charge</span><span style={{fontWeight:600}}>+{fmt(est.outstationExtra)}</span></div>}
                            {est.pickupExtra>0&&<div style={{display:'flex',justifyContent:'space-between'}}><span>Pickup charge</span><span style={{fontWeight:600}}>+{fmt(est.pickupExtra)}</span></div>}
                            {est.dropExtra>0&&<div style={{display:'flex',justifyContent:'space-between'}}><span>Drop charge</span><span style={{fontWeight:600}}>+{fmt(est.dropExtra)}</span></div>}
                            <div style={{display:'flex',justifyContent:'space-between',fontWeight:900,fontSize:15,borderTop:'1px solid #86efac',paddingTop:8,marginTop:4}}><span>Total Estimated</span><span>{fmt(est.total)}</span></div>
                          </div>
                          <div style={{fontSize:11,color:'#15803d',marginTop:8,opacity:0.7}}>*Final amount confirmed on call. Security deposit additional.</div>
                        </div>
                      )
                    })()}

                    {/* Notes */}
                    <div>
                      <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:4}}>ADDITIONAL NOTES</div>
                      <textarea value={form.notes} onChange={e=>upd('notes',e.target.value)} placeholder="Any special requirements..." style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,outline:'none',height:60,resize:'vertical',boxSizing:'border-box'}}/>
                    </div>

                    <button onClick={handleBookingRequest} style={{background:C.saffron,color:'#fff',border:'none',padding:'14px',borderRadius:10,fontSize:15,fontWeight:700,cursor:'pointer'}}>
                      📱 Send Request via WhatsApp
                    </button>
                    <button onClick={()=>setShowBookingForm(false)} style={{background:'#fff',color:C.muted,border:`1px solid ${C.border}`,padding:'10px',borderRadius:10,fontSize:13,cursor:'pointer'}}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {submitted&&(
                <div style={{background:'#fff',borderRadius:14,padding:32,border:`1px solid ${C.border}`,textAlign:'center'}}>
                  <div style={{fontSize:48,marginBottom:16}}>✅</div>
                  <div style={{fontSize:20,fontWeight:800,color:C.navy,marginBottom:8}}>Request Sent!</div>
                  <div style={{fontSize:14,color:C.muted,marginBottom:20,lineHeight:1.7}}>Your booking request has been sent via WhatsApp. We'll call you shortly to confirm the booking.</div>
                  <button onClick={()=>{setSubmitted(false);setShowBookingForm(false);setForm({name:'',phone:'',rank:'',startDate:'',startTime:'09:00',startLocation:'Vasant Kunj Parking Lot',endDate:'',endTime:'18:00',endLocation:'Vasant Kunj Parking Lot',notes:'',travelType:'Instation',startOtherAddress:'',endOtherAddress:''})}} style={{background:C.navy,color:'#fff',border:'none',padding:'12px 24px',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer'}}>
                    Make Another Request
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ABOUT SECTION */}
      {section==='about'&&(
        <div style={{maxWidth:900,margin:'0 auto',padding:'48px 20px'}}>
          <div style={{textAlign:'center',marginBottom:48}}>
            <div style={{fontSize:56,marginBottom:16}}>🚗</div>
            <h1 style={{fontSize:36,fontWeight:900,color:C.navy,marginBottom:8}}>About Sainik Cars</h1>
            <div style={{fontSize:16,color:C.muted}}>Delhi NCR's trusted car rental for those who serve the nation</div>
          </div>

          <div style={{background:'#fff',borderRadius:16,padding:36,border:`1px solid ${C.border}`,marginBottom:24}}>
            <h2 style={{fontSize:22,fontWeight:800,color:C.navy,marginBottom:16}}>Our Story</h2>
            <p style={{fontSize:15,color:'#4a5568',lineHeight:1.9,marginBottom:16}}>
              Sainik Cars was founded in 2004 with a simple mission — to provide reliable, affordable and hassle-free car rentals to the armed forces community in Delhi NCR. Starting from Vasant Kunj, New Delhi, we have grown to become one of the most trusted names in car rental among military officers and their families.
            </p>
            <p style={{fontSize:15,color:'#4a5568',lineHeight:1.9,marginBottom:16}}>
              With over 20 years of experience and a fleet of 35+ well-maintained vehicles, we understand the unique needs of our customers. Whether it's a short daily rental, a long-term monthly arrangement, or an outstation journey, we have the right car and the right service for you.
            </p>
            <p style={{fontSize:15,color:'#4a5568',lineHeight:1.9}}>
              Our clientele is 95% from the armed forces — Generals, Colonels, Air Vice Marshals and their families trust us with their transportation needs. This trust has been built over two decades of honest, reliable service.
            </p>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24}}>
            <div style={{background:'#fff',borderRadius:14,padding:24,border:`1px solid ${C.border}`}}>
              <h3 style={{fontSize:16,fontWeight:700,color:C.navy,marginBottom:12}}>📍 Our Location</h3>
              <p style={{fontSize:14,color:C.muted,lineHeight:1.8}}>
                Based in Vasant Kunj, New Delhi<br/>
                Pickup available from:<br/>
                • Gopinath Bazaar, Delhi Cantt<br/>
                • Airport (T1, T2, T3)<br/>
                • Railway Stations<br/>
                • Mess & Military bases<br/>
                <em style={{fontSize:12}}>₹500 extra upto 13 kms of Vasant Kunj</em>
              </p>
            </div>
            <div style={{background:'#fff',borderRadius:14,padding:24,border:`1px solid ${C.border}`}}>
              <h3 style={{fontSize:16,fontWeight:700,color:C.navy,marginBottom:12}}>🕐 Our Services</h3>
              <p style={{fontSize:14,color:C.muted,lineHeight:1.8}}>
                • Daily, Weekly & Monthly rentals<br/>
                • Instation & Outstation travel<br/>
                • Professional drivers available<br/>
                • Self-drive options<br/>
                • Airport & Station pickup/drop<br/>
                • Pre-owned cars for sale
              </p>
            </div>
          </div>

          <div style={{background:`linear-gradient(135deg,${C.navy},#1a3a6b)`,borderRadius:16,padding:36,textAlign:'center'}}>
            <h2 style={{fontSize:24,fontWeight:800,color:'#fff',marginBottom:8}}>Get in Touch</h2>
            <p style={{fontSize:15,color:'rgba(255,255,255,0.6)',marginBottom:24}}>We're always available to help you find the right car.</p>
            <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
              <a href="tel:9891993389" style={{background:C.saffron,color:'#fff',padding:'12px 24px',borderRadius:10,textDecoration:'none',fontWeight:700,fontSize:15}}>📞 9891993389</a>
              <a href="tel:9891093389" style={{background:'rgba(255,255,255,0.1)',color:'#fff',padding:'12px 24px',borderRadius:10,textDecoration:'none',fontWeight:700,fontSize:15,border:'1px solid rgba(255,255,255,0.2)'}}>📞 9891093389</a>
              <a href="https://wa.me/919891993389" target="_blank" rel="noreferrer" style={{background:'#25d366',color:'#fff',padding:'12px 24px',borderRadius:10,textDecoration:'none',fontWeight:700,fontSize:15}}>💬 WhatsApp</a>
            </div>
            <p style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginTop:20,fontStyle:'italic'}}>"Serving those who serve the nation" 🇮🇳</p>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer style={{background:C.navy,padding:'32px 20px',textAlign:'center',marginTop:40}}>
        <div style={{fontSize:16,fontWeight:800,color:'#fff',marginBottom:4}}>🚗 Sainik Cars</div>
        <div style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:8}}>Est 2004 · Vasant Kunj, New Delhi · Delhi NCR</div>
        <div style={{fontSize:12,color:C.gold,fontStyle:'italic'}}>"Serving those who serve the nation" 🇮🇳</div>
      </footer>
    </div>
  )
}

function CarCard({car, onClick}) {
  const available = car.status === 'Available'
  return (
    <div onClick={onClick} style={{background:'#fff',border:`1px solid ${available?'#e4e8f0':'#fca5a5'}`,borderRadius:14,overflow:'hidden',cursor:'pointer',transition:'all 0.2s'}} onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 8px 24px rgba(13,31,60,0.12)';e.currentTarget.style.transform='translateY(-2px)'}} onMouseLeave={e=>{e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='translateY(0)'}}>
      <div style={{height:160,background:`linear-gradient(135deg,#0d1f3c,#1a3a6b)`,position:'relative',overflow:'hidden'}}>
        {car.photos&&car.photos[0]
          ?<img src={car.photos[0]} alt={car.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          :<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',fontSize:48}}>🚗</div>
        }
        <div style={{position:'absolute',top:10,right:10}}>
          <span style={{background:available?'#16a34a':'#dc2626',color:'#fff',fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20}}>
            {available?'Available':'On Rent'}
          </span>
        </div>
      </div>
      <div style={{padding:16}}>
        <div style={{fontSize:15,fontWeight:800,color:'#0d1f3c',marginBottom:2}}>{car.brand} {car.name} {car.year}</div>
        <div style={{fontSize:12,color:'#8892a4',marginBottom:10}}>{car.color} · {car.fuel} · {car.seats} Seats</div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
          {car.featureTags?.slice(0,2).map(t=><span key={t} style={{fontSize:10,padding:'2px 8px',background:'#f4f6fb',color:'#0d1f3c',borderRadius:6,fontWeight:600}}>{t}</span>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
          {[['Daily',car.dailyRate],['Weekly',car.weeklyRate],['Monthly',car.monthlyRate]].map(([l,v])=>(
            <div key={l} style={{textAlign:'center',background:'#f4f6fb',borderRadius:8,padding:'6px 4px'}}>
              <div style={{fontSize:9,color:'#8892a4',fontWeight:600}}>{l}</div>
              <div style={{fontSize:12,fontWeight:800,color:'#0d1f3c'}}>{fmt(v)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}