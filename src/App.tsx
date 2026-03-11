// src/App.tsx
import { useState, useCallback, useRef } from 'react'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { Upload, Database, TrendingUp, Table2, ChevronDown, Trash2, Download, Zap, Globe, Lock } from 'lucide-react'
import { uploadFile, getUploadHistory, removeFromHistory, type UploadResult } from './shelby/upload'
import { parseAndAnalyze, generateSampleCSV, type AnalyticsResult } from './analytics/process'

type ChartType = 'bar' | 'line' | 'area'
type ActiveTab = 'upload' | 'analyze' | 'history'

const ACCENT = '#00ff88'
const DIM = '#1a1a1a'
const BORDER = '#2a2a2a'

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toFixed(2)
}

function fmtBytes(b: number) {
  if (b >= 1_000_000) return (b / 1_000_000).toFixed(2) + ' MB'
  if (b >= 1_000) return (b / 1_000).toFixed(1) + ' KB'
  return b + ' B'
}

export default function App() {
  const [tab, setTab] = useState<ActiveTab>('upload')
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null)
  const [lastUpload, setLastUpload] = useState<UploadResult | null>(null)
  const [history, setHistory] = useState<UploadResult[]>(getUploadHistory)
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [selectedCol, setSelectedCol] = useState<string>('')
  const [dragOver, setDragOver] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setStatusMsg('⚠ Only CSV files supported')
      return
    }
    setUploading(true)
    setUploadPct(0)
    setStatusMsg('Opening payment channel on Aptos...')

    try {
      const result = await uploadFile(file, pct => {
        setUploadPct(pct)
        if (pct < 40) setStatusMsg('Erasure coding blob...')
        else if (pct < 80) setStatusMsg('Writing to Shelby storage providers...')
        else setStatusMsg('Committing to Aptos blockchain...')
      })

      setLastUpload(result)
      setHistory(getUploadHistory())
      setStatusMsg('✓ Stored on Shelby Protocol')

      // Also parse locally for instant analytics
      const text = await file.text()
      const result2 = parseAndAnalyze(text)
      setAnalytics(result2)
      setSelectedCol(result2.stats.find(s => s.isNumeric)?.key || result2.headers[1] || '')
      setTab('analyze')
    } catch (e) {
      setStatusMsg('Upload failed — check console')
      console.error(e)
    } finally {
      setUploading(false)
    }
  }, [])

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) processFile(f)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) processFile(f)
  }

  const loadSample = async () => {
    const csv = generateSampleCSV()
    const blob = new Blob([csv], { type: 'text/csv' })
    const file = new File([blob], 'sample-analytics.csv', { type: 'text/csv' })
    await processFile(file)
  }

  const deleteHistory = (blobId: string) => {
    removeFromHistory(blobId)
    setHistory(getUploadHistory())
  }

  const downloadSample = () => {
    const csv = generateSampleCSV()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'sample-analytics.csv'
    a.click()
  }

  const chartData = analytics?.rows.slice(0, 50).map(row => ({
    name: row[analytics.headers[0]] || '',
    value: parseFloat(String(row[selectedCol]).replace(/[,$%]/g, '')) || 0,
  })) || []

  const numericStats = analytics?.stats.filter(s => s.isNumeric) || []

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080808',
      color: '#e8e8e8',
      fontFamily: "'Syne', sans-serif",
    }}>
      {/* ── Header ── */}
      <header style={{
        borderBottom: `1px solid ${BORDER}`,
        padding: '0 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
        position: 'sticky',
        top: 0,
        background: 'rgba(8,8,8,0.95)',
        backdropFilter: 'blur(12px)',
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, background: ACCENT, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Database size={16} color="#080808" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.5px' }}>
            Shelby<span style={{ color: ACCENT }}>Grid</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 20,
            border: `1px solid ${BORDER}`, fontSize: 12,
            color: '#666', fontFamily: "'Space Mono', monospace"
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, boxShadow: `0 0 6px ${ACCENT}` }} />
            TESTNET
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 20,
            border: `1px solid ${BORDER}`, fontSize: 12, color: '#666',
          }}>
            <Globe size={12} />
            Shelby Protocol
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <div style={{
        borderBottom: `1px solid ${BORDER}`,
        padding: '3rem 2rem 2.5rem',
        background: 'linear-gradient(180deg, #0d0d0d 0%, #080808 100%)',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '4px 12px', borderRadius: 20, marginBottom: 16,
            background: 'rgba(0,255,136,0.08)', border: `1px solid rgba(0,255,136,0.2)`,
            fontSize: 11, color: ACCENT, fontFamily: "'Space Mono', monospace", letterSpacing: 1,
          }}>
            <Zap size={10} fill={ACCENT} /> DECENTRALIZED · ACCESSIBLE · TRUSTED
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, margin: '0 0 12px', lineHeight: 1.1, letterSpacing: '-2px' }}>
            Networked Data Storage,<br />
            <span style={{ color: ACCENT }}>&amp; Analytics</span>
          </h1>
          <p style={{ color: '#666', maxWidth: 520, lineHeight: 1.6, margin: 0, fontSize: 15 }}>
            Upload CSVs to Shelby Protocol's decentralized blob storage. Your data is erasure-coded, committed to Aptos, and available to anyone — forever.
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
            {[
              { icon: <Lock size={13} />, label: 'Tamper-proof on Aptos' },
              { icon: <Globe size={13} />, label: 'Globally distributed' },
              { icon: <Zap size={13} />, label: 'Micropayment reads' },
            ].map(b => (
              <div key={b.label} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8,
                border: `1px solid ${BORDER}`, fontSize: 12, color: '#888',
              }}>
                {b.icon}{b.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem' }}>

        {/* ── Tab nav ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${BORDER}`, paddingBottom: 0 }}>
          {([
            { id: 'upload', label: 'Upload', icon: <Upload size={14} /> },
            { id: 'analyze', label: 'Analyze', icon: <TrendingUp size={14} /> },
            { id: 'history', label: `History (${history.length})`, icon: <Database size={14} /> },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', borderRadius: '8px 8px 0 0',
              border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              fontFamily: "'Syne', sans-serif",
              background: tab === t.id ? DIM : 'transparent',
              color: tab === t.id ? ACCENT : '#555',
              borderBottom: tab === t.id ? `2px solid ${ACCENT}` : '2px solid transparent',
              transition: 'all 0.15s',
            }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── UPLOAD TAB ── */}
        {tab === 'upload' && (
          <div>
            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? ACCENT : BORDER}`,
                borderRadius: 16,
                padding: '4rem 2rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver ? 'rgba(0,255,136,0.04)' : DIM,
                transition: 'all 0.2s',
                marginBottom: 16,
              }}
            >
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={onFileInput} />
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: 'rgba(0,255,136,0.1)', border: `1px solid rgba(0,255,136,0.2)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <Upload size={24} color={ACCENT} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                {dragOver ? 'Drop to upload to Shelby' : 'Drop your CSV here'}
              </div>
              <div style={{ fontSize: 13, color: '#555' }}>
                or click to browse · CSV files only
              </div>

              {uploading && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 12, color: ACCENT, marginBottom: 8, fontFamily: "'Space Mono', monospace" }}>
                    {statusMsg}
                  </div>
                  <div style={{ height: 4, background: BORDER, borderRadius: 4, overflow: 'hidden', maxWidth: 300, margin: '0 auto' }}>
                    <div style={{
                      height: '100%', background: ACCENT, borderRadius: 4,
                      width: `${uploadPct}%`, transition: 'width 0.3s ease',
                      boxShadow: `0 0 8px ${ACCENT}`,
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 6, fontFamily: "'Space Mono', monospace" }}>
                    {uploadPct}%
                  </div>
                </div>
              )}

              {!uploading && statusMsg && (
                <div style={{ marginTop: 16, fontSize: 12, color: ACCENT, fontFamily: "'Space Mono', monospace" }}>
                  {statusMsg}
                </div>
              )}
            </div>

            {/* Blob ID result */}
            {lastUpload && !uploading && (
              <div style={{
                padding: '16px 20px', borderRadius: 12,
                background: 'rgba(0,255,136,0.06)', border: `1px solid rgba(0,255,136,0.2)`,
                marginBottom: 16,
              }}>
                <div style={{ fontSize: 11, color: ACCENT, marginBottom: 8, fontFamily: "'Space Mono', monospace", letterSpacing: 1 }}>
                  ✓ STORED ON SHELBY PROTOCOL
                </div>
                <div style={{ fontSize: 13, marginBottom: 4 }}><strong>{lastUpload.fileName}</strong> · {fmtBytes(lastUpload.sizeBytes)}</div>
                <div style={{ fontSize: 11, color: '#555', fontFamily: "'Space Mono', monospace", wordBreak: 'break-all' }}>
                  Blob ID: {lastUpload.blobId}
                </div>
              </div>
            )}

            {/* Sample data */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={loadSample} style={{
                flex: 1, padding: '12px 20px', borderRadius: 10,
                border: `1px solid ${BORDER}`, background: DIM,
                color: '#888', cursor: 'pointer', fontSize: 13,
                fontFamily: "'Syne', sans-serif", fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <Zap size={14} color={ACCENT} /> Load Sample Dataset
              </button>
              <button onClick={downloadSample} style={{
                padding: '12px 16px', borderRadius: 10,
                border: `1px solid ${BORDER}`, background: DIM,
                color: '#888', cursor: 'pointer', fontSize: 13,
                fontFamily: "'Syne', sans-serif",
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Download size={14} /> CSV Template
              </button>
            </div>
          </div>
        )}

        {/* ── ANALYZE TAB ── */}
        {tab === 'analyze' && (
          <div>
            {!analytics ? (
              <div style={{
                textAlign: 'center', padding: '4rem 2rem',
                border: `1px dashed ${BORDER}`, borderRadius: 16, color: '#444',
              }}>
                <TrendingUp size={40} style={{ marginBottom: 16, opacity: 0.3 }} />
                <div>Upload a CSV to see analytics here</div>
                <button onClick={() => setTab('upload')} style={{
                  marginTop: 16, padding: '10px 20px', borderRadius: 8,
                  border: `1px solid ${BORDER}`, background: 'transparent',
                  color: ACCENT, cursor: 'pointer', fontSize: 13,
                  fontFamily: "'Syne', sans-serif",
                }}>← Go upload a file</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                  {[
                    { label: 'Rows', value: analytics.rowCount.toLocaleString() },
                    { label: 'Columns', value: analytics.colCount },
                    { label: 'Numeric Cols', value: numericStats.length },
                    { label: 'Storage', value: 'Shelby Protocol' },
                  ].map(c => (
                    <div key={c.label} style={{
                      padding: '16px 20px', borderRadius: 12,
                      border: `1px solid ${BORDER}`, background: DIM,
                    }}>
                      <div style={{ fontSize: 11, color: '#555', marginBottom: 6, fontFamily: "'Space Mono', monospace", letterSpacing: 1 }}>
                        {c.label}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: ACCENT }}>{c.value}</div>
                    </div>
                  ))}
                </div>

                {/* Stats table */}
                {numericStats.length > 0 && (
                  <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, background: DIM, fontSize: 12, fontWeight: 700, color: '#888' }}>
                      COLUMN STATISTICS
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: "'Space Mono', monospace" }}>
                        <thead>
                          <tr style={{ background: '#111' }}>
                            {['Column', 'Min', 'Max', 'Avg', 'Sum', 'Count'].map(h => (
                              <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#555', fontWeight: 400, fontSize: 11, letterSpacing: 1 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {numericStats.map((s, i) => (
                            <tr key={s.key} style={{ borderTop: `1px solid ${BORDER}`, background: i % 2 === 0 ? 'transparent' : '#0d0d0d' }}>
                              <td style={{ padding: '10px 16px', color: ACCENT, fontWeight: 700 }}>{s.key}</td>
                              <td style={{ padding: '10px 16px', color: '#ccc' }}>{fmt(s.min)}</td>
                              <td style={{ padding: '10px 16px', color: '#ccc' }}>{fmt(s.max)}</td>
                              <td style={{ padding: '10px 16px', color: '#ccc' }}>{fmt(s.avg)}</td>
                              <td style={{ padding: '10px 16px', color: '#ccc' }}>{fmt(s.sum)}</td>
                              <td style={{ padding: '10px 16px', color: '#666' }}>{s.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Chart */}
                {numericStats.length > 0 && (
                  <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{
                      padding: '12px 16px', borderBottom: `1px solid ${BORDER}`,
                      background: DIM, display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#888' }}>VISUALIZATION</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {/* Column selector */}
                        <div style={{ position: 'relative' }}>
                          <select
                            value={selectedCol}
                            onChange={e => setSelectedCol(e.target.value)}
                            style={{
                              appearance: 'none', padding: '6px 32px 6px 12px',
                              borderRadius: 8, border: `1px solid ${BORDER}`,
                              background: '#111', color: '#ccc', fontSize: 12,
                              fontFamily: "'Space Mono', monospace", cursor: 'pointer',
                            }}
                          >
                            {numericStats.map(s => <option key={s.key} value={s.key}>{s.key}</option>)}
                          </select>
                          <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#555', pointerEvents: 'none' }} />
                        </div>

                        {/* Chart type */}
                        {(['bar', 'line', 'area'] as const).map(ct => (
                          <button key={ct} onClick={() => setChartType(ct)} style={{
                            padding: '6px 12px', borderRadius: 8,
                            border: `1px solid ${chartType === ct ? ACCENT : BORDER}`,
                            background: chartType === ct ? 'rgba(0,255,136,0.1)' : 'transparent',
                            color: chartType === ct ? ACCENT : '#555',
                            cursor: 'pointer', fontSize: 11,
                            fontFamily: "'Space Mono', monospace",
                          }}>{ct}</button>
                        ))}
                      </div>
                    </div>

                    <div style={{ padding: '20px 0 20px 0', background: '#0a0a0a' }}>
                      <ResponsiveContainer width="100%" height={300}>
                        {chartType === 'bar' ? (
                          <BarChart data={chartData} margin={{ left: 10, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                            <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 11, fontFamily: 'Space Mono' }} />
                            <YAxis tick={{ fill: '#555', fontSize: 11, fontFamily: 'Space Mono' }} />
                            <Tooltip contentStyle={{ background: '#111', border: `1px solid ${BORDER}`, borderRadius: 8, fontFamily: 'Space Mono', fontSize: 11 }} />
                            <Bar dataKey="value" fill={ACCENT} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        ) : chartType === 'line' ? (
                          <LineChart data={chartData} margin={{ left: 10, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                            <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 11, fontFamily: 'Space Mono' }} />
                            <YAxis tick={{ fill: '#555', fontSize: 11, fontFamily: 'Space Mono' }} />
                            <Tooltip contentStyle={{ background: '#111', border: `1px solid ${BORDER}`, borderRadius: 8, fontFamily: 'Space Mono', fontSize: 11 }} />
                            <Line type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={2} dot={{ fill: ACCENT, r: 3 }} />
                          </LineChart>
                        ) : (
                          <AreaChart data={chartData} margin={{ left: 10, right: 20 }}>
                            <defs>
                              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={ACCENT} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                            <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 11, fontFamily: 'Space Mono' }} />
                            <YAxis tick={{ fill: '#555', fontSize: 11, fontFamily: 'Space Mono' }} />
                            <Tooltip contentStyle={{ background: '#111', border: `1px solid ${BORDER}`, borderRadius: 8, fontFamily: 'Space Mono', fontSize: 11 }} />
                            <Area type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={2} fill="url(#areaGrad)" />
                          </AreaChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Data preview */}
                <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, background: DIM, fontSize: 12, fontWeight: 700, color: '#888', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Table2 size={13} /> DATA PREVIEW (first 10 rows)
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: "'Space Mono', monospace" }}>
                      <thead>
                        <tr style={{ background: '#111' }}>
                          {analytics.headers.map(h => (
                            <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#555', fontWeight: 400, fontSize: 11, letterSpacing: 1, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.preview.map((row, i) => (
                          <tr key={i} style={{ borderTop: `1px solid ${BORDER}`, background: i % 2 === 0 ? 'transparent' : '#0d0d0d' }}>
                            {analytics.headers.map(h => (
                              <td key={h} style={{ padding: '8px 16px', color: '#aaa', whiteSpace: 'nowrap' }}>{row[h]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === 'history' && (
          <div>
            {history.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '4rem 2rem',
                border: `1px dashed ${BORDER}`, borderRadius: 16, color: '#444',
              }}>
                <Database size={40} style={{ marginBottom: 16, opacity: 0.3 }} />
                <div>No uploads yet — upload a CSV to get started</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {history.map(item => (
                  <div key={item.blobId} style={{
                    padding: '16px 20px', borderRadius: 12,
                    border: `1px solid ${BORDER}`, background: DIM,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    flexWrap: 'wrap',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 14 }}>{item.fileName}</div>
                      <div style={{ fontSize: 11, color: '#555', fontFamily: "'Space Mono', monospace", wordBreak: 'break-all' }}>
                        {item.blobId}
                      </div>
                      <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>
                        {fmtBytes(item.sizeBytes)} · {new Date(item.uploadedAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteHistory(item.blobId)}
                      style={{
                        padding: '8px', borderRadius: 8,
                        border: `1px solid ${BORDER}`, background: 'transparent',
                        color: '#555', cursor: 'pointer', display: 'flex',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={{
        marginTop: '4rem', borderTop: `1px solid ${BORDER}`,
        padding: '24px 2rem', textAlign: 'center',
        fontSize: 12, color: '#333', fontFamily: "'Space Mono', monospace",
      }}>
        Built on Shelby Protocol · Data stored via Aptos blockchain · Decentralized &amp; permissionless
      </footer>
    </div>
  )
}