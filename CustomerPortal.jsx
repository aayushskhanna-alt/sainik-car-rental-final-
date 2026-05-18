import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabase'

const C = { navy:'#0d1f3c', saffron:'#f47920', gold:'#c9a84c', bg:'#f4f6fb', border:'#e4e8f0', muted:'#8892a4', card:'#ffffff', red:'#dc2626', green:'#16a34a' }
const fmt = n => '₹' + Number(n||0).toLocaleString('en-IN')
const today = new Date().toISOString().split('T')[0]
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const LOCATIONS = [
  { label:'Vasant Kunj Parking Lot', extra:0 },
  { label:'Gopinath Bazaar Office', extra:500 },
  { label:'Airport IGI', extra:500 },
  { label:'Railway Station NDLS', extra:500 },
  { label:'Other (within 15 kms of Vasant Kunj)', extra:500 },
]

const VALID_TIMES = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00']
const getLocExtra = loc => LOCATIONS.find(l => l.label === loc)?.extra || 0

const defForm = {
  name:'', phone:'', rank:'',
  startDate:'', startTime:'09:00', startLocation:'Vasant Kunj Parking Lot', startOther:'',
  endDate:'', endTime:'18:00', endLocation:'Vasant Kunj Parking Lot', endOther:'',
  travelType:'Instation', notes:''
}

