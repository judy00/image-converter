<script setup>
import { ref } from 'vue'
import { useImageStore } from '~/stores/image'
import { storeToRefs } from 'pinia'

const imageStore = useImageStore()
const { selectedFiles, processing, desktopZipUrl, mobileZipUrl } = storeToRefs(imageStore)
const fileInput = ref(null)

// 新增狀態
const dragActive = ref(false)
const toast = ref({ show: false, message: '', type: 'success' })

function showToast(message, type = 'success') {
  toast.value = { show: true, message, type }
  setTimeout(() => (toast.value.show = false), 2500)
}

const handleFileChange = (event) => {
  const files = event.target.files
  if (files) {
    for (let i = 0; i < files.length; i++) {
      try {
        imageStore.addFile(files[i])
        showToast(`已加入 ${files[i].name}`)
      } catch (e) {
        showToast(e.message, 'error')
      }
    }
  }
}

const handleDrop = (event) => {
  event.preventDefault()
  dragActive.value = false
  const files = event.dataTransfer.files
  if (files) {
    for (let i = 0; i < files.length; i++) {
      try {
        imageStore.addFile(files[i])
        showToast(`已加入 ${files[i].name}`)
      } catch (e) {
        showToast(e.message, 'error')
      }
    }
  }
}

const handleDragOver = (event) => {
  event.preventDefault()
  dragActive.value = true
}

const handleDragLeave = (event) => {
  dragActive.value = false
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
      imageStore.setZipUrls(result.desktopZipUrl, result.mobileZipUrl)
      showToast('圖片處理完成！', 'success')
    } else {
      showToast(`錯誤: ${result.message}`, 'error')
    }
  } catch (error) {
    console.error('Error processing images:', error)
    showToast('圖片處理時發生錯誤', 'error')
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
  showToast('開始下載...')
}

</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <!-- Toast -->
    <div v-if="toast.show" :class="['toast', toast.type]">
      {{ toast.message }}
    </div>
    <h1 class="text-4xl font-bold mb-8 tracking-tight">圖片批次轉換工具</h1>

    <div
      :class="['dropzone', dragActive ? 'dropzone--active' : '']"
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

      <div class="flex flex-col items-center justify-center p-4">
        <svg :class="['h-12 w-12', dragActive ? 'text-blue-600 animate-bounce' :
            'text-blue-400']" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g
            id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier"
            stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path
            d="M10 15H14M12 13V17M13 3H8.2C7.0799 3 6.51984 3 6.09202 3.21799C5.71569 3.40973
            5.40973 3.71569 5.21799 4.09202C5 4.51984 5 5.0799 5 6.2V17.8C5 18.9201 5 19.4802
            5.21799 19.908C5.40973 20.2843 5.71569 20.5903 6.09202 20.782C6.51984 21 7.0799 21 8.2
            21H15.8C16.9201 21 17.4802 21 17.908 20.782C18.2843 20.5903 18.5903 20.2843 18.782
            19.908C19 19.4802 19 18.9201 19 17.8V9M13 3L19 9M13 3V7.4C13 7.96005 13 8.24008 13.109
            8.45399C13.2049 8.64215 13.3578 8.79513 13.546 8.89101C13.7599 9 14.0399 9 14.6 9H19"
            stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round"></path> </g></svg>
        <p class="text-lg font-medium">拖曳圖片到此處，或點擊選擇檔案</p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-2 mb-2">支援 JPG, JPEG, PNG 格式</p>
      </div>
    </div>

    <div v-if="imageStore.selectedFiles.length > 0" class="mt-10 w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      <div v-for="(file, index) in imageStore.selectedFiles" :key="index" class="card bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 flex flex-col items-center transition-transform">
        <img :src="file.preview" :alt="file.name" class="w-24 h-24 object-cover rounded-md mb-2 shadow" />
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

    <div v-if="imageStore.selectedFiles.length > 0" class="mt-10 flex flex-wrap gap-4 justify-center">
      <button
        class="button"
        @click="processImages"
        :disabled="imageStore.processing"
      >
        <span v-if="imageStore.processing" class="spinner"></span>
        {{ imageStore.processing ? '處理中...' : '開始處理' }}
      </button>
      <button
        v-if="imageStore.desktopZipUrl"
        class="button green"
        @click="downloadFile(imageStore.desktopZipUrl, 'desktop_images.zip')"
      >
        下載所有桌機版圖片 (ZIP)
      </button>
      <button
        v-if="imageStore.mobileZipUrl"
        class="button green"
        @click="downloadFile(imageStore.mobileZipUrl, 'mobile_images.zip')"
      >
        下載所有手機版圖片 (ZIP)
      </button>
    </div>
  </div>
