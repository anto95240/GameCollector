import './AdminDataEditor.css'

import { faFileExport, faFileImport, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Papa from 'papaparse'
import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

export default function AdminDataEditor() {
  const [data, setData] = useState<any[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [fileName, setFileName] = useState('data.csv')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const STORAGE_KEY = 'admin_data_editor_save'

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.data && parsed.headers && parsed.fileName) {
          setData(parsed.data)
          setHeaders(parsed.headers)
          setFileName(parsed.fileName)
        }
      } catch (err) {
        console.error('Failed to parse saved editor data', err)
      }
    }
  }, [])

  // Save to local storage whenever data changes
  useEffect(() => {
    if (data.length > 0 || headers.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, headers, fileName }))
    }
  }, [data, headers, fileName])

  const handleClearData = () => {
    if (window.confirm('Voulez-vous vraiment effacer toutes les données ?')) {
      setData([])
      setHeaders([])
      setFileName('data.csv')
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.meta.fields) {
          setHeaders(results.meta.fields)
        }
        setData(results.data)
      },
    })
  }

  const handleCellChange = (rowIndex: number, header: string, value: string) => {
    const newData = [...data]
    newData[rowIndex][header] = value
    setData(newData)
  }

  const handleExport = () => {
    const csv = Papa.unparse(data)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', fileName)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const addRow = () => {
    const newRow: any = {}
    headers.forEach((h) => (newRow[h] = ''))
    setData([...data, newRow])
  }

  const removeRow = (index: number) => {
    const newData = [...data]
    newData.splice(index, 1)
    setData(newData)
  }

  return (
    <div className="admin-editor-container">
      <header className="admin-editor-header">
        <Link to="/admin" className="admin-back-link">
          ← Retour à l'administration
        </Link>
        <h1>📊 Éditeur de Données</h1>
        <p>Importez, visualisez, modifiez et exportez des fichiers CSV.</p>

        <div className="admin-editor-actions">
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <button className="admin-btn primary" onClick={() => fileInputRef.current?.click()}>
            <FontAwesomeIcon icon={faFileImport} /> Importer CSV
          </button>

          {data.length > 0 && (
            <>
              <button className="admin-btn success" onClick={handleExport}>
                <FontAwesomeIcon icon={faFileExport} /> Exporter CSV
              </button>
              <button className="admin-btn danger" onClick={handleClearData}>
                <FontAwesomeIcon icon={faTrash} /> Vider
              </button>
            </>
          )}
        </div>
      </header>

      {data.length > 0 ? (
        <div className="admin-editor-table-wrapper">
          <table className="admin-editor-table">
            <thead>
              <tr>
                {headers.map((header, idx) => {
                  const isSticky = ['name', 'title', 'nom', 'titre'].includes(header.toLowerCase())
                  return (
                    <th key={idx} className={isSticky ? 'sticky-col' : ''}>
                      {header}
                    </th>
                  )
                })}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {headers.map((header, colIndex) => {
                    const isSticky = ['name', 'title', 'nom', 'titre'].includes(
                      header.toLowerCase()
                    )
                    return (
                      <td key={colIndex} className={isSticky ? 'sticky-col' : ''}>
                        <input
                          type="text"
                          value={row[header] || ''}
                          onChange={(e) => handleCellChange(rowIndex, header, e.target.value)}
                          className="admin-editor-input"
                        />
                      </td>
                    )
                  })}
                  <td className="admin-editor-actions-cell">
                    <button className="admin-btn danger small" onClick={() => removeRow(rowIndex)}>
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="admin-btn add-row" onClick={addRow}>
            <FontAwesomeIcon icon={faPlus} /> Ajouter une ligne
          </button>
        </div>
      ) : (
        <div className="admin-editor-empty">
          <p>Aucune donnée chargée. Importez un fichier CSV pour commencer.</p>
        </div>
      )}
    </div>
  )
}
