import { useEffect, useRef, useState } from 'react'
import { Camera, Download, Minus, Plus, QrCode, X, Layers, Package } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import QRCodeLib from 'qrcode'
import { useEppFirestore } from '../hooks/useEppFirestore'

type QRMode = 'scan' | 'generate' | null
type QRType = 'category' | 'epp'
type QRData = {
  type: QRType
  id: string
}

export default function QRManager() {
  const { items, updateEpp } = useEppFirestore()
  const [mode, setMode] = useState<QRMode>(null)
  const [scanning, setScanning] = useState(false)
  const [scannedData, setScannedData] = useState<QRData | null>(null)
  const [editingStock, setEditingStock] = useState<{ [key: string]: number }>({})
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [qrType, setQrType] = useState<QRType>('epp')
  const scannerRef = useRef<Html5Qrcode | null>(null)

  // Parsear QR escaneado
  const parseQRData = (qrText: string): QRData | null => {
    try {
      const parsed = JSON.parse(qrText)
      if (parsed.type && parsed.id) {
        return parsed as QRData
      }
    } catch {
      // Formato antiguo: solo el ID del EPP
      return { type: 'epp', id: qrText }
    }
    return null
  }

  const scannedItem = scannedData?.type === 'epp' 
    ? items.find((item) => item.eppId === scannedData.id)
    : null
  
  const scannedCategoryItems = scannedData?.type === 'category'
    ? items.filter((item) => item.category === scannedData.id)
    : []

  const categories = Array.from(new Set(items.map((item) => item.category)))

  const filteredItems = selectedCategory === 'all' 
    ? items 
    : items.filter((item) => item.category === selectedCategory)

  useEffect(() => {
    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop()
      }
    }
  }, [])

  const startScanning = async () => {
    try {
      const html5QrCode = new Html5Qrcode('qr-reader')
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // QR escaneado exitosamente
          const parsed = parseQRData(decodedText)
          if (parsed) {
            setScannedData(parsed)
            setScanning(false)
            html5QrCode.stop()
          }
        },
        () => {
          // Error de escaneo (ignorar)
        }
      )
      setScanning(true)
    } catch (err) {
      console.error('Error starting scanner:', err)
      alert('No se pudo acceder a la cámara. Verifica los permisos.')
    }
  }

  const stopScanning = () => {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop()
      setScanning(false)
    }
  }

  const handleStockChange = (variantId: string, change: number) => {
    setEditingStock((prev) => ({
      ...prev,
      [variantId]: (prev[variantId] || 0) + change,
    }))
  }

  const handleSaveStock = async () => {
    if (scannedData?.type === 'epp' && scannedItem) {
      // Actualizar un solo EPP
      const updates: any = {}

      if (scannedItem.multiSize) {
        updates.sizeVariants = scannedItem.sizeVariants.map((variant) => ({
          ...variant,
          stockActual: Math.max(0, variant.stockActual + (editingStock[variant.id] || 0)),
        }))
      } else {
        updates.stockActual = Math.max(0, (scannedItem.stockActual || 0) + (editingStock['single'] || 0))
      }

      const result = await updateEpp(scannedItem.id, updates)
      
      if (result.success) {
        alert('Stock actualizado correctamente')
        setScannedData(null)
        setEditingStock({})
      } else {
        alert(result.error || 'Error al actualizar stock')
      }
    } else if (scannedData?.type === 'category' && scannedCategoryItems.length > 0) {
      // Actualizar múltiples EPP de una categoría
      let successCount = 0
      
      for (const item of scannedCategoryItems) {
        const itemKey = `item-${item.id}`
        const hasChanges = editingStock[itemKey] !== undefined && editingStock[itemKey] !== 0
        
        if (hasChanges) {
          const updates: any = {}
          
          if (item.multiSize) {
            updates.sizeVariants = item.sizeVariants.map((variant) => ({
              ...variant,
              stockActual: Math.max(0, variant.stockActual + (editingStock[`${itemKey}-${variant.id}`] || 0)),
            }))
          } else {
            updates.stockActual = Math.max(0, (item.stockActual || 0) + (editingStock[itemKey] || 0))
          }
          
          const result = await updateEpp(item.id, updates)
          if (result.success) successCount++
        }
      }
      
      alert(`Stock actualizado para ${successCount} EPP(s)`)
      setScannedData(null)
      setEditingStock({})
    }
  }

  const generateQRCode = async (data: QRData): Promise<string> => {
    try {
      const qrData = JSON.stringify(data)
      return await QRCodeLib.toDataURL(qrData, {
        width: 300,
        margin: 2,
      })
    } catch (err) {
      console.error('Error generating QR:', err)
      return ''
    }
  }

  const downloadAllQRs = async () => {
    if (qrType === 'epp') {
      // Descargar QR por cada EPP
      for (const item of filteredItems) {
        const qrDataUrl = await generateQRCode({ type: 'epp', id: item.eppId })
        const link = document.createElement('a')
        link.href = qrDataUrl
        link.download = `QR_EPP_${item.eppId}_${item.name}.png`
        link.click()
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    } else {
      // Descargar QR por cada categoría
      const categoriesToDownload = selectedCategory === 'all' ? categories : [selectedCategory]
      for (const category of categoriesToDownload) {
        const qrDataUrl = await generateQRCode({ type: 'category', id: category })
        const link = document.createElement('a')
        link.href = qrDataUrl
        link.download = `QR_CATEGORIA_${category}.png`
        link.click()
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-4xl border border-white/70 bg-white/95 p-8 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur dark:border-dracula-current dark:bg-dracula-bg/95">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-300 dark:text-dracula-cyan">Gestión QR</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-800 dark:text-dracula-foreground">Escanear y generar códigos QR</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-dracula-comment">
            Escanea códigos QR para editar stock rápidamente o genera QR para tus EPP de bodega.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <button
            onClick={() => setMode('scan')}
            className="flex flex-col items-center gap-4 rounded-3xl border border-celeste-200/70 bg-celeste-50/40 p-8 transition hover:border-celeste-300 hover:bg-celeste-50/60"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-celeste-100">
              <Camera className="h-8 w-8 text-celeste-500" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-slate-800">Escanear QR</h3>
              <p className="mt-1 text-sm text-slate-500">Edita stock escaneando códigos QR</p>
            </div>
          </button>

          <button
            onClick={() => setMode('generate')}
            className="flex flex-col items-center gap-4 rounded-3xl border border-mint-200/70 bg-mint-50/40 p-8 transition hover:border-mint-300 hover:bg-mint-50/60"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-mint-100">
              <QrCode className="h-8 w-8 text-mint-500" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-slate-800">Generar QR</h3>
              <p className="mt-1 text-sm text-slate-500">Crea códigos QR para tus EPP</p>
            </div>
          </button>
        </div>
      </section>

      {/* Modal Escanear QR */}
      {mode === 'scan' && (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
          <div className="flex min-h-screen items-start justify-center px-4 py-10 sm:px-6 lg:py-16">
            <div className="relative w-full max-w-2xl rounded-[28px] border border-white/70 bg-white/95 px-6 py-8 shadow-[0_40px_80px_-50px_rgba(15,23,42,0.6)] sm:px-8 lg:px-10 lg:py-10">
              <button
                type="button"
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-soft-gray-200/80 text-slate-500 transition hover:border-celeste-200 hover:text-slate-700"
                onClick={() => {
                  stopScanning()
                  setMode(null)
                  setScannedData(null)
                  setEditingStock({})
                }}
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-6">
                <h3 className="text-2xl font-semibold text-slate-800">Escanear código QR</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Apunta la cámara al código QR del EPP para editar su stock
                </p>
              </div>

              {!scannedData ? (
                <div className="space-y-4">
                  <div id="qr-reader" className="overflow-hidden rounded-2xl"></div>
                  {!scanning && (
                    <button
                      onClick={startScanning}
                      className="w-full rounded-full bg-gradient-to-r from-celeste-200/80 via-white to-mint-200/70 px-6 py-3 text-sm font-semibold text-slate-700 shadow-md transition hover:shadow-lg"
                    >
                      <Camera className="mr-2 inline h-4 w-4" />
                      Iniciar escaneo
                    </button>
                  )}
                  {scanning && (
                    <button
                      onClick={stopScanning}
                      className="w-full rounded-full border border-rose-200/70 bg-white px-6 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                    >
                      Detener escaneo
                    </button>
                  )}
                </div>
              ) : scannedData.type === 'epp' && scannedItem ? (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-celeste-200/70 bg-celeste-50/40 p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-400">
                      {scannedItem.eppId}
                    </p>
                    <h4 className="mt-2 text-xl font-semibold text-slate-800">{scannedItem.name}</h4>
                    <p className="text-sm text-slate-500">{scannedItem.category}</p>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-sm font-semibold text-slate-700">Ajustar stock</h5>
                    {scannedItem.multiSize ? (
                      scannedItem.sizeVariants.map((variant) => (
                        <div
                          key={variant.id}
                          className="flex items-center justify-between rounded-2xl border border-soft-gray-200/70 bg-white p-4"
                        >
                          <div>
                            <p className="font-semibold text-slate-700">{variant.label}</p>
                            <p className="text-sm text-slate-500">Stock actual: {variant.stockActual}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleStockChange(variant.id, -1)}
                              className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-200/70 bg-white text-rose-500 transition hover:bg-rose-50"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-12 text-center text-lg font-semibold text-slate-800">
                              {editingStock[variant.id] > 0 ? '+' : ''}
                              {editingStock[variant.id] || 0}
                            </span>
                            <button
                              onClick={() => handleStockChange(variant.id, 1)}
                              className="flex h-10 w-10 items-center justify-center rounded-full border border-mint-200/70 bg-white text-mint-500 transition hover:bg-mint-50"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-between rounded-2xl border border-soft-gray-200/70 bg-white p-4">
                        <div>
                          <p className="font-semibold text-slate-700">Stock único</p>
                          <p className="text-sm text-slate-500">Stock actual: {scannedItem.stockActual || 0}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleStockChange('single', -1)}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-200/70 bg-white text-rose-500 transition hover:bg-rose-50"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-12 text-center text-lg font-semibold text-slate-800">
                            {editingStock['single'] > 0 ? '+' : ''}
                            {editingStock['single'] || 0}
                          </span>
                          <button
                            onClick={() => handleStockChange('single', 1)}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-mint-200/70 bg-white text-mint-500 transition hover:bg-mint-50"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setScannedData(null)
                        setEditingStock({})
                      }}
                      className="flex-1 rounded-full border border-soft-gray-300 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-soft-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveStock}
                      className="flex-1 rounded-full bg-gradient-to-r from-mint-200/80 via-white to-celeste-200/70 px-6 py-3 text-sm font-semibold text-slate-700 shadow-md transition hover:shadow-lg"
                    >
                      Guardar cambios
                    </button>
                  </div>
                </div>
              ) : scannedData.type === 'category' && scannedCategoryItems.length > 0 ? (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-purple-200/70 bg-purple-50/40 p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-400">
                      CATEGORÍA
                    </p>
                    <h4 className="mt-2 text-xl font-semibold text-slate-800">{scannedData.id}</h4>
                    <p className="text-sm text-slate-500">{scannedCategoryItems.length} EPP(s) encontrados</p>
                  </div>

                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    <h5 className="text-sm font-semibold text-slate-700">Ajustar stock por EPP</h5>
                    {scannedCategoryItems.map((item) => {
                      const itemKey = `item-${item.id}`
                      return (
                        <div key={item.id} className="rounded-2xl border border-soft-gray-200/70 bg-white p-4 space-y-3">
                          <div>
                            <p className="font-semibold text-slate-700">{item.name}</p>
                            <p className="text-xs text-slate-500">{item.eppId}</p>
                          </div>
                          {item.multiSize ? (
                            <div className="space-y-2">
                              {item.sizeVariants.map((variant) => (
                                <div key={variant.id} className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm text-slate-600">{variant.label}</p>
                                    <p className="text-xs text-slate-500">Stock: {variant.stockActual}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleStockChange(`${itemKey}-${variant.id}`, -1)}
                                      className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-200/70 bg-white text-rose-500 transition hover:bg-rose-50"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </button>
                                    <span className="w-10 text-center text-sm font-semibold text-slate-800">
                                      {editingStock[`${itemKey}-${variant.id}`] > 0 ? '+' : ''}
                                      {editingStock[`${itemKey}-${variant.id}`] || 0}
                                    </span>
                                    <button
                                      onClick={() => handleStockChange(`${itemKey}-${variant.id}`, 1)}
                                      className="flex h-8 w-8 items-center justify-center rounded-full border border-mint-200/70 bg-white text-mint-500 transition hover:bg-mint-50"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-slate-500">Stock actual: {item.stockActual || 0}</p>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleStockChange(itemKey, -1)}
                                  className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-200/70 bg-white text-rose-500 transition hover:bg-rose-50"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-10 text-center text-sm font-semibold text-slate-800">
                                  {editingStock[itemKey] > 0 ? '+' : ''}
                                  {editingStock[itemKey] || 0}
                                </span>
                                <button
                                  onClick={() => handleStockChange(itemKey, 1)}
                                  className="flex h-8 w-8 items-center justify-center rounded-full border border-mint-200/70 bg-white text-mint-500 transition hover:bg-mint-50"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setScannedData(null)
                        setEditingStock({})
                      }}
                      className="flex-1 rounded-full border border-soft-gray-300 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-soft-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveStock}
                      className="flex-1 rounded-full bg-gradient-to-r from-mint-200/80 via-white to-celeste-200/70 px-6 py-3 text-sm font-semibold text-slate-700 shadow-md transition hover:shadow-lg"
                    >
                      Guardar cambios
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 p-6 text-center">
                  <p className="text-sm text-rose-600">
                    {scannedData?.type === 'epp' ? 'EPP no encontrado' : 'Categoría sin EPP'}
                  </p>
                  <button
                    onClick={() => {
                      setScannedData(null)
                      startScanning()
                    }}
                    className="mt-4 text-sm font-semibold text-celeste-500 hover:text-celeste-600"
                  >
                    Escanear otro código
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Generar QR */}
      {mode === 'generate' && (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
          <div className="flex min-h-screen items-start justify-center px-4 py-10 sm:px-6 lg:py-16">
            <div className="relative w-full max-w-6xl rounded-[28px] border border-white/70 bg-white/95 px-6 py-8 shadow-[0_40px_80px_-50px_rgba(15,23,42,0.6)] sm:px-8 lg:px-10 lg:py-10">
              <button
                type="button"
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-soft-gray-200/80 text-slate-500 transition hover:border-celeste-200 hover:text-slate-700"
                onClick={() => setMode(null)}
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-6">
                <h3 className="text-2xl font-semibold text-slate-800">Generar códigos QR</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Descarga códigos QR para imprimir y pegar en tu bodega
                </p>
              </div>

              {/* Selector de tipo de QR */}
              <div className="mb-6 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => setQrType('epp')}
                  className={`flex items-center gap-3 rounded-2xl border p-4 transition ${
                    qrType === 'epp'
                      ? 'border-celeste-300 bg-celeste-50/60 dark:border-dracula-cyan dark:bg-dracula-cyan/10'
                      : 'border-soft-gray-200/70 bg-white hover:border-celeste-200 dark:border-dracula-current dark:bg-dracula-bg'
                  }`}
                >
                  <Package className={`h-5 w-5 ${qrType === 'epp' ? 'text-celeste-500 dark:text-dracula-cyan' : 'text-slate-400'}`} />
                  <div className="text-left">
                    <p className={`text-sm font-semibold ${qrType === 'epp' ? 'text-slate-800 dark:text-dracula-foreground' : 'text-slate-600'}`}>
                      QR por EPP
                    </p>
                    <p className="text-xs text-slate-500 dark:text-dracula-comment">Un QR por cada equipo</p>
                  </div>
                </button>
                <button
                  onClick={() => setQrType('category')}
                  className={`flex items-center gap-3 rounded-2xl border p-4 transition ${
                    qrType === 'category'
                      ? 'border-purple-300 bg-purple-50/60 dark:border-dracula-purple dark:bg-dracula-purple/10'
                      : 'border-soft-gray-200/70 bg-white hover:border-purple-200 dark:border-dracula-current dark:bg-dracula-bg'
                  }`}
                >
                  <Layers className={`h-5 w-5 ${qrType === 'category' ? 'text-purple-500 dark:text-dracula-purple' : 'text-slate-400'}`} />
                  <div className="text-left">
                    <p className={`text-sm font-semibold ${qrType === 'category' ? 'text-slate-800 dark:text-dracula-foreground' : 'text-slate-600'}`}>
                      QR por Categoría
                    </p>
                    <p className="text-xs text-slate-500 dark:text-dracula-comment">Un QR por categoría</p>
                  </div>
                </button>
              </div>

              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="rounded-2xl border border-soft-gray-200/70 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
                >
                  <option value="all">Todas las categorías</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <button
                  onClick={downloadAllQRs}
                  disabled={(qrType === 'epp' && filteredItems.length === 0) || (qrType === 'category' && categories.length === 0)}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-mint-200/80 via-white to-celeste-200/70 px-6 py-3 text-sm font-semibold text-slate-700 shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Descargar todos ({qrType === 'epp' ? filteredItems.length : (selectedCategory === 'all' ? categories.length : 1)})
                </button>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {qrType === 'epp' ? (
                  filteredItems.map((item) => (
                    <QRCardEPP key={item.id} item={item} generateQRCode={generateQRCode} />
                  ))
                ) : (
                  (selectedCategory === 'all' ? categories : [selectedCategory]).map((category) => (
                    <QRCardCategory key={category} category={category} itemCount={items.filter(i => i.category === category).length} generateQRCode={generateQRCode} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Componente para QR de EPP individual
function QRCardEPP({ item, generateQRCode }: { item: any; generateQRCode: (data: QRData) => Promise<string> }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')

  useEffect(() => {
    generateQRCode({ type: 'epp', id: item.eppId }).then(setQrDataUrl)
  }, [item.eppId, generateQRCode])

  const downloadQR = () => {
    const link = document.createElement('a')
    link.href = qrDataUrl
    link.download = `QR_${item.eppId}_${item.name}.png`
    link.click()
  }

  return (
    <div className="rounded-3xl border border-soft-gray-200/70 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-center rounded-2xl bg-soft-gray-50 p-4">
        {qrDataUrl && <img src={qrDataUrl} alt={`QR ${item.eppId}`} className="h-48 w-48" />}
      </div>
      <div className="mb-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-400">{item.eppId}</p>
        <h4 className="mt-1 text-sm font-semibold text-slate-800">{item.name}</h4>
        <p className="text-xs text-slate-500">{item.category}</p>
      </div>
      <button
        onClick={downloadQR}
        className="w-full rounded-full border border-celeste-200/70 bg-white px-4 py-2 text-sm font-semibold text-celeste-600 transition hover:bg-celeste-50"
      >
        <Download className="mr-2 inline h-3.5 w-3.5" />
        Descargar
      </button>
    </div>
  )
}

// Componente para QR de Categoría
function QRCardCategory({ category, itemCount, generateQRCode }: { category: string; itemCount: number; generateQRCode: (data: QRData) => Promise<string> }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')

  useEffect(() => {
    generateQRCode({ type: 'category', id: category }).then(setQrDataUrl)
  }, [category, generateQRCode])

  const downloadQR = () => {
    const link = document.createElement('a')
    link.href = qrDataUrl
    link.download = `QR_CATEGORIA_${category}.png`
    link.click()
  }

  return (
    <div className="rounded-3xl border border-purple-200/70 bg-purple-50/40 p-6 shadow-sm dark:border-dracula-purple/30 dark:bg-dracula-purple/10">
      <div className="mb-4 flex items-center justify-center rounded-2xl bg-white p-4 dark:bg-dracula-bg">
        {qrDataUrl && <img src={qrDataUrl} alt={`QR ${category}`} className="h-48 w-48" />}
      </div>
      <div className="mb-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-400 dark:text-dracula-purple">CATEGORÍA</p>
        <h4 className="mt-1 text-sm font-semibold text-slate-800 dark:text-dracula-foreground">{category}</h4>
        <p className="text-xs text-slate-500 dark:text-dracula-comment">{itemCount} EPP(s)</p>
      </div>
      <button
        onClick={downloadQR}
        className="w-full rounded-full border border-purple-200/70 bg-white px-4 py-2 text-sm font-semibold text-purple-600 transition hover:bg-purple-50 dark:border-dracula-purple/50 dark:bg-dracula-current dark:text-dracula-purple dark:hover:bg-dracula-purple/20"
      >
        <Download className="mr-2 inline h-3.5 w-3.5" />
        Descargar
      </button>
    </div>
  )
}
