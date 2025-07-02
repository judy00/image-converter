<script setup>
import { ref } from 'vue'
import { useImageStore } from '~/stores/image'
import { storeToRefs } from 'pinia'

const imageStore = useImageStore()
const { selectedFiles, processing, desktopZipUrl, mobileZipUrl } = storeToRefs(imageStore)
const fileInput = ref(null)

const handleFileChange = (event) => {
  const files = event.target.files
  if (files) {
    for (let i = 0; i < files.length; i++) {
      try {
        imageStore.addFile(files[i])
      } catch (e) {
        alert(e.message)
      }
    }
  }
}

const handleDrop = (event) => {
  event.preventDefault()
  const files = event.dataTransfer.files
  if (files) {
    for (let i = 0; i < files.length; i++) {
      try {
        imageStore.addFile(files[i])
      } catch (e) {
        alert(e.message)
      }
    }
  }
}

const handleDragOver = (event) => {
  event.preventDefault()
}

const handleDragLeave = (event) => {
  // Optional: add visual feedback for drag leave
}

const processImages = async () => {
  imageStore.setProcessing(true)
  const formData = new FormData()
  imageStore.selectedFiles.forEach(file => {
    formData.append('files', file.file, file.name)
  })

  try {
    const response = await fetch('/api/convert', {
      method: 'POST',
      body: formData,
    })
    const result = await response.json()

    if (result.success) {
      result.processedImages.forEach((processedImage) => {
        imageStore.updateFileProcessingResult(processedImage.name, {
          desktop: {
            size: (processedImage.desktop.size / 1024).toFixed(2) + ' KB',
            ratio: processedImage.desktop.ratio + '%',
            time: processedImage.desktop.time + ' ms',
          },
          mobile: {
            size: (processedImage.mobile.size / 1024).toFixed(2) + ' KB',
            ratio: processedImage.mobile.ratio + '%',
            time: processedImage.mobile.time + ' ms',
          }
        })
      })
      // Store zip URLs in the store for easy access
      imageStore.setZipUrls(result.desktopZipUrl, result.mobileZipUrl)
    } else {
      alert(`Error: ${result.message}`)
    }
  } catch (error) {
    console.error('Error processing images:', error)
    alert('An error occurred during image processing.')
  } finally {
    imageStore.setProcessing(false)
  }
}

const downloadFile = (url, filename) => {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <h1 class="text-4xl font-bold mb-8">圖片批次轉換工具</h1>

    <div
      class="w-full max-w-3xl border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @click="fileInput?.click()"
    >
      <input
        type="file"
        ref="fileInput"
        multiple
        accept=".jpg,.jpeg,.png"
        class="hidden"
        @change="handleFileChange"
      />
      <p class="text-lg">拖曳圖片到此處，或點擊選擇檔案</p>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">支援 JPG, JPEG, PNG 格式</p>
    </div>

    <div v-if="imageStore.selectedFiles.length > 0" class="mt-8 w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div v-for="(file, index) in imageStore.selectedFiles" :key="index" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col items-center">
        <img :src="file.preview" :alt="file.name" class="w-24 h-24 object-cover rounded-md mb-2" />
        <p class="text-sm font-medium truncate w-full text-center">{{ file.name }}</p>
        <p class="text-xs text-gray-600 dark:text-gray-400">原始大小: {{ file.size }}</p>
        <div v-if="file.processed" class="mt-2 text-left w-full">
          <p class="text-xs font-semibold">桌機版:</p>
          <p class="text-xs">大小: {{ file.processed.desktop.size }}</p>
          <p class="text-xs">壓縮比: {{ file.processed.desktop.ratio }}</p>
          <p class="text-xs">處理時間: {{ file.processed.desktop.time }}</p>
          <p class="text-xs font-semibold mt-1">手機版:</p>
          <p class="text-xs">大小: {{ file.processed.mobile.size }}</p>
          <p class="text-xs">壓縮比: {{ file.processed.mobile.ratio }}</p>
          <p class="text-xs">處理時間: {{ file.processed.mobile.time }}</p>
        </div>
        <p v-if="file.error" class="text-xs text-red-500 mt-2">錯誤: {{ file.error }}</p>
      </div>
    </div>

    <div v-if="imageStore.selectedFiles.length > 0" class="mt-8 flex space-x-4">
      <button
        class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        @click="processImages"
        :disabled="imageStore.processing"
      >
        {{ imageStore.processing ? '處理中...' : '開始處理' }}
      </button>
      <button
        v-if="imageStore.desktopZipUrl"
        class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        @click="downloadFile(imageStore.desktopZipUrl, 'desktop_images.zip')"
      >
        下載所有桌機版圖片 (ZIP)
      </button>
      <button
        v-if="imageStore.mobileZipUrl"
        class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        @click="downloadFile(imageStore.mobileZipUrl, 'mobile_images.zip')"
      >
        下載所有手機版圖片 (ZIP)
      </button>
    </div>
  </div>
</template>

<style>
/* Basic global styles for UnoCSS */
body {
  font-family: sans-serif;
}
</style>
