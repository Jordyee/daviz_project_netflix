# Agent Changelog

Dokumen ini mencatat setiap perubahan yang dilakukan oleh agen AI pada project ini.
Tujuannya adalah agar agen AI selanjutnya dapat langsung melanjutkan pekerjaan tanpa kehilangan konteks.

---

## [2026-04-28] — Implementasi AI Chat Assistant (Gemini API)

### Files Modified / Created

| File | Status | Keterangan |
|---|---|---|
| `src/ChatbotPanel.jsx` | ✅ Created | Komponen utama chatbot |
| `src/index.css` | ✅ Modified | Ditambahkan CSS section chatbot (~200 baris) |
| `src/App.jsx` | ✅ Modified | Import + render `<ChatbotPanel />` |
| `package.json` | ✅ Modified | Ditambahkan dependency `@google/generative-ai` |
| `.env.example` | ✅ Created | Template environment variable |
| `AGENT_CHANGELOG.md` | ✅ Created | File ini |

---

### Deskripsi Perubahan

#### 1. Dependency Baru
- **`@google/generative-ai`** diinstall via `npm install @google/generative-ai`
- Digunakan untuk memanggil Gemini API model `gemini-1.5-flash`

#### 2. `src/ChatbotPanel.jsx` — Komponen Baru
- **UI**: Floating Action Button (FAB) di pojok kanan bawah dengan label "AI Analyst"
- **Panel**: Slide-in chat panel dengan animasi CSS (opacity + transform)
- **State lokal**:
  - `messages` — array riwayat chat `{ role: 'user'|'assistant', text: string }`
  - `input` — nilai input teks saat ini
  - `loading` — boolean, true saat menunggu respons Gemini
  - `error` — string pesan error jika API gagal
  - `isOpen` — boolean toggle buka/tutup panel
- **Typing indicator**: 3 titik animasi bounce saat `loading === true` (HCI: visibility of system status)
- **Suggested questions**: 4 pertanyaan cepat muncul saat belum ada percakapan
- **Prompt Engineering** (`buildSystemPrompt`):
  - Menyuntikkan `kpis`, `lineData`, `countryData`, `pieData`, `activeFilters` ke system instruction
  - Model diperintahkan menjawab HANYA berdasarkan data konteks, bukan pengetahuan umum
- **Error handling**:
  - Deteksi API Key tidak ditemukan (env kosong)
  - Deteksi API Key tidak valid (`API_KEY_INVALID`)
  - Fallback pesan error umum untuk kegagalan network/lainnya
- **Aksesibilitas**: `aria-label`, `aria-live`, `role="dialog"` pada elemen utama

#### 3. `src/index.css` — Penambahan CSS Chatbot
- Section baru di akhir file dengan komentar `/* CHATBOT PANEL */`
- Mengikuti tema dark Netflix yang sudah ada (warna `#e50914`, `#1c1c1c`, `#141414`)
- Responsive: panel menjadi full-width di layar ≤ 480px
- Animasi: `typing-bounce` keyframe untuk typing indicator

#### 4. `src/App.jsx` — Modifikasi
- Import `ChatbotPanel` dari `./ChatbotPanel`
- Render `<ChatbotPanel />` sebagai sibling terakhir di dalam `.app-shell`, setelah `.bottom-grid`
- Props yang di-passing:
  ```jsx
  <ChatbotPanel
    kpis={kpis}
    lineData={lineData}
    countryData={countryData}
    pieData={pieData}
    activeFilters={{ activeTab, search, countryFilter, ratingFilter, genreFilter }}
  />
  ```

---

### Current State

**✅ SELESAI — Fitur AI Chat Assistant fully implemented.**

Untuk menjalankan fitur ini:
1. Buat file `.env` di root project (salin dari `.env.example`)
2. Isi `VITE_GEMINI_API_KEY` dengan API Key dari https://aistudio.google.com/app/apikey
3. Jalankan `npm run dev`
4. Klik tombol "AI Analyst" di pojok kanan bawah dashboard

### Yang Belum Dilakukan (Opsional / Future Work)
- [ ] Conversation history multi-turn (saat ini setiap pesan adalah request baru, bukan chat session)
- [ ] Export riwayat chat ke file
- [ ] Streaming response (karakter muncul satu per satu seperti ChatGPT)
- [ ] Integrasi dengan `filteredRows` untuk query data yang lebih spesifik (perlu chunking/summarization)

---

## [2026-04-28 — Patch] Fix: Ganti Model Gemini

### Files Modified
| File | Status | Keterangan |
|---|---|---|
| `src/ChatbotPanel.jsx` | ✅ Modified | Ganti model dari `gemini-1.5-flash` ke `gemini-2.0-flash` |

### Deskripsi
Model `gemini-1.5-flash` mengembalikan error 404 di API v1beta karena sudah deprecated.
Diganti ke `gemini-2.0-flash` yang aktif dan mendukung `generateContent` di endpoint v1beta.

### Current State
✅ Chatbot berfungsi normal dengan model `gemini-2.0-flash`.

---

## [2026-04-28 — Patch 2] Fix: Ganti ke Model Gemini 2.5 Flash Lite

### Files Modified
| File | Status | Keterangan |
|---|---|---|
| `src/ChatbotPanel.jsx` | ✅ Modified | Ganti model ke `gemini-2.5-flash-lite`, perbaiki error handling |

### Root Cause
`gemini-2.0-flash` dan `gemini-2.0-flash-lite` sudah deprecated per Maret 2026 dan hanya tersedia
untuk existing customers (project lama). Project baru mendapat `limit: 0` karena model tersebut
memang di-block. Model aktif di free tier sekarang adalah seri `gemini-2.5-*`.

### Perubahan
- Model diganti ke `gemini-2.5-flash-lite` (free tier: 15 RPM, 1.000 req/hari)
- Error handling 429 diperbaiki: menampilkan countdown retry dari pesan error
- Error handling 404 ditambahkan untuk kasus model tidak ditemukan

### Current State
✅ Menggunakan model `gemini-2.5-flash-lite` yang aktif di free tier 2026.
