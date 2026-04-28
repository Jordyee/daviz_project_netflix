import { useEffect, useRef, useState } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'

const SUGGESTED_QUESTIONS = [
  'Apa insight utama dari data ini?',
  'Jelaskan tren pada line chart',
  'Negara mana yang paling dominan?',
  'Kapan nilai tertinggi terjadi?',
]

function buildSystemPrompt(kpis, lineData, countryData, pieData, activeFilters) {
  return `Anda adalah seorang Senior Data Analyst. Tugas Anda adalah menjawab pertanyaan pengguna HANYA berdasarkan konteks data dashboard Netflix berikut ini. Jangan berhalusinasi atau memberikan informasi di luar data ini.

KONTEKS DATA SAAT INI (Filter Aktif: ${JSON.stringify(activeFilters)}):
1. KPI Summary: ${JSON.stringify(kpis)}
2. Tren Rilis per Tahun (Line Chart): ${JSON.stringify(lineData)}
3. Top 10 Negara (Bar Chart): ${JSON.stringify(countryData)}
4. Distribusi Konten (Pie Chart): ${JSON.stringify(pieData)}

Aturan Menjawab:
- Berikan jawaban yang singkat, padat, dan langsung menjawab pertanyaan analitis.
- Jelaskan tren, nilai tertinggi/terendah, atau insight utama jika diminta.
- Gunakan format yang mudah dibaca (boleh gunakan poin-poin jika perlu).
- Jika pengguna bertanya di luar konteks data Netflix ini, tolak dengan sopan dan ingatkan bahwa Anda hanya asisten dashboard ini.`
}

export default function ChatbotPanel({ kpis, lineData, countryData, pieData, activeFilters }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Halo! Saya adalah AI Analyst untuk dashboard Netflix ini. Tanyakan apa saja tentang data yang sedang ditampilkan.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY

  const sendMessage = async (userText) => {
    const trimmed = userText.trim()
    if (!trimmed || loading) return

    if (!apiKey) {
      setError('API Key tidak ditemukan. Pastikan VITE_GEMINI_API_KEY sudah diset di file .env')
      return
    }

    setError('')
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }])
    setLoading(true)

    try {
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash-lite',
        systemInstruction: buildSystemPrompt(kpis, lineData, countryData, pieData, activeFilters),
      })

      const result = await model.generateContent(trimmed)
      const responseText = result.response.text()

      setMessages((prev) => [...prev, { role: 'assistant', text: responseText }])
    } catch (err) {
      const message =
        err?.message?.includes('API_KEY_INVALID') || err?.message?.includes('API key not valid')
          ? 'API Key tidak valid. Periksa kembali nilai VITE_GEMINI_API_KEY Anda.'
          : err?.message?.includes('429') || err?.message?.includes('quota')
          ? (() => {
              const retryMatch = err.message.match(/retry in ([\d.]+)s/i)
              const retryInfo = retryMatch ? ` Coba lagi dalam ${Math.ceil(Number(retryMatch[1]))} detik.` : ''
              return `Quota API habis.${retryInfo} Jika terus terjadi, pastikan API Key dibuat dari project baru di Google AI Studio.`
            })()
          : err?.message?.includes('404') || err?.message?.includes('not found')
          ? `Model tidak ditemukan. Pastikan API Key Anda mendukung model terbaru Gemini.`
          : `Gagal mendapatkan respons: ${err.message}`
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleSuggestion = (question) => {
    sendMessage(question)
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        className="chatbot-fab"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Tutup AI Chat' : 'Buka AI Chat'}
        title={isOpen ? 'Tutup AI Chat' : 'Buka AI Chat'}
      >
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
        {!isOpen && <span className="chatbot-fab-label">AI Analyst</span>}
      </button>

      {/* Chat panel */}
      <div className={`chatbot-panel ${isOpen ? 'chatbot-panel--open' : ''}`} role="dialog" aria-label="AI Chat Assistant">
        <div className="chatbot-header">
          <div className="chatbot-header-info">
            <div className="chatbot-avatar">AI</div>
            <div>
              <p className="chatbot-title">Netflix AI Analyst</p>
              <p className="chatbot-subtitle">Powered by Gemini</p>
            </div>
          </div>
          <button
            className="chatbot-close-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Tutup chat"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="chatbot-messages" aria-live="polite" aria-label="Riwayat percakapan">
          {messages.map((msg, i) => (
            <div key={i} className={`chatbot-message chatbot-message--${msg.role}`}>
              {msg.role === 'assistant' && <div className="chatbot-message-avatar">AI</div>}
              <div className="chatbot-bubble">
                {msg.text.split('\n').map((line, j) => (
                  <span key={j}>
                    {line}
                    {j < msg.text.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="chatbot-message chatbot-message--assistant">
              <div className="chatbot-message-avatar">AI</div>
              <div className="chatbot-bubble chatbot-bubble--typing" aria-label="AI sedang mengetik">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error banner */}
        {error && (
          <div className="chatbot-error" role="alert">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* Suggested questions — only show when no conversation yet */}
        {messages.length === 1 && !loading && (
          <div className="chatbot-suggestions">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button key={q} className="chatbot-suggestion-btn" onClick={() => handleSuggestion(q)}>
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input form */}
        <form className="chatbot-input-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="chatbot-input"
            placeholder="Tanyakan sesuatu tentang data..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            aria-label="Pesan untuk AI"
          />
          <button
            type="submit"
            className="chatbot-send-btn"
            disabled={loading || !input.trim()}
            aria-label="Kirim pesan"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </>
  )
}
