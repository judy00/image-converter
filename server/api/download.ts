import { defineEventHandler, getQuery } from 'h3'
import { promises as fs } from 'fs'
import path from 'path'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const filePath = query.path as string
  const fileName = query.filename as string

  if (!filePath || !fileName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing file path or file name',
    })
  }

  // Basic security check: ensure the file is within the temp directory
  const absoluteFilePath = path.resolve(filePath)
  const tempDir = path.resolve(process.cwd(), 'temp')

  if (!absoluteFilePath.startsWith(tempDir)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: Access to this file is not allowed',
    })
  }

  try {
    const fileBuffer = await fs.readFile(absoluteFilePath)

    // Set headers for file download
    event.node.res.setHeader('Content-Type', 'application/zip')
    event.node.res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`) // Use original filename
    event.node.res.setHeader('Content-Length', fileBuffer.length)

    return fileBuffer
  } catch (error) {
    console.error(`Error downloading file ${filePath}:`, error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Could not download file',
    })
  }
})
