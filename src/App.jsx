import { useEffect, useMemo, useRef, useState } from 'react'
import Spline from '@splinetool/react-spline'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function uid() {
  const k = 'ta_user_id'
  let v = localStorage.getItem(k)
  if (!v) {
    v = crypto.randomUUID()
    localStorage.setItem(k, v)
  }
  return v
}

function Stat({ label, value }) {
  return (
    <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
      <div className="text-xs text-white/60">{label}</div>
      <div className="text-lg font-semibold text-white">{value}</div>
    </div>
  )
}

function Message({ role, content }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow/50 shadow-black/10 ${isUser ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white/10 text-white rounded-bl-sm border border-white/10'}`}>
        {content}
      </div>
    </div>
  )
}

export default function App() {
  const userId = useMemo(() => uid(), [])
  const [coins, setCoins] = useState(0)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hey traveler! I\'m your smart guide. Ask me anything — budget, safety, food, documents, packing. I speak English + Hindi.' }
  ])
  const [sending, setSending] = useState(false)
  const [tips, setTips] = useState([])
  const endRef = useRef(null)

  useEffect(() => {
    fetch(`${BACKEND}/api/init`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId }) })
      .then(r => r.json()).then(() => refreshCoins())
    fetch(`${BACKEND}/api/tips`).then(r => r.json()).then(d => setTips(d.tips || []))
  }, [userId])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  function refreshCoins() {
    fetch(`${BACKEND}/api/coins/${userId}`).then(r => r.json()).then(d => setCoins(d.coins || 0))
  }

  async function sendMessage(e) {
    e.preventDefault()
    if (!input.trim()) return
    const text = input
    setInput('')
    setMessages(m => [...m, { role: 'user', content: text }])
    setSending(true)
    try {
      const res = await fetch(`${BACKEND}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, message: text, locale: 'en' }) })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.reply }])
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: 'Connection issue — please try again.' }])
    } finally {
      setSending(false)
    }
  }

  async function earnCoins(action = 'daily_login', coins = 2, notes='') {
    const res = await fetch(`${BACKEND}/api/reward`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, action, coins, notes }) })
    const data = await res.json()
    setCoins(data.coins || 0)
  }

  async function redeem(feature, duration='1d') {
    const res = await fetch(`${BACKEND}/api/redeem`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, feature, duration }) })
    const data = await res.json()
    if (!data.ok) alert(data.error)
    else alert(`Unlocked ${feature} till ${new Date(data.expires_at).toLocaleString()}`)
    refreshCoins()
  }

  async function uploadImage(file) {
    const fd = new FormData()
    fd.append('user_id', userId)
    fd.append('file', file)
    const res = await fetch(`${BACKEND}/api/image`, { method: 'POST', body: fd })
    const data = await res.json()
    setMessages(m => [...m, { role: 'assistant', content: data.message || 'Image processed.' }])
  }

  async function uploadVoice(file) {
    const fd = new FormData()
    fd.append('user_id', userId)
    fd.append('file', file)
    const res = await fetch(`${BACKEND}/api/voice`, { method: 'POST', body: fd })
    const data = await res.json()
    setMessages(m => [...m, { role: 'assistant', content: data.reply || 'Voice processed.' }])
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="relative">
        <div className="h-[48vh] w-full overflow-hidden">
          <Spline scene="https://prod.spline.design/O-AdlP9lTPNz-i8a/scene.splinecode" style={{ width: '100%', height: '100%' }} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/0 via-slate-950/30 to-slate-950 pointer-events-none" />
        <div className="absolute inset-x-0 top-0 flex flex-col items-center justify-center h-[48vh] text-center px-6">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight drop-shadow-lg">Travel Assistant</h1>
          <p className="mt-3 text-white/80 max-w-2xl">Smart, friendly guidance for every travel problem — chat, voice and images. Premium features unlock with free coins.</p>
          <div className="mt-6 flex gap-3">
            <button onClick={() => earnCoins('daily_login', 2)} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20">Claim Daily +2</button>
            <button onClick={() => redeem('smart_itinerary', '1d')} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500">Unlock Premium (1d)</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 -mt-24 relative z-10">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat label="Coins" value={coins} />
          <Stat label="Premium" value="Free to unlock" />
          <Stat label="Modes" value="Chat • Voice • Image" />
          <Stat label="Languages" value="English • हिन्दी" />
        </div>

        {/* Chat + Side */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6">
            <div className="space-y-3 max-h-[55vh] overflow-auto pr-1">
              {messages.map((m, i) => <Message key={i} role={m.role} content={m.content} />)}
              <div ref={endRef} />
            </div>
            <form onSubmit={sendMessage} className="mt-4 flex items-center gap-2">
              <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything: budget, safety, local food..." className="flex-1 rounded-xl bg-white/10 border border-white/10 px-4 py-3 outline-none placeholder-white/50" />
              <button disabled={sending} className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50">Send</button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/70">
              {['Where should I travel?', 'My budget is low, what to do?', 'Is this place safe for girls?', 'What to pack?'].map((q,i) => (
                <button key={i} onClick={() => setInput(q)} className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10">{q}</button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <label className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 cursor-pointer">Upload Image
                <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files[0] && uploadImage(e.target.files[0])} />
              </label>
              <label className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 cursor-pointer">Upload Voice
                <input type="file" className="hidden" accept="audio/*" onChange={e => e.target.files[0] && uploadVoice(e.target.files[0])} />
              </label>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <h3 className="font-semibold">Daily Tips</h3>
              <ul className="mt-2 space-y-2 text-sm text-white/80">
                {tips.map((t, i) => (
                  <li key={i} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                    <div className="font-medium">{t.title}</div>
                    <div className="text-white/70">{t.body}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-700/20 border border-emerald-500/30 rounded-2xl p-4">
              <h3 className="font-semibold">Earn Coins Free</h3>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <button onClick={() => earnCoins('watch_ad', 5, 'rewarded')} className="px-3 py-2 rounded-lg bg-white/10 border border-white/10">Watch Ad +5</button>
                <button onClick={() => earnCoins('task', 3, 'complete profile')} className="px-3 py-2 rounded-lg bg-white/10 border border-white/10">Complete Task +3</button>
                <button onClick={() => earnCoins('streak', 4)} className="px-3 py-2 rounded-lg bg-white/10 border border-white/10">Streak +4</button>
                <button onClick={() => earnCoins('upload_content', 6)} className="px-3 py-2 rounded-lg bg-white/10 border border-white/10">Upload Travel Post +6</button>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <h3 className="font-semibold">Quick Tools</h3>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <a href="#" onClick={(e)=>{e.preventDefault(); setInput('My plan is confusing, fix it.')}} className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-center">Fix Plan</a>
                <a href="#" onClick={(e)=>{e.preventDefault(); setInput('Find cheap food nearby.')}} className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-center">Cheap Food</a>
                <a href="#" onClick={(e)=>{e.preventDefault(); setInput('Emergency: I\'m scared, please guide.')}} className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-center">SOS Help</a>
                <a href="#" onClick={(e)=>{e.preventDefault(); setInput('Translate to Hindi: Where is the bus stop?')}} className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-center">Translator</a>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-10 text-white/60 text-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div>Made for travelers • Premium experience • Coins unlock everything</div>
          <div className="flex gap-2">
            <button onClick={()=>setInput('Suggest local places, food, culture.')} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">Suggest Locals</button>
            <button onClick={()=>setInput('Budget optimizer for 5 days, 2 people in a city.')} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">Budget Optimizer</button>
          </div>
        </div>
      </footer>
    </div>
  )
}
