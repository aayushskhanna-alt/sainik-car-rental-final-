import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const DRIVER_COLORS = {
  'Ashok':     { bg:'#fff7ed', border:'#f47920', text:'#c2410c' },
  'Ajit Saha': { bg:'#eff6ff', border:'#1d4ed8', text:'#1e40af' },
  'Tapas':     { bg:'#f0fdf4', border:'#16a34a', text:'#15803d' },
  'SELF':      { bg:'#f5f0ff', border:'#7c3aed', text:'#6d28d9' },
}
const DEF_COLOR = { bg:'#f4f6fb', border:'#8892a4', text:'#5a6478' }

const today = new Date().toISOString().split('T')[0]

const fmtTime = t => {
  if(!t) return '—'
  const [h,m] = t.split(':').map(Number)
  const ampm = h>=12?'PM':'AM'
  return `${h%12||12}:${String(m).padStart(2,'0')} ${ampm}`
}

const fmtDateFull = () => {
  const d = new Date()
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

const fmtDateHindi = () => {
  const d = new Date()
  const days = ['रविवार','सोमवार','मंगलवार','बुधवार','गुरुवार','शुक्रवार','शनिवार']
  const months = ['जनवरी','फरवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितंबर','अक्टूबर','नवंबर','दिसंबर']
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

const speak = (text, lang) => {
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  u.rate = 0.85
  window.speechSynthesis.speak(u)
}

export default function DriverView() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [speaking, setSpeaking] = useState(null)

  useEffect(() => {
    loadJobs()
    const iv = setInterval(loadJobs, 60000)
    return () => clearInterval(iv)
  }, [])

  const loadJobs = async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .or(`start_date.eq.${today},end_date.eq.${today}`)
      .neq('status', 'Cancelled')

    if(data) {
      const all = []
      data.forEach(b => {
        if(b.start_date === today) {
          all.push({
            id: b.id + '_p',
            driver: b.pickup_driver || '—',
            customer: b.customer || '—',
            phone: b.phone || '—',
            car: b.car || '—',
            fileNo: b.file_no || '',
            time: b.start_time || '09:00',
            location: b.start_location || '—',
            isPickup: true,
          })
        }
        if(b.end_date === today) {
          all.push({
            id: b.id + '_d',
            driver: b.return_driver || b.pickup_driver || '—',
            customer: b.customer || '—',
            phone: b.phone || '—',
            car: b.car || '—',
            fileNo: b.file_no || '',
            time: b.end_time || '18:00',
            location: b.end_location || '—',
            isPickup: false,
          })
        }
      })
      all.sort((a,b) => a.time.localeCompare(b.time))
      setJobs(all)
    }
    setLoading(false)
  }

  const handleSpeak = (job, lang) => {
    const key = job.id + lang
    if(speaking === key) {
      window.speechSynthesis.cancel()
      setSpeaking(null)
      return
    }
    setSpeaking(key)
    const hi = `${job.driver} का काम। ग्राहक ${job.customer}। गाड़ी ${job.car}। ${job.isPickup ? 'पिकअप' : 'ड्रॉप'} ${fmtTime(job.time)} बजे। जगह ${job.location}। फोन ${job.phone}`
    const en = `${job.driver}'s job. Customer ${job.customer}. Car ${job.car}. ${job.isPickup ? 'Pickup' : 'Drop'} at ${fmtTime(job.time)}. Location ${job.location}. Phone ${job.phone}`
    speak(lang === 'hi' ? hi : en, lang === 'hi' ? 'hi-IN' : 'en-IN')
    setTimeout(() => setSpeaking(null), 10000)
  }

  const drivers = ['All', ...Object.keys(DRIVER_COLORS)]
  const filtered = filter === 'All' ? jobs : jobs.filter(j => j.driver === filter)

  if(loading) return (
    <div style={{minHeight:'100vh',background:'#0d1f3c',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center',color:'#fff'}}>
        <div style={{fontSize:56,marginBottom:16}}>🚗</div>
        <div style={{fontSize:20,fontWeight:700}}>लोड हो रहा है...</div>
        <div style={{fontSize:14,opacity:0.5,marginTop:4}}>Loading...</div>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#0d1f3c',fontFamily:"'Segoe UI',system-ui,sans-serif",paddingBottom:40}}>

      {/* Header */}
      <div style={{background:'#0a1628',padding:'20px 16px 16px',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
          <div style={{width:46,height:46,background:'#f47920',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,flexShrink:0}}>🚗</div>
          <div>
            <div style={{fontSize:20,fontWeight:900,color:'#fff',letterSpacing:0.5}}>Sainik Cars</div>
            <div style={{fontSize:11,color:'#c9a84c',letterSpacing:2}}>DRIVER VIEW · ड्राइवर व्यू</div>
          </div>
        </div>
        <div style={{background:'rgba(255,255,255,0.06)',borderRadius:12,padding:'12px 16px'}}>
          <div style={{fontSize:15,fontWeight:700,color:'#fff'}}>{fmtDateHindi()}</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.45)',marginTop:2}}>{fmtDateFull()}</div>
        </div>
      </div>

      {/* Driver Filter Tabs */}
      <div style={{padding:'14px 16px 0',display:'flex',gap:8,overflowX:'auto'}}>
        {drivers.map(d => {
          const c = DRIVER_COLORS[d] || DEF_COLOR
          const active = filter === d
          const count = d === 'All' ? jobs.length : jobs.filter(j => j.driver === d).length
          return (
            <button key={d} onClick={() => setFilter(d)} style={{
              padding:'8px 16px', borderRadius:20, border:`2px solid ${active ? c.border : 'rgba(255,255,255,0.15)'}`,
              background: active ? c.border : 'transparent',
              color: active ? '#fff' : 'rgba(255,255,255,0.6)',
              fontWeight:700, fontSize:13, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0,
              display:'flex', alignItems:'center', gap:6
            }}>
              {d === 'All' ? 'सभी / All' : d}
              <span style={{background:'rgba(255,255,255,0.25)',borderRadius:10,padding:'1px 7px',fontSize:11}}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Jobs */}
      <div style={{padding:'14px 16px',display:'flex',flexDirection:'column',gap:14}}>
        {filtered.length === 0 && (
          <div style={{textAlign:'center',padding:'60px 20px'}}>
            <div style={{fontSize:56,marginBottom:16}}>✅</div>
            <div style={{fontSize:22,fontWeight:800,color:'#fff',marginBottom:8}}>आज कोई काम नहीं</div>
            <div style={{fontSize:15,color:'rgba(255,255,255,0.4)'}}>No jobs today</div>
          </div>
        )}

        {filtered.map(job => {
          const c = DRIVER_COLORS[job.driver] || DEF_COLOR
          return (
            <div key={job.id} style={{background:c.bg, border:`2px solid ${c.border}`, borderRadius:16, overflow:'hidden'}}>

              {/* Job Header */}
              <div style={{background:c.border, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div style={{display:'flex', alignItems:'center', gap:8}}>
                  <div style={{width:10,height:10,borderRadius:'50%',background:'rgba(255,255,255,0.6)'}}/>
                  <span style={{fontSize:15,fontWeight:800,color:'#fff'}}>{job.driver}</span>
                  <span style={{background:'rgba(255,255,255,0.2)',color:'#fff',padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:700}}>
                    {job.isPickup ? '📍 PICKUP' : '🏁 DROP'}
                  </span>
                </div>
                <div style={{fontSize:22,fontWeight:900,color:'#fff'}}>{fmtTime(job.time)}</div>
              </div>

              {/* Job Body */}
              <div style={{padding:'16px'}}>

                {/* Customer */}
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:11,color:c.text,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>
                    ग्राहक / Customer
                  </div>
                  <div style={{fontSize:26,fontWeight:900,color:'#0d1f3c'}}>{job.customer}</div>
                </div>

                {/* Car */}
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:11,color:c.text,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>
                    गाड़ी / Car
                  </div>
                  <div style={{fontSize:20,fontWeight:800,color:'#0d1f3c'}}>{job.car}</div>
                  {job.fileNo && <div style={{fontSize:12,color:'#8892a4',marginTop:2}}>{job.fileNo}</div>}
                </div>

                {/* Location */}
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:11,color:c.text,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>
                    {job.isPickup ? 'पिकअप जगह / Pickup Location' : 'ड्रॉप जगह / Drop Location'}
                  </div>
                  <div style={{fontSize:20,fontWeight:800,color:'#0d1f3c'}}>{job.location}</div>
                </div>

                {/* Phone */}
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:11,color:c.text,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>
                    फोन / Phone
                  </div>
                  <a href={`tel:${job.phone}`} style={{
                    display:'inline-flex', alignItems:'center', gap:10,
                    background:c.border, color:'#fff', padding:'12px 20px',
                    borderRadius:12, textDecoration:'none', fontWeight:800, fontSize:18
                  }}>
                    📞 {job.phone}
                  </a>
                </div>

                {/* Listen Buttons */}
                <div style={{borderTop:`1px solid ${c.border}40`, paddingTop:14, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
                  <button onClick={() => handleSpeak(job,'hi')} style={{
                    padding:'12px 8px', background: speaking===job.id+'hi' ? c.border : 'rgba(0,0,0,0.05)',
                    border:`1.5px solid ${c.border}`, borderRadius:10, cursor:'pointer',
                    fontWeight:700, fontSize:13, color: speaking===job.id+'hi' ? '#fff' : c.text
                  }}>
                    {speaking===job.id+'hi' ? '⏸ रुकें' : '🔊 हिंदी में सुनें'}
                  </button>
                  <button onClick={() => handleSpeak(job,'en')} style={{
                    padding:'12px 8px', background: speaking===job.id+'en' ? c.border : 'rgba(0,0,0,0.05)',
                    border:`1.5px solid ${c.border}`, borderRadius:10, cursor:'pointer',
                    fontWeight:700, fontSize:13, color: speaking===job.id+'en' ? '#fff' : c.text
                  }}>
                    {speaking===job.id+'en' ? '⏸ Stop' : '🔊 Listen (English)'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{textAlign:'center',padding:'10px 16px'}}>
        <div style={{fontSize:12,color:'rgba(255,255,255,0.25)'}}>Sainik Cars 🇮🇳 · Auto-refreshes every minute</div>
      </div>
    </div>
  )
}