export default function CustomerPortal() {
  const [cars, setCars] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selCar, setSelCar] = useState(null)
  const [lightboxIdx, setLightboxIdx] = useState(null)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [section, setSection] = useState('home')
  const [search, setSearch] = useState('')
  const [filterFuel, setFilterFuel] = useState('All')
  const [filterTrans, setFilterTrans] = useState('All')
  const [filterBody, setFilterBody] = useState('All')
  const [filterSeats, setFilterSeats] = useState('All')
  const [sortBy, setSortBy] = useState('none')
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [form, setForm] = useState(defForm)
  const [lastMsg, setLastMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const upd = (k, v) => setForm(f => ({...f, [k]: v}))

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [c, b] = await Promise.all([
      supabase.from('fleet').select('*'),
      supabase.from('bookings').select('start_date,end_date,file_no,status').neq('status','Cancelled')
    ])
    if (c.data) setCars(c.data.map(mapFleet))
    if (b.data) setBookings(b.data)
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
  })

  const isDateBooked = (car, ds) => bookings.some(b => b.file_no === car.fileNo && b.start_date && b.end_date && ds >= b.start_date && ds <= b.end_date)

  const calcEstimate = () => {
    if (!form.startDate || !form.endDate) return null
    const days = Math.ceil((new Date(form.endDate) - new Date(form.startDate)) / 86400000)
    if (days <= 0) return null
    const dr = selCar?.dailyRate || 0
    const wr = selCar?.weeklyRate || 0
    const mr = selCar?.monthlyRate || 0
    let baseRate = 0, rateLabel = ''
    if (days >= 30) { baseRate = mr * days; rateLabel = `Monthly rate (${days} days)` }
    else if (days >= 7) { baseRate = wr * days; rateLabel = `Weekly rate (${days} days)` }
    else { baseRate = dr * days; rateLabel = `Daily rate (${days} days)` }
    const outstationExtra = form.travelType === 'Outstation' ? 500 * days : 0
    const pickupExtra = getLocExtra(form.startLocation)
    const dropExtra = getLocExtra(form.endLocation)
    return { days, baseRate, rateLabel, outstationExtra, pickupExtra, dropExtra, total: baseRate + outstationExtra + pickupExtra + dropExtra }
  }

  const handleRequest = () => {
    if (!form.name || !form.phone || !form.startDate || !form.endDate) { alert('Please fill all required fields'); return }
    const est = calcEstimate()
    if (!est) { alert('Please select valid dates'); return }
    const sLoc = form.startLocation.includes('Other') && form.startOther ? `${form.startLocation} — ${form.startOther}` : form.startLocation
    const eLoc = form.endLocation.includes('Other') && form.endOther ? `${form.endLocation} — ${form.endOther}` : form.endLocation
    const revenue = est.baseRate + est.outstationExtra + est.pickupExtra + est.dropExtra
    const msg = `🚗 *NEW BOOKING REQUEST — SAINIK CARS*
━━━━━━━━━━━━━━━━━━━━
👤 *Name:* ${form.name}${form.rank ? ` (${form.rank})` : ''}
📞 *Phone:* ${form.phone}
🚙 *Car:* ${selCar?.brand} ${selCar?.name} ${selCar?.year}
🗺️ *Trip Type:* ${form.travelType}

📍 *Pickup:* ${form.startDate} at ${form.startTime}
🏠 *From:* ${sLoc}

🏁 *Return:* ${form.endDate} at ${form.endTime}
🏠 *To:* ${eLoc}

📆 *Days:* ${est.days}
💰 *Cost Breakdown:*
  • ${est.rateLabel}: ${fmt(est.baseRate)}${est.outstationExtra > 0 ? `
  • Outstation charge: +${fmt(est.outstationExtra)}` : ''}${est.pickupExtra > 0 ? `
  • Pickup charge: +${fmt(est.pickupExtra)}` : ''}${est.dropExtra > 0 ? `
  • Drop charge: +${fmt(est.dropExtra)}` : ''}
  • *Revenue: ${fmt(revenue)}*
  • Security Deposit (refundable): +₹10,000
  • *Total Payable: ${fmt(revenue + 10000)}*

📝 *Notes:* ${form.notes || 'None'}
━━━━━━━━━━━━━━━━━━━━
_Please call customer to confirm booking_`
    setLastMsg(msg)
    window.open(`https://wa.me/919891993389?text=${encodeURIComponent(msg)}`, '_blank')
    setSubmitted(true)
  }

  const getBodyType = (car) => {
    const tags = (car.featureTags||[]).join(' ').toLowerCase()
    const name = `${car.brand} ${car.name}`.toLowerCase()
    if(tags.includes('suv')||name.includes('suv')||name.includes('creta')||name.includes('xuv')||name.includes('scorpio')||name.includes('fortuner')||name.includes('ecosport')||name.includes('kicks')||name.includes('compass')||name.includes('brezza')||name.includes('venue')||name.includes('nexon')) return 'SUV'
    if(tags.includes('sedan')||name.includes('city')||name.includes('verna')||name.includes('ciaz')||name.includes('dzire')||name.includes('amaze')||name.includes('aspire')||name.includes('tigor')) return 'Sedan'
    if(car.seats>=7) return 'SUV'
    return 'Hatchback'
  }

  const filteredCars = useMemo(() => {
    let f = cars.filter(c => c.status !== 'Maintenance')
    if (search) f = f.filter(c => `${c.brand} ${c.name} ${c.year} ${c.color} ${c.fuel}`.toLowerCase().includes(search.toLowerCase()))
    if (filterFuel !== 'All') f = f.filter(c => c.fuel === filterFuel)
    if (filterSeats !== 'All') f = f.filter(c => Number(c.seats) === Number(filterSeats))
    if (filterTrans !== 'All') f = f.filter(c => c.transmission === filterTrans)
    if (filterBody !== 'All') f = f.filter(c => getBodyType(c) === filterBody)
    if (sortBy === 'price_low') f = [...f].sort((a,b) => a.dailyRate - b.dailyRate)
    if (sortBy === 'price_high') f = [...f].sort((a,b) => b.dailyRate - a.dailyRate)
    if (sortBy === 'seats') f = [...f].sort((a,b) => b.seats - a.seats)
    if (sortBy === 'mileage') f = [...f].sort((a,b) => (b.kmpl||0) - (a.kmpl||0))
    return f
  }, [cars, search, filterFuel, filterSeats, filterTrans, filterBody, sortBy])

  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate()
  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const todayDay = new Date().getFullYear()===calYear&&new Date().getMonth()===calMonth ? new Date().getDate() : null

  if (loading) return (
    <div style={{minHeight:'100vh',background:C.navy,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center',color:'#fff'}}><div style={{fontSize:56,marginBottom:16}}>🚗</div><div style={{fontSize:20,fontWeight:700}}>Loading Sainik Cars...</div></div>
    </div>
  )

  const inp = (k, placeholder, type='text') => (
    <input type={type} value={form[k]} onChange={e=>upd(k,e.target.value)} placeholder={placeholder} style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box'}}/>
  )

  const sel = (k, options) => (
    <select value={form[k]} onChange={e=>upd(k,e.target.value)} style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,background:'#fff',outline:'none',boxSizing:'border-box'}}>
      {options.map(o => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  )

  return (
    <div style={{minHeight:'100vh',background:C.bg,fontFamily:"'Segoe UI',system-ui,sans-serif",color:C.navy}}>

      {/* NAV */}
      <nav style={{background:C.navy,position:'sticky',top:0,zIndex:50,boxShadow:'0 2px 20px rgba(0,0,0,0.2)'}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'0 20px',display:'flex',alignItems:'center',justifyContent:'space-between',height:64}}>
          <div style={{display:'flex',alignItems:'center',gap:12,cursor:'pointer'}} onClick={()=>setSection('home')}>
            <div style={{width:44,height:44,background:C.saffron,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <div style={{color:'#fff',fontWeight:900,fontSize:18,letterSpacing:1}}>🚗</div>
            </div>
            <div><div style={{fontSize:18,fontWeight:900,color:'#fff',letterSpacing:0.5}}>SAINIK CARS</div><div style={{fontSize:9,color:C.gold,letterSpacing:2,textTransform:'uppercase'}}>Est 2004 · Delhi NCR · 🇮🇳</div></div>
          </div>
          <div style={{display:'flex',gap:4}}>
            {[['home','Home'],['cars','Our Cars'],['about','About Us']].map(([s,l])=>(
              <button key={s} onClick={()=>{setSection(s);setSelCar(null)}} style={{padding:'8px 16px',border:'none',background:section===s?C.saffron:'transparent',color:section===s?'#fff':'rgba(255,255,255,0.7)',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600}}>{l}</button>
            ))}
          </div>
          <a href="tel:9891993389" style={{background:C.saffron,color:'#fff',padding:'9px 18px',borderRadius:10,textDecoration:'none',fontWeight:700,fontSize:13}}>📞 Call Us</a>
        </div>
      </nav>

      {/* HOME */}
      {section==='home'&&(<>
        <div style={{background:`linear-gradient(135deg,${C.navy} 0%,#1a3a6b 60%,${C.navy} 100%)`,padding:'80px 20px',textAlign:'center'}}>
          <div style={{maxWidth:700,margin:'0 auto'}}>
            <div style={{display:'inline-block',background:'rgba(244,121,32,0.15)',border:'1px solid rgba(244,121,32,0.3)',borderRadius:20,padding:'6px 18px',fontSize:13,color:C.saffron,fontWeight:700,marginBottom:20}}>★ Trusted by Armed Forces since 2004</div>
            <h1 style={{fontSize:48,fontWeight:900,color:'#fff',margin:'0 0 16px',lineHeight:1.15}}>Premium Cars for <span style={{color:C.saffron}}>Every Journey</span></h1>
            <p style={{fontSize:18,color:'rgba(255,255,255,0.65)',marginBottom:36,lineHeight:1.7}}>Delhi NCR's most trusted car rental. Daily, Weekly & Monthly rentals.</p>
            <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
              <button onClick={()=>setSection('cars')} style={{background:C.saffron,color:'#fff',border:'none',padding:'14px 32px',borderRadius:12,fontSize:16,fontWeight:700,cursor:'pointer'}}>Browse Our Cars →</button>
              <a href="https://wa.me/919891993389" target="_blank" rel="noreferrer" style={{background:'#25d366',color:'#fff',padding:'14px 32px',borderRadius:12,fontSize:16,fontWeight:700,textDecoration:'none'}}>💬 WhatsApp Us</a>
            </div>
          </div>
        </div>
        <div style={{background:'#fff',borderBottom:`1px solid ${C.border}`}}>
          <div style={{maxWidth:1200,margin:'0 auto',padding:'32px 20px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:20,textAlign:'center'}}>
            {[['20+','Years of Service'],['35+','Cars in Fleet'],['1000+','Happy Customers'],['95%','Military Clientele']].map(([n,l])=>(
              <div key={l}><div style={{fontSize:36,fontWeight:900,color:C.saffron}}>{n}</div><div style={{fontSize:13,color:C.muted,marginTop:4}}>{l}</div></div>
            ))}
          </div>
        </div>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'60px 20px'}}>
          <div style={{textAlign:'center',marginBottom:40}}>
            <div style={{fontSize:13,fontWeight:700,color:C.saffron,letterSpacing:2,textTransform:'uppercase',marginBottom:8}}>Why Choose Sainik Cars</div>
            <h2 style={{fontSize:32,fontWeight:900,color:C.navy}}>Reliability You Can Count On</h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:24}}>
            {[{icon:'🛡️',t:'Trusted Since 2004',d:'Over two decades of trusted service to Delhi NCR\'s armed forces community and beyond.'},{icon:'🚗',t:'Well Maintained Fleet',d:'Every car personally maintained and verified. Regular servicing, insurance and compliance.'},{icon:'📍',t:'Pickup & Drop Service',d:'Convenient pickup from Gopinath Bazaar, Delhi Cantt, Airport, Railway Station or Mess.'},{icon:'📅',t:'Flexible Rentals',d:'Daily, weekly or monthly rentals. Instation and outstation. Rates that work for you.'},{icon:'🔒',t:'Fully Insured',d:'All cars fully insured. Security deposit refundable. Your safety is our priority.'},{icon:'📞',t:'24/7 Support',d:'Always available. Call us anytime on 9891993389.'}].map(({icon,t,d})=>(
              <div key={t} style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:14,padding:24}}>
                <div style={{fontSize:36,marginBottom:14}}>{icon}</div>
                <div style={{fontSize:16,fontWeight:700,color:C.navy,marginBottom:8}}>{t}</div>
                <div style={{fontSize:14,color:C.muted,lineHeight:1.7}}>{d}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{background:'#fff',padding:'60px 20px'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <div style={{textAlign:'center',marginBottom:40}}>
              <div style={{fontSize:13,fontWeight:700,color:C.saffron,letterSpacing:2,textTransform:'uppercase',marginBottom:8}}>Our Fleet</div>
              <h2 style={{fontSize:32,fontWeight:900,color:C.navy}}>Featured Cars</h2>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20,marginBottom:32}}>
              {cars.filter(c=>c.status!=='Maintenance').slice(0,3).map(car=><CarCard key={car.fileNo} car={car} onClick={()=>{setSelCar(car);setSection('cars');setShowForm(false);setSubmitted(false)}}/>)}
            </div>
            <div style={{textAlign:'center'}}><button onClick={()=>setSection('cars')} style={{background:C.navy,color:'#fff',border:'none',padding:'12px 32px',borderRadius:10,fontSize:15,fontWeight:700,cursor:'pointer'}}>View All {cars.length} Cars →</button></div>
          </div>
        </div>
        {/* Google Reviews Section */}
        <div style={{background:'#fff',padding:'60px 20px'}}>
          <div style={{maxWidth:900,margin:'0 auto',textAlign:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:C.saffron,letterSpacing:2,textTransform:'uppercase',marginBottom:8}}>What Our Customers Say</div>
            <h2 style={{fontSize:32,fontWeight:900,color:C.navy,marginBottom:8}}>Rated 4.9 ⭐ on Google</h2>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:4,marginBottom:6}}>
              {'⭐⭐⭐⭐⭐'.split('').map((s,i)=><span key={i} style={{fontSize:28}}>{s}</span>)}
            </div>
            <div style={{fontSize:15,color:C.muted,marginBottom:32}}>Based on <strong style={{color:C.navy}}>3,317+ verified Google reviews</strong></div>
            
            {/* Review Cards */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20,marginBottom:40,textAlign:'left'}}>
              {[
                {name:'Brig. R.K. Sharma',stars:5,text:'Excellent service! Rented an Innova for 2 weeks. Car was in perfect condition, driver was punctual and professional. Will definitely use Sainik Cars again.',time:'2 months ago'},
                {name:'Col. Pradeep Singh',stars:5,text:'Outstanding experience. Aayush and his team are very responsive. Got a Creta for monthly rental at a great rate. Highly recommended for military families.',time:'3 months ago'},
                {name:'Maj. Vikram Nair',stars:5,text:'Best car rental in Delhi NCR for armed forces. Transparent pricing, well maintained vehicles and excellent customer support. 5 stars without doubt!',time:'1 month ago'},
              ].map(({name,stars,text,time})=>(
                <div key={name} style={{background:C.bg,borderRadius:14,padding:20,border:`1px solid ${C.border}`}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                    <div style={{width:40,height:40,background:C.navy,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:16,flexShrink:0}}>{name[0]}</div>
                    <div><div style={{fontSize:14,fontWeight:700,color:C.navy}}>{name}</div><div style={{fontSize:11,color:C.muted}}>{time}</div></div>
                    <div style={{marginLeft:'auto'}}><img src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" alt="Google" style={{height:16,opacity:0.7}}/></div>
                  </div>
                  <div style={{fontSize:14,marginBottom:6}}>{'⭐'.repeat(stars)}</div>
                  <div style={{fontSize:13,color:'#4a5568',lineHeight:1.7}}>{text}</div>
                </div>
              ))}
            </div>

            <div style={{background:`linear-gradient(135deg,${C.navy},#1a3a6b)`,borderRadius:16,padding:32}}>
              <div style={{fontSize:18,fontWeight:800,color:'#fff',marginBottom:6}}>See all 3,317+ reviews on Google</div>
              <div style={{fontSize:14,color:'rgba(255,255,255,0.6)',marginBottom:24}}>Join hundreds of satisfied customers who trust Sainik Cars</div>
              <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
                <a href="https://www.google.com/maps/place/Sainik+Car+Options+and+Services+Pvt.+Ltd./@28.596894,77.1304774,17z/data=!3m1!4b1!4m5!3m4!1s0x390d1d35ba1d48c7:0xdb4438153aac076d!8m2!3d28.5968893!4d77.1326661" target="_blank" rel="noreferrer" style={{background:'#fff',color:C.navy,padding:'12px 28px',borderRadius:10,textDecoration:'none',fontWeight:700,fontSize:15,display:'flex',alignItems:'center',gap:8}}>
                  ⭐ See All Reviews on Google
                </a>
                <a href="https://g.page/r/CW0HrDsVODjbEB0/review" target="_blank" rel="noreferrer" style={{background:C.saffron,color:'#fff',padding:'12px 28px',borderRadius:10,textDecoration:'none',fontWeight:700,fontSize:15}}>
                  ✍️ Leave a Review
                </a>
              </div>
            </div>
          </div>
        </div>

        <div style={{background:`linear-gradient(135deg,${C.navy},#1a3a6b)`,padding:'60px 20px',textAlign:'center'}}>
          <div style={{maxWidth:600,margin:'0 auto'}}>
            <h2 style={{fontSize:32,fontWeight:900,color:'#fff',marginBottom:12}}>Ready to Book?</h2>
            <p style={{fontSize:16,color:'rgba(255,255,255,0.6)',marginBottom:32}}>Browse our fleet and send a booking request. We'll call you back to confirm.</p>
            <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
              <button onClick={()=>setSection('cars')} style={{background:C.saffron,color:'#fff',border:'none',padding:'14px 32px',borderRadius:12,fontSize:16,fontWeight:700,cursor:'pointer'}}>Browse Cars</button>
              <a href="tel:9891993389" style={{background:'rgba(255,255,255,0.1)',color:'#fff',border:'1px solid rgba(255,255,255,0.3)',padding:'14px 32px',borderRadius:12,fontSize:16,fontWeight:700,textDecoration:'none'}}>📞 9891993389</a>
            </div>
          </div>
        </div>
      </>)}

      {/* CARS LIST */}
      {section==='cars'&&!selCar&&(
        <div style={{maxWidth:1200,margin:'0 auto',padding:'32px 20px'}}>
          <div style={{marginBottom:24}}><h2 style={{fontSize:28,fontWeight:900,color:C.navy,marginBottom:4}}>Our Fleet</h2><div style={{fontSize:14,color:C.muted}}>{filteredCars.length} cars</div></div>
          <div style={{background:'#fff',padding:16,borderRadius:12,border:`1px solid ${C.border}`,marginBottom:16}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search by car name, brand, fuel type..." style={{width:'100%',padding:'10px 14px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:14,outline:'none',boxSizing:'border-box'}}/>
          </div>
          <div style={{display:'flex',gap:10,marginBottom:24,flexWrap:'wrap',background:'#fff',padding:16,borderRadius:12,border:`1px solid ${C.border}`}}>
            <select value={filterFuel} onChange={e=>setFilterFuel(e.target.value)} style={{padding:'9px 14px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,background:'#fff',outline:'none'}}><option value="All">All Fuel Types</option>{['Petrol','Diesel','CNG','Electric'].map(o=><option key={o}>{o}</option>)}</select>
            <select value={filterSeats} onChange={e=>setFilterSeats(e.target.value)} style={{padding:'9px 14px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,background:'#fff',outline:'none'}}><option value="All">All Seats</option>{['5','6','7','8'].map(o=><option key={o} value={o}>{o} Seater</option>)}</select>
            <select value={filterTrans} onChange={e=>setFilterTrans(e.target.value)} style={{padding:'9px 14px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,background:'#fff',outline:'none'}}><option value="All">All Transmissions</option><option value="Manual">Manual</option><option value="Automatic">Automatic</option><option value="AMT">AMT</option></select>
            <select value={filterBody} onChange={e=>setFilterBody(e.target.value)} style={{padding:'9px 14px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,background:'#fff',outline:'none'}}><option value="All">All Types</option><option value="SUV">SUV</option><option value="Sedan">Sedan</option><option value="Hatchback">Hatchback</option></select>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{padding:'9px 14px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,background:'#fff',outline:'none'}}><option value="none">Sort By</option><option value="price_low">Price: Low to High</option><option value="price_high">Price: High to Low</option><option value="seats">Seats</option><option value="mileage">Mileage (Best First)</option></select>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
            {filteredCars.map(car=><CarCard key={car.fileNo} car={car} onClick={()=>{setSelCar(car);setShowForm(false);setSubmitted(false)}}/>)}
          </div>
        </div>
      )}

      {/* CAR DETAIL */}
      {section==='cars'&&selCar&&(
        <div style={{maxWidth:1000,margin:'0 auto',padding:'32px 20px'}}>
          <button onClick={()=>{setSelCar(null);setShowForm(false);setSubmitted(false);setPhotoIdx(0);setLightboxIdx(null)}} style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 16px',cursor:'pointer',fontSize:13,fontWeight:600,color:C.navy,marginBottom:20}}>← Back to Fleet</button>
          {selCar.photos&&selCar.photos.length>0?(
            <div style={{marginBottom:24,position:'relative'}}>
              <div style={{position:'relative',height:360,borderRadius:16,overflow:'hidden',cursor:'pointer',background:'#000'}} onClick={()=>setLightboxIdx(photoIdx)}>
                <img src={selCar.photos[photoIdx]} alt={selCar.name} style={{width:'100%',height:'100%',objectFit:'cover'}} loading="lazy"/>
                {selCar.photos.length>1&&<>
                  <button onClick={e=>{e.stopPropagation();setPhotoIdx(i=>i===0?selCar.photos.length-1:i-1)}} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',background:'rgba(0,0,0,0.55)',border:'none',color:'#fff',width:40,height:40,borderRadius:'50%',cursor:'pointer',fontSize:22,fontWeight:700}}>‹</button>
                  <button onClick={e=>{e.stopPropagation();setPhotoIdx(i=>i===selCar.photos.length-1?0:i+1)}} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'rgba(0,0,0,0.55)',border:'none',color:'#fff',width:40,height:40,borderRadius:'50%',cursor:'pointer',fontSize:22,fontWeight:700}}>›</button>
                  <div style={{position:'absolute',bottom:12,right:12,background:'rgba(0,0,0,0.55)',color:'#fff',padding:'4px 12px',borderRadius:20,fontSize:12,fontWeight:600}}>{photoIdx+1} / {selCar.photos.length} 📷</div>
                  <div style={{position:'absolute',bottom:12,left:12,background:'rgba(0,0,0,0.55)',color:'#fff',padding:'4px 10px',borderRadius:20,fontSize:11}}>Click to expand</div>
                </>}
              </div>
              {lightboxIdx!==null&&(
                <div onClick={()=>setLightboxIdx(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.95)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <button onClick={()=>setLightboxIdx(null)} style={{position:'absolute',top:20,right:20,background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',width:44,height:44,borderRadius:'50%',cursor:'pointer',fontSize:18,fontWeight:700}}>✕</button>
                  <button onClick={e=>{e.stopPropagation();setLightboxIdx(i=>i===0?selCar.photos.length-1:i-1)}} style={{position:'absolute',left:16,background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',width:48,height:48,borderRadius:'50%',cursor:'pointer',fontSize:24,fontWeight:700}}>‹</button>
                  <img src={selCar.photos[lightboxIdx]} alt="" style={{maxWidth:'88vw',maxHeight:'88vh',objectFit:'contain',borderRadius:10}} onClick={e=>e.stopPropagation()}/>
                  <button onClick={e=>{e.stopPropagation();setLightboxIdx(i=>i===selCar.photos.length-1?0:i+1)}} style={{position:'absolute',right:16,background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',width:48,height:48,borderRadius:'50%',cursor:'pointer',fontSize:24,fontWeight:700}}>›</button>
                  <div style={{position:'absolute',bottom:20,color:'rgba(255,255,255,0.6)',fontSize:13}}>{lightboxIdx+1} / {selCar.photos.length}</div>
                </div>
              )}
            </div>
          ):(
            <div style={{height:300,background:`linear-gradient(135deg,${C.navy},#1a3a6b)`,borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:24}}><div style={{fontSize:80}}>🚗</div></div>
          )}
          <div style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:24}}>
            <div>
              <div style={{background:'#fff',borderRadius:14,padding:24,border:`1px solid ${C.border}`,marginBottom:20}}>
                <div style={{fontSize:28,fontWeight:900,color:C.navy,marginBottom:4}}>{selCar.brand} {selCar.name} {selCar.year}</div>
                <div style={{fontSize:14,color:C.muted,marginBottom:20}}>{selCar.color} · {selCar.fuel} · {selCar.transmission} · {selCar.seats} Seats</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:20}}>
                  {[['Daily',selCar.dailyRate],['Weekly',selCar.weeklyRate],['Monthly',selCar.monthlyRate]].map(([l,v])=>(
                    <div key={l} style={{background:C.bg,borderRadius:10,padding:14,textAlign:'center'}}><div style={{fontSize:11,color:C.muted,fontWeight:600,marginBottom:4}}>{l.toUpperCase()}</div><div style={{fontSize:20,fontWeight:900,color:C.navy}}>{fmt(v)}</div></div>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                  {[['⛽ Fuel',selCar.fuel],['⚙️ Transmission',selCar.transmission],['👥 Seats',selCar.seats],['📊 Mileage',`${selCar.kmpl||0} kmpl`],['🛣️ Odometer',`${(selCar.odometerReading||0).toLocaleString()} km`],['🎨 Color',selCar.color]].map(([l,v])=>(
                    <div key={l} style={{background:C.bg,borderRadius:8,padding:'10px 14px'}}><div style={{fontSize:12,color:C.muted,marginBottom:2}}>{l}</div><div style={{fontSize:14,fontWeight:700,color:C.navy}}>{v}</div></div>
                  ))}
                </div>
                {selCar.featureTags?.length>0&&<div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>{selCar.featureTags.map(t=><span key={t} style={{fontSize:12,padding:'4px 12px',background:C.navy,color:'#fff',borderRadius:20,fontWeight:600}}>{t}</span>)}</div>}
                {selCar.whyRent&&<div style={{background:'#e6f9f0',borderRadius:10,padding:16}}><div style={{fontSize:12,fontWeight:700,color:'#15803d',marginBottom:6}}>WHY RENT THIS CAR</div><div style={{fontSize:14,color:'#15803d',lineHeight:1.7}}>{selCar.whyRent}</div></div>}
              </div>

              {/* Calendar */}
              <div style={{background:'#fff',borderRadius:14,padding:24,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:16,fontWeight:700,color:C.navy,marginBottom:16}}>📅 Availability Calendar</div>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                  <button onClick={()=>{if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1)}else setCalMonth(m=>m-1)}} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,width:32,height:32,cursor:'pointer',fontSize:16}}>‹</button>
                  <div style={{fontWeight:700,color:C.navy,flex:1,textAlign:'center'}}>{MONTHS[calMonth]} {calYear}</div>
                  <button onClick={()=>{if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1)}else setCalMonth(m=>m+1)}} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,width:32,height:32,cursor:'pointer',fontSize:16}}>›</button>
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
                    return <div key={day} style={{textAlign:'center',padding:'6px 2px',borderRadius:6,background:isPast?'#f9f9f9':booked?'#fef0f0':isToday?'#e8f0fe':'#f0fdf4',border:`1px solid ${isPast?C.border:booked?'#fca5a5':isToday?C.navy:'#86efac'}`,fontSize:12,fontWeight:isToday?700:500,color:isPast?C.muted:booked?C.red:isToday?C.navy:'#15803d'}}>{day}</div>
                  })}
                </div>
                <div style={{display:'flex',gap:16,marginTop:12,justifyContent:'center'}}>
                  {[['#f0fdf4','#86efac','Available'],['#fef0f0','#fca5a5','Booked'],['#e8f0fe',C.navy,'Today']].map(([bg,bc,l])=>(
                    <div key={l} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:C.muted}}><div style={{width:12,height:12,borderRadius:3,background:bg,border:`1px solid ${bc}`}}/>{l}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Booking Panel */}
            <div style={{position:'sticky',top:80,alignSelf:'start'}}>
              {!showForm&&!submitted&&(
                <div style={{background:'#fff',borderRadius:14,padding:24,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:18,fontWeight:800,color:C.navy,marginBottom:4}}>Request Booking</div>
                  <div style={{fontSize:13,color:C.muted,marginBottom:20}}>Fill your details and we'll call to confirm.</div>
                  <button onClick={()=>setShowForm(true)} style={{width:'100%',background:C.saffron,color:'#fff',border:'none',padding:'14px',borderRadius:10,fontSize:15,fontWeight:700,cursor:'pointer',marginBottom:12}}>📋 Request a Booking</button>
                  <a href={`https://wa.me/919891993389?text=Hi, I'm interested in the ${selCar.brand} ${selCar.name} ${selCar.year}. Please contact me.`} target="_blank" rel="noreferrer" style={{display:'block',width:'100%',background:'#25d366',color:'#fff',padding:'14px',borderRadius:10,fontSize:15,fontWeight:700,textAlign:'center',textDecoration:'none',boxSizing:'border-box'}}>💬 WHATSAPP US</a>
                  <div style={{textAlign:'center',marginTop:16,fontSize:13,color:C.muted}}>or call<br/><a href="tel:9891993389" style={{fontSize:16,fontWeight:700,color:C.navy,textDecoration:'none'}}>📞 9891993389</a></div>
                </div>
              )}

              {showForm&&!submitted&&(
                <div style={{background:'#fff',borderRadius:14,padding:20,border:`1px solid ${C.border}`,maxHeight:'85vh',overflowY:'auto'}}>
                  <div style={{fontSize:16,fontWeight:800,color:C.navy,marginBottom:16}}>Booking Request</div>

                  {/* Customer */}
                  <div style={{background:'#f8faff',borderRadius:10,padding:12,border:`1px solid ${C.border}`,marginBottom:12}}>
                    <div style={{fontSize:11,fontWeight:800,color:C.navy,letterSpacing:1,marginBottom:8}}>👤 YOUR DETAILS</div>
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      <div><div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:3}}>FULL NAME *</div>{inp('name','Your name')}</div>
                      <div><div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:3}}>PHONE *</div>{inp('phone','10 digit number')}</div>
                      <div><div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:3}}>RANK / DESIGNATION</div>{inp('rank','e.g. Colonel, Civilian')}</div>
                    </div>
                  </div>

                  {/* Trip Type */}
                  <div style={{marginBottom:12}}>
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

                  {/* Pickup */}
                  <div style={{background:'#f0fdf4',borderRadius:10,padding:12,border:'1px solid #86efac',marginBottom:12}}>
                    <div style={{fontSize:11,fontWeight:800,color:'#15803d',letterSpacing:1,marginBottom:8}}>📍 PICKUP DETAILS</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                      <div><div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:3}}>DATE *</div><input type="date" value={form.startDate} onChange={e=>upd('startDate',e.target.value)} min={today} style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box'}}/></div>
                      <div><div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:3}}>TIME (9AM–8PM)</div><select value={form.startTime} onChange={e=>upd('startTime',e.target.value)} style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,background:'#fff',outline:'none',boxSizing:'border-box'}}>{VALID_TIMES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                    </div>
                    <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:3}}>PICKUP LOCATION *</div>
                    <select value={form.startLocation} onChange={e=>upd('startLocation',e.target.value)} style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,background:'#fff',outline:'none',boxSizing:'border-box',marginBottom:6}}>
                      {LOCATIONS.map(l=><option key={l.label} value={l.label}>{l.label}{l.extra>0?` (+₹${l.extra})`:'  ✓ Free'}</option>)}
                    </select>
                    {form.startLocation.includes('Other')&&<input value={form.startOther} onChange={e=>upd('startOther',e.target.value)} placeholder="Address or Google Maps link" style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box'}}/>}
                    {getLocExtra(form.startLocation)>0&&<div style={{fontSize:11,color:'#d97706',marginTop:4}}>⚠️ +₹500 pickup charge</div>}
                  </div>

                  {/* Return */}
                  <div style={{background:'#fff7ed',borderRadius:10,padding:12,border:'1px solid #fed7aa',marginBottom:12}}>
                    <div style={{fontSize:11,fontWeight:800,color:'#c2410c',letterSpacing:1,marginBottom:8}}>🏁 RETURN DETAILS</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                      <div><div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:3}}>DATE *</div><input type="date" value={form.endDate} onChange={e=>upd('endDate',e.target.value)} min={form.startDate||today} style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box'}}/></div>
                      <div><div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:3}}>TIME (9AM–8PM)</div><select value={form.endTime} onChange={e=>upd('endTime',e.target.value)} style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,background:'#fff',outline:'none',boxSizing:'border-box'}}>{VALID_TIMES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                    </div>
                    <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:3}}>RETURN LOCATION *</div>
                    <select value={form.endLocation} onChange={e=>upd('endLocation',e.target.value)} style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,background:'#fff',outline:'none',boxSizing:'border-box',marginBottom:6}}>
                      {LOCATIONS.map(l=><option key={l.label} value={l.label}>{l.label}{l.extra>0?` (+₹${l.extra})`:'  ✓ Free'}</option>)}
                    </select>
                    {form.endLocation.includes('Other')&&<input value={form.endOther} onChange={e=>upd('endOther',e.target.value)} placeholder="Address or Google Maps link" style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box'}}/>}
                    {getLocExtra(form.endLocation)>0&&<div style={{fontSize:11,color:'#d97706',marginTop:4}}>⚠️ +₹500 drop charge</div>}
                  </div>

                  {/* Cost */}
                  {calcEstimate()&&(()=>{
                    const est=calcEstimate()
                    return <div style={{background:'#e6f9f0',borderRadius:10,padding:14,border:'1px solid #86efac',marginBottom:12}}>
                      <div style={{fontSize:12,fontWeight:800,color:'#15803d',marginBottom:10}}>💰 COST ESTIMATE</div>
                      <div style={{display:'flex',flexDirection:'column',gap:6,fontSize:13,color:'#15803d'}}>
                        <div style={{display:'flex',justifyContent:'space-between'}}><span>{est.rateLabel}</span><span style={{fontWeight:600}}>{fmt(est.baseRate)}</span></div>
                        {est.outstationExtra>0&&<div style={{display:'flex',justifyContent:'space-between'}}><span>Outstation</span><span style={{fontWeight:600}}>+{fmt(est.outstationExtra)}</span></div>}
                        {est.pickupExtra>0&&<div style={{display:'flex',justifyContent:'space-between'}}><span>Pickup charge</span><span style={{fontWeight:600}}>+{fmt(est.pickupExtra)}</span></div>}
                        {est.dropExtra>0&&<div style={{display:'flex',justifyContent:'space-between'}}><span>Drop charge</span><span style={{fontWeight:600}}>+{fmt(est.dropExtra)}</span></div>}
                        <div style={{display:'flex',justifyContent:'space-between'}}><span>Security Deposit (refundable)</span><span style={{fontWeight:600}}>+{fmt(10000)}</span></div>
                        <div style={{display:'flex',justifyContent:'space-between',fontWeight:900,fontSize:15,borderTop:'1px solid #86efac',paddingTop:8,marginTop:4}}><span>Total Payable</span><span>{fmt(est.total+10000)}</span></div>
                        <div style={{fontSize:11,opacity:0.8,marginTop:2}}>Rental: {fmt(est.total)} + Deposit: ₹10,000 (refundable)</div>
                      </div>
                      <div style={{fontSize:11,color:'#15803d',marginTop:8,opacity:0.7}}>*Security deposit fully refundable at end of rental subject to car condition.</div>
                    </div>
                  })()}

                  <div style={{marginBottom:12}}><div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:3}}>ADDITIONAL NOTES</div><textarea value={form.notes} onChange={e=>upd('notes',e.target.value)} placeholder="Any special requirements..." style={{width:'100%',padding:'9px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,outline:'none',height:60,resize:'vertical',boxSizing:'border-box'}}/></div>
                  {/* T&C */}
                  <div style={{background:'#f8faff',borderRadius:10,padding:12,border:`1px solid ${C.border}`,marginBottom:12,fontSize:12,color:C.muted,lineHeight:1.9}}>
                    <div style={{fontWeight:700,color:C.navy,marginBottom:8}}>📜 Terms & Conditions</div>
                    <div>⚠️ All accidental liability lies with the user. For full protection against accidents with minimum deductible, discuss with us after the booking confirmation.</div>
                    <div>⚖️ All legal liability lies with the user during the rental period</div>
                    <div>🚦 All challans/fines incurred during rental to be paid by the user</div>
                    <div>🆘 In case of accident/breakdown call immediately: <strong>9891093389 / 9891993389</strong></div>
                    <div>💳 Do NOT recharge FASTag without discussing with us first</div>
                    <div>📹 Please make a 360° video of car at pickup noting KM reading & fuel level</div>
                  </div>
                  <button onClick={handleRequest} style={{width:'100%',background:C.saffron,color:'#fff',border:'none',padding:'14px',borderRadius:10,fontSize:15,fontWeight:700,cursor:'pointer',marginBottom:8}}>📱 Send Request via WhatsApp</button>
                  <button onClick={()=>setShowForm(false)} style={{width:'100%',background:'#fff',color:C.muted,border:`1px solid ${C.border}`,padding:'10px',borderRadius:10,fontSize:13,cursor:'pointer'}}>Cancel</button>
                </div>
              )}

              {submitted&&(
                <div style={{background:'#fff',borderRadius:14,padding:24,border:`1px solid ${C.border}`,textAlign:'center'}}>
                  <div style={{fontSize:48,marginBottom:12}}>✅</div>
                  <div style={{fontSize:20,fontWeight:800,color:C.navy,marginBottom:8}}>Request Sent!</div>
                  <div style={{fontSize:14,color:C.muted,marginBottom:20,lineHeight:1.7}}>Your booking request has been sent via WhatsApp. We'll call you shortly to confirm.</div>
                  <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
                    <button onClick={()=>{ navigator.clipboard.writeText(lastMsg); setCopied(true); setTimeout(()=>setCopied(false),2500) }} style={{width:'100%',background:copied?'#16a34a':C.navy,color:'#fff',border:'none',padding:'12px',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer'}}>
                      {copied?'✅ Copied!':'📋 Copy Message (for Email/WhatsApp)'}
                    </button>
                    <a href={`https://wa.me/919891993389?text=${encodeURIComponent(lastMsg)}`} target="_blank" rel="noreferrer" style={{display:'block',width:'100%',background:'#25d366',color:'#fff',padding:'12px',borderRadius:10,fontSize:14,fontWeight:700,textDecoration:'none',boxSizing:'border-box'}}>
                      💬 Resend via WhatsApp
                    </a>
                  </div>
                  <button onClick={()=>{setSubmitted(false);setShowForm(false);setForm(defForm);setCopied(false)}} style={{background:'#fff',color:C.muted,border:`1px solid ${C.border}`,padding:'10px 24px',borderRadius:10,fontSize:13,cursor:'pointer',width:'100%'}}>Make Another Request</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ABOUT */}
      {section==='about'&&(
        <div style={{maxWidth:900,margin:'0 auto',padding:'48px 20px'}}>
          <div style={{textAlign:'center',marginBottom:48}}>
            <div style={{fontSize:56,marginBottom:16}}>🚗</div>
            <h1 style={{fontSize:36,fontWeight:900,color:C.navy,marginBottom:8}}>About Sainik Cars</h1>
            <div style={{fontSize:16,color:C.muted}}>Delhi NCR's trusted car rental for those who serve the nation</div>
          </div>
          <div style={{background:'#fff',borderRadius:16,padding:36,border:`1px solid ${C.border}`,marginBottom:24}}>
            <h2 style={{fontSize:22,fontWeight:800,color:C.navy,marginBottom:16}}>Our Story</h2>
            <p style={{fontSize:15,color:'#4a5568',lineHeight:1.9,marginBottom:16}}>Sainik Cars was founded in 2004 with a simple mission — to provide reliable, affordable and hassle-free car rentals to the armed forces community in Delhi NCR. Starting from Vasant Kunj, New Delhi, we have grown to become one of the most trusted names in car rental among military officers and their families.</p>
            <p style={{fontSize:15,color:'#4a5568',lineHeight:1.9,marginBottom:16}}>With over 20 years of experience and a fleet of 35+ well-maintained vehicles, we understand the unique needs of our customers. Whether it's a short daily rental, a long-term monthly arrangement, or an outstation journey, we have the right car and the right service for you.</p>
            <p style={{fontSize:15,color:'#4a5568',lineHeight:1.9}}>Our clientele is 95% from the armed forces — Generals, Colonels, Air Vice Marshals and their families trust us with their transportation needs. This trust has been built over two decades of honest, reliable service.</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24}}>
            <div style={{background:'#fff',borderRadius:14,padding:24,border:`1px solid ${C.border}`}}>
              <h3 style={{fontSize:16,fontWeight:700,color:C.navy,marginBottom:12}}>📍 Our Location</h3>
              <p style={{fontSize:14,color:C.muted,lineHeight:1.8}}>Based in Vasant Kunj, New Delhi<br/>Pickup from:<br/>• Gopinath Bazaar, Delhi Cantt<br/>• Airport (T1, T2, T3)<br/>• Railway Stations<br/>• Mess & Military bases<br/><em style={{fontSize:12}}>₹500 extra upto 13 kms of Vasant Kunj</em></p>
            </div>
            <div style={{background:'#fff',borderRadius:14,padding:24,border:`1px solid ${C.border}`}}>
              <h3 style={{fontSize:16,fontWeight:700,color:C.navy,marginBottom:12}}>🕐 Our Services</h3>
              <p style={{fontSize:14,color:C.muted,lineHeight:1.8}}>• Daily, Weekly & Monthly rentals<br/>• Instation & Outstation<br/>• Professional drivers<br/>• Airport & Station pickup/drop<br/>• Pre-owned cars for sale</p>
            </div>
          </div>
          <div style={{background:`linear-gradient(135deg,${C.navy},#1a3a6b)`,borderRadius:16,padding:36,textAlign:'center'}}>
            <h2 style={{fontSize:24,fontWeight:800,color:'#fff',marginBottom:8}}>Get in Touch</h2>
            <p style={{fontSize:15,color:'rgba(255,255,255,0.6)',marginBottom:24}}>We're always available to help.</p>
            <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
              <a href="tel:9891993389" style={{background:C.saffron,color:'#fff',padding:'12px 24px',borderRadius:10,textDecoration:'none',fontWeight:700,fontSize:15}}>📞 9891993389</a>
              <a href="tel:9891093389" style={{background:'rgba(255,255,255,0.1)',color:'#fff',padding:'12px 24px',borderRadius:10,textDecoration:'none',fontWeight:700,fontSize:15,border:'1px solid rgba(255,255,255,0.2)'}}>📞 9891093389</a>
              <a href="https://wa.me/919891993389" target="_blank" rel="noreferrer" style={{background:'#25d366',color:'#fff',padding:'12px 24px',borderRadius:10,textDecoration:'none',fontWeight:700,fontSize:15}}>💬 WhatsApp</a>
            </div>
            <p style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginTop:20,fontStyle:'italic'}}>"Serving those who serve the nation" 🇮🇳</p>
          </div>
        </div>
      )}

      <footer style={{background:C.navy,padding:'32px 20px',textAlign:'center',marginTop:40}}>
        <div style={{fontSize:16,fontWeight:800,color:'#fff',marginBottom:4}}>🚗 Sainik Cars</div>
        <div style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:8}}>Est 2004 · Vasant Kunj, New Delhi</div>
        <div style={{fontSize:12,color:C.gold,fontStyle:'italic'}}>"Serving those who serve the nation" 🇮🇳</div>
      </footer>
    </div>
  )
}