</template>

<style>
body {
  font-family: 'Inter', 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', Arial, sans-serif;
  background: #f6f8fa;
  color: #23272f;
}

.min-h-screen {
  min-height: 100vh;
  background: #f6f8fa;
}

h1 {
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: -1px;
  color: #1a237e;
  margin-bottom: 2rem;
}

.dropzone {
  width: 100%;
  max-width: 440px;
  min-height: 140px;
  border: 2px dashed #b0bec5;
  background: #fff;
  border-radius: 16px;
  margin: 16px 0;
  transition: border-color 0.2s, box-shadow 0.2s;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(30, 41, 59, 0.04);
}
.dropzone--active {
  border-color: #1976d2;
  box-shadow: 0 4px 16px rgba(25, 118, 210, 0.10);
}

.card {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(30, 41, 59, 0.06);
  padding: 1.2rem 1rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: box-shadow 0.15s, transform 0.15s;
}
.card:hover {
  box-shadow: 0 6px 24px rgba(25, 118, 210, 0.10);
  transform: translateY(-2px) scale(1.01);
}

img {
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(30, 41, 59, 0.08);
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
  padding: 0.7em 2em;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 999px;
  background: #1976d2;
  color: #fff;
  border: none;
  outline: none;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.08);
  transition: background 0.18s, box-shadow 0.18s, transform 0.12s;
}
.button:hover:not(:disabled) {
  background: #1565c0;
  box-shadow: 0 4px 16px rgba(25, 118, 210, 0.14);
  transform: translateY(-1px) scale(1.02);
}
.button:active:not(:disabled) {
  background: #0d47a1;
  transform: scale(0.98);
}
.button:disabled {
  background: #b0bec5;
  color: #fff;
  cursor: not-allowed;
  opacity: 0.7;
  box-shadow: none;
}
.button.green {
  background: #00b894;
}
.button.green:hover:not(:disabled) {
  background: #00997a;
}
.button.green:active:not(:disabled) {
  background: #007a5e;
}

.spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2.5px solid #fff;
  border-top: 2.5px solid #1976d2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}
@keyframes spin { 100% { transform: rotate(360deg); } }

.toast {
  position: fixed;
  top: 32px;
  right: 32px;
  z-index: 100;
  padding: 14px 28px;
  border-radius: 8px;
  font-weight: 500;
  background: #fff;
  color: #1976d2;
  box-shadow: 0 2px 12px rgba(25, 118, 210, 0.10);
  border-left: 4px solid #1976d2;
  min-width: 220px;
  text-align: left;
  letter-spacing: 0.01em;
}
.toast.error {
  border-left: 4px solid #e53935;
  background: #fff0f0;
  color: #e53935;
}
.toast.success {
  border-left: 4px solid #00b894;
  background: #f0fff8;
  color: #00997a;
}

.text-xs, .text-sm, .text-md {
  color: #546e7a;
  font-size: 0.95em;
  font-weight: 400;
}
.font-semibold {
  font-weight: 600;
  color: #23272f;
}

.mt-10 { margin-top: 2.5rem; }
.mb-8 { margin-bottom: 2rem; }
.gap-4 { gap: 1rem; }
.gap-6 { gap: 1.5rem; }

@media (max-width: 640px) {
  .card { padding: 1rem 0.5rem; }
  .dropzone { max-width: 98vw; }
}
</style>
