/* eslint-disable no-console */
import 'dotenv/config'

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
// Idéalement, il faut une clé Service Role dans .env pour bypasser les RLS et supprimer des fichiers
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const BUCKET = 'game-images'

async function listFolders(parentFolder = '') {
  const { data, error } = await supabase.storage.from(BUCKET).list(parentFolder, {
    limit: 100,
  })

  if (error) throw error

  // Les dossiers n'ont pas d'ID contrairement aux fichiers
  return data.filter((item) => !item.id).map((item) => item.name)
}

async function listFiles(folderPath) {
  const { data, error } = await supabase.storage.from(BUCKET).list(folderPath, {
    limit: 1000,
  })

  if (error) throw error

  return data
    .filter((item) => item.id && item.name !== '.emptyFolderPlaceholder')
    .map((file) => `${folderPath}/${file.name}`)
}

async function processFile(filePath) {
  const ext = filePath.split('.').pop().toLowerCase()

  if (ext === 'webp') {
    return // Déjà converti
  }

  console.log(`Processing: ${filePath}`)

  try {
    // 1. Download
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(filePath)
    if (downloadError) throw downloadError

    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 2. Convert to WebP
    const webpBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer()

    // 3. Upload new WebP file
    const newFilePath = filePath.substring(0, filePath.lastIndexOf('.')) + '.webp'
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(newFilePath, webpBuffer, {
        contentType: 'image/webp',
        upsert: true,
      })

    if (uploadError) throw uploadError

    // 4. Remove old file
    const { error: removeError } = await supabase.storage.from(BUCKET).remove([filePath])
    if (removeError) throw removeError

    console.log(`✅ Converted & Replaced: ${newFilePath}`)
  } catch (err) {
    console.error(`❌ Error processing ${filePath}:`, err.message)
  }
}

async function migrateBucket() {
  console.log(`🚀 Starting WebP migration for bucket: ${BUCKET}...`)

  // On récupère les dossiers racines (qui correspondent aux ID des utilisateurs)
  const userFolders = await listFolders('')
  console.log(`Found ${userFolders.length} user folders.`)

  for (const folder of userFolders) {
    console.log(`Scanning folder: ${folder}`)
    const files = await listFiles(folder)

    for (const filePath of files) {
      await processFile(filePath)
    }
  }

  console.log('✨ Migration finished!')
}

migrateBucket().catch(console.error)
