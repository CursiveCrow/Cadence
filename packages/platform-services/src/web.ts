/**
 * Web API implementation of platform services
 */

import { PlatformServices, FileDialogOptions, FileHandle, MessageBoxOptions, MessageBoxResult } from './interfaces'

/**
 * Web implementation using browser APIs
 * Fallback for when running in web environment
 */
export class WebPlatformServices implements PlatformServices {
  async showOpenDialog(options: FileDialogOptions): Promise<FileHandle | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = false
      
      if (options.filters && options.filters.length > 0) {
        const extensions = options.filters.flatMap(f => f.extensions.map(ext => `.${ext}`))
        input.accept = extensions.join(',')
      }

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          const content = await file.arrayBuffer()
          resolve({
            name: file.name,
            path: file.name, // Web doesn't have real paths
            content
          })
        } else {
          resolve(null)
        }
      }

      input.oncancel = () => resolve(null)
      input.click()
    })
  }

  async showSaveDialog(options: FileDialogOptions): Promise<string | null> {
    // Web implementation would use File System Access API or fallback to download
    // This is a simplified version
    const filename = prompt(options.title || 'Save file as:', options.defaultPath || 'untitled')
    return filename
  }

  async readFile(_path: string): Promise<ArrayBuffer> {
    // Web can't read arbitrary paths, this is a placeholder
    throw new Error('Reading arbitrary file paths not supported in web environment')
  }

  async writeFile(path: string, content: ArrayBuffer): Promise<void> {
    // Web implementation using download
    const blob = new Blob([content])
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = path
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async showMessageBox(options: MessageBoxOptions): Promise<MessageBoxResult> {
    // Web fallback using browser dialogs
    if (options.type === 'question' && options.buttons && options.buttons.length === 2) {
      const result = confirm(`${options.title}\n\n${options.message}`)
      return { response: result ? 0 : 1 }
    } else {
      alert(`${options.title}\n\n${options.message}`)
      return { response: 0 }
    }
  }

  async showErrorDialog(title: string, message: string): Promise<void> {
    alert(`${title}\n\n${message}`)
  }

  async getAppVersion(): Promise<string> {
    return 'web-version'
  }

  async quit(): Promise<void> {
    // Web can't quit, just close the tab
    window.close()
  }
}