function CarCard({car,onClick}) {
  const available = car.status==='Available'
  return (
    <div onClick={onClick} style={{background:'#fff',border:`1px solid ${available?C.border:'#fca5a5'}`,borderRadius:14,overflow:'hidden',cursor:'pointer',transition:'all 0.2s'}} onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 8px 24px rgba(13,31,60,0.12)';e.currentTarget.style.transform='translateY(-2px)'}} onMouseLeave={e=>{e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='translateY(0)'}}>
      <div style={{height:160,background:'linear-gradient(135deg,#0d1f3c,#1a3a6b)',position:'relative',overflow:'hidden'}}>
        {car.photos&&car.photos[0]?<img src={car.photos[0]} alt={car.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',fontSize:48}}>🚗</div>}
        <div style={{position:'absolute',top:10,right:10}}><span style={{background:available?'#16a34a':'#dc2626',color:'#fff',fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{available?'Available':'On Rent'}</span></div>
      </div>
      <div style={{padding:16}}>
        <div style={{fontSize:15,fontWeight:800,color:'#0d1f3c',marginBottom:2}}>{car.brand} {car.name} {car.year}</div>
        <div style={{fontSize:12,color:'#8892a4',marginBottom:10}}>{car.color} · {car.fuel} · {car.seats} Seats</div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>{car.featureTags?.slice(0,2).map(t=><span key={t} style={{fontSize:10,padding:'2px 8px',background:'#f4f6fb',color:'#0d1f3c',borderRadius:6,fontWeight:600}}>{t}</span>)}</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
          {[['Daily',car.dailyRate],['Weekly',car.weeklyRate],['Monthly',car.monthlyRate]].map(([l,v])=>(
            <div key={l} style={{textAlign:'center',background:'#f4f6fb',borderRadius:8,padding:'6px 4px'}}><div style={{fontSize:9,color:'#8892a4',fontWeight:600}}>{l}</div><div style={{fontSize:12,fontWeight:800,color:'#0d1f3c'}}>₹{Number(v||0).toLocaleString('en-IN')}</div></div>
          ))}
        </div>
      </div>
    </div>
  )
}