import { defineStore } from 'pinia'

export const useImageStore = defineStore('image', {
  state: () => ({
    selectedFiles: [] as Array<{
      file: File,
      name: string,
      size: string,
      preview: string,
      processed?: {
        desktop: {
          size: string,
          ratio: string,
          time: string,
        },
        mobile: {
          size: string,
          ratio: string,
          time: string,
        }
      },
      error?: string
    }>,
    processing: false,
    desktopZipUrl: null as string | null,
    mobileZipUrl: null as string | null,
  }),
  actions: {
    addFile(file: File) {
      if (file.type === 'image/jpeg' || file.type === 'image/png') {
        this.selectedFiles.push({
          file: file,
          name: file.name,
          size: (file.size / 1024).toFixed(2) + ' KB',
          preview: URL.createObjectURL(file)
        })
      } else {
        throw new Error(`Unsupported file type: ${file.name}. Only JPG, JPEG, PNG are allowed.`)
      }
    },
    setProcessing(status: boolean) {
      this.processing = status
    },
    updateFileProcessingResult(fileName: string, result: any) {
      const index = this.selectedFiles.findIndex(f => f.name === fileName)
      if (index !== -1) {
        this.selectedFiles[index].processed = result
      }
    },
    updateFileError(fileName: string, error: string) {
      const index = this.selectedFiles.findIndex(f => f.name === fileName)
      if (index !== -1) {
        this.selectedFiles[index].error = error
      }
    },
    setZipUrls(desktopUrl: string, mobileUrl: string) {
      this.desktopZipUrl = desktopUrl
      this.mobileZipUrl = mobileUrl
    },
    clearFiles() {
      this.selectedFiles = []
      this.desktopZipUrl = null
      this.mobileZipUrl = null
    }
  },
  getters: {
    // You can add getters here if needed
  }
})
