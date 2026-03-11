import Papa from 'papaparse'

export interface ColumnStat {
  key: string
  min: number
  max: number
  avg: number
  sum: number
  count: number
  isNumeric: boolean
}

export interface AnalyticsResult {
  headers: string[]
  rows: Record<string, string>[]
  stats: ColumnStat[]
  rowCount: number
  colCount: number
  preview: Record<string, string>[]
}

export function parseAndAnalyze(csvText: string): AnalyticsResult {
  const parsed = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
  })

  const rows = parsed.data
  const headers = parsed.meta.fields || []

  const stats: ColumnStat[] = headers.map(key => {
    const numericValues = rows
      .map(r => parseFloat(String(r[key]).replace(/[,$%]/g, '')))
      .filter(v => !isNaN(v) && isFinite(v))

    const isNumeric = numericValues.length > rows.length * 0.5

    if (!isNumeric || numericValues.length === 0) {
      return { key, min: 0, max: 0, avg: 0, sum: 0, count: rows.length, isNumeric: false }
    }

    const sum = numericValues.reduce((a, b) => a + b, 0)
    return {
      key,
      min: Math.min(...numericValues),
      max: Math.max(...numericValues),
      avg: sum / numericValues.length,
      sum,
      count: numericValues.length,
      isNumeric: true,
    }
  })

  return {
    headers, rows, stats,
    rowCount: rows.length,
    colCount: headers.length,
    preview: rows.slice(0, 10)
  }
}

export function generateSampleCSV(): string {
  const bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
  const header = 'Bulan,Pendapatan,Pengguna,Transaksi,NilaiRataOrder,Churn'
  const rows = bulan.map((b, i) => {
    const rev = (10000 + i * 1200 + Math.random() * 3000).toFixed(0)
    const users = (500 + i * 45 + Math.random() * 100).toFixed(0)
    const txn = (200 + i * 20 + Math.random() * 50).toFixed(0)
    const aov = (Number(rev) / Number(txn)).toFixed(2)
    const churn = (5 - i * 0.2 + Math.random()).toFixed(2)
    return `${b},${rev},${users},${txn},${aov},${churn}`
  })
  return [header, ...rows].join('\n')
}