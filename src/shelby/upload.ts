import { shelbyClient } from './client'

export interface UploadResult {
  blobId: string
  fileName: string
  sizeBytes: number
  uploadedAt: number
}

export async function uploadFile(
  file: File,
  onProgress?: (pct: number) => void
): Promise<UploadResult> {
  const arrayBuffer = await file.arrayBuffer()
  const data = new Uint8Array(arrayBuffer)

  // Buka payment channel di Aptos
  await shelbyClient.openPaymentChannel()

  // Tulis blob ke jaringan penyimpanan Shelby
  const blobId = await shelbyClient.writeBlob({ data, durationDays: 30, onProgress })

  const result: UploadResult = {
    blobId,
    fileName: file.name,
    sizeBytes: file.size,
    uploadedAt: Date.now(),
  }

  // Simpan riwayat upload ke localStorage
  const history = getUploadHistory()
  history.unshift(result)
  localStorage.setItem('shelby_uploads', JSON.stringify(history.slice(0, 20)))

  return result
}

export function getUploadHistory(): UploadResult[] {
  try {
    const raw = localStorage.getItem('shelby_uploads')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function removeFromHistory(blobId: string) {
  const history = getUploadHistory().filter(u => u.blobId !== blobId)
  localStorage.setItem('shelby_uploads', JSON.stringify(history))
}