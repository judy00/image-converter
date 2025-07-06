import sharp from 'sharp'
import { defineEventHandler, readMultipartFormData } from 'h3'
import * as fs from 'fs'
import { promises as fsp } from 'fs'
import path from 'path'
import archiver from 'archiver'

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)

  if (!formData) {
    return { success: false, message: 'No files uploaded.' }
  }

  const processedImages: any[] = []
  const desktopImages: { name: string, buffer: Buffer }[] = []
  const mobileImages: { name: string, buffer: Buffer }[] = []

  const tempDir = path.join('/tmp', Date.now().toString())
  await fsp.mkdir(tempDir, { recursive: true })

  for (const item of formData) {
    if (item.name === 'files' && item.data) {
      const originalFileName = item.filename || 'unknown'
      const originalFileSize = item.data.length
      const startTime = process.hrtime.bigint()

      try {
        const image = sharp(item.data)

        // Process for desktop version
        const desktopBuffer = await image
          .clone()
          .resize({ width: 1000 })
          .webp({ quality: 100, effort: 6, lossless: false })
          .toBuffer()
        const desktopSize = desktopBuffer.length
        const desktopRatio = ((1 - desktopSize / originalFileSize) * 100).toFixed(2)
        desktopImages.push({ name: originalFileName.replace(/\.(jpg|jpeg|png)$/i, '.webp'), buffer: desktopBuffer })

        // Process for mobile version
        const mobileBuffer = await image
          .clone()
          .resize({ width: 700 })
          .webp({ quality: 100, effort: 6, lossless: false })
          .toBuffer()
        const mobileSize = mobileBuffer.length
        const mobileRatio = ((1 - mobileSize / originalFileSize) * 100).toFixed(2)
        mobileImages.push({ name: originalFileName.replace(/\.(jpg|jpeg|png)$/i, '.webp'), buffer: mobileBuffer })

        const endTime = process.hrtime.bigint()
        const processingTimeMs = Number(endTime - startTime) / 1_000_000

        processedImages.push({
          name: originalFileName,
          originalSize: originalFileSize,
          desktop: {
            size: desktopSize,
            ratio: desktopRatio,
            time: processingTimeMs.toFixed(2),
          },
          mobile: {
            size: mobileSize,
            ratio: mobileRatio,
            time: processingTimeMs.toFixed(2),
          },
        })
      } catch (error: any) {
        console.error(`Error processing ${originalFileName}:`, error)
        processedImages.push({
          name: originalFileName,
          error: error.message,
        })
      }
    }
  }

  // Create ZIP files
  const desktopZipPath = path.join(tempDir, 'desktop_images.zip')
  const mobileZipPath = path.join(tempDir, 'mobile_images.zip')

  await createZipArchive(desktopImages, desktopZipPath)
  await createZipArchive(mobileImages, mobileZipPath)

  // Clean up temp directory after a delay (e.g., 1 hour)
  setTimeout(async () => {
    try {
      await fsp.rm(tempDir, { recursive: true, force: true })
      console.log(`Cleaned up temporary directory: ${tempDir}`)
    } catch (err) {
      console.error(`Error cleaning up temporary directory ${tempDir}:`, err)
    }
  }, 3600 * 1000) // 1 hour

  return {
    success: true,
    processedImages,
    desktopZipUrl: `/api/download?path=${encodeURIComponent(desktopZipPath)}&filename=desktop_images.zip`,
    mobileZipUrl: `/api/download?path=${encodeURIComponent(mobileZipPath)}&filename=mobile_images.zip`,
  }
})

async function createZipArchive(files: { name: string, buffer: Buffer }[], outputPath: string) {
  return new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(outputPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => {
      console.log(`Zip archive created: ${outputPath} (${archive.pointer()} bytes)`) // Log the size of the created zip file
      resolve()
    })

    archive.on('error', (err) => {
      reject(err)
    })

    archive.pipe(output)

    files.forEach((file) => {
      archive.append(file.buffer, { name: file.name })
    })

    archive.finalize()
  })
}
