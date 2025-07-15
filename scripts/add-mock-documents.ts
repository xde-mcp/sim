#!/usr/bin/env tsx

import crypto from 'node:crypto'
import { db } from '../apps/sim/db'
import { document } from '../apps/sim/db/schema'

const KNOWLEDGE_BASE_ID = 'df50277d-3acd-4dce-9045-c67e3a4d51a9'

const fileTypes = [
  { ext: 'pdf', mime: 'application/pdf' },
  { ext: 'txt', mime: 'text/plain' },
  { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { ext: 'md', mime: 'text/markdown' },
  { ext: 'json', mime: 'application/json' },
  { ext: 'csv', mime: 'text/csv' },
  { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
]

const categories = [
  'reports',
  'documentation',
  'policies',
  'procedures',
  'manuals',
  'guides',
  'research',
  'analysis',
  'presentations',
  'contracts',
  'specifications',
  'notes',
]

const subjects = [
  'financial',
  'technical',
  'operational',
  'strategic',
  'security',
  'compliance',
  'marketing',
  'sales',
  'hr',
  'legal',
  'training',
  'project',
  'customer',
  'product',
]

function generateRandomFilename(): string {
  const category = categories[Math.floor(Math.random() * categories.length)]
  const subject = subjects[Math.floor(Math.random() * subjects.length)]
  const fileType = fileTypes[Math.floor(Math.random() * fileTypes.length)]
  const number = Math.floor(Math.random() * 1000) + 1
  const year = 2023 + Math.floor(Math.random() * 2) // 2023 or 2024

  return `${category}-${subject}-${number}-${year}.${fileType.ext}`
}

function generateRandomFileSize(): number {
  // Generate file sizes between 1KB and 10MB
  return Math.floor(Math.random() * 10000000) + 1024
}

function generateRandomStats() {
  const chunkCount = Math.floor(Math.random() * 50) + 1
  const tokenCount = chunkCount * (Math.floor(Math.random() * 500) + 100)
  const characterCount = tokenCount * (Math.floor(Math.random() * 5) + 3)

  return { chunkCount, tokenCount, characterCount }
}

async function addMockDocuments(count: number) {
  console.log(`Adding ${count} mock documents to knowledge base ${KNOWLEDGE_BASE_ID}...`)

  const mockDocuments = []

  for (let i = 0; i < count; i++) {
    const filename = generateRandomFilename()
    const fileType = fileTypes.find((ft) => filename.endsWith(ft.ext)) || fileTypes[0]
    const stats = generateRandomStats()

    const uploadDate = new Date()
    uploadDate.setDate(uploadDate.getDate() - Math.floor(Math.random() * 365)) // Random date within last year

    mockDocuments.push({
      id: crypto.randomUUID(),
      knowledgeBaseId: KNOWLEDGE_BASE_ID,
      filename,
      fileUrl: `https://mock-storage.example.com/files/${filename}`,
      fileSize: generateRandomFileSize(),
      mimeType: fileType.mime,
      chunkCount: stats.chunkCount,
      tokenCount: stats.tokenCount,
      characterCount: stats.characterCount,
      processingStatus: 'completed',
      processingStartedAt: new Date(uploadDate.getTime() + 1000),
      processingCompletedAt: new Date(uploadDate.getTime() + 5000),
      processingError: null,
      enabled: Math.random() > 0.1, // 90% enabled, 10% disabled
      deletedAt: null,
      uploadedAt: uploadDate,
      tag1: Math.random() > 0.5 ? categories[Math.floor(Math.random() * categories.length)] : null,
      tag2: Math.random() > 0.7 ? subjects[Math.floor(Math.random() * subjects.length)] : null,
      tag3: null,
      tag4: null,
      tag5: null,
      tag6: null,
      tag7: null,
    })
  }

  // Insert in batches of 100
  const batchSize = 100
  for (let i = 0; i < mockDocuments.length; i += batchSize) {
    const batch = mockDocuments.slice(i, i + batchSize)
    await db.insert(document).values(batch)
    console.log(
      `Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(mockDocuments.length / batchSize)}`
    )
  }

  console.log(`✅ Successfully added ${count} mock documents!`)
}

// Get count from command line argument, default to 100
const count = Number.parseInt(process.argv[2]) || 100

addMockDocuments(count)
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
