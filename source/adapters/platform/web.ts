/**
 * Web implementation of PlatformPort using browser APIs.
 */
import type { PlatformPort, FileDialogOptions, FileHandle, MessageBoxOptions, MessageBoxResult } from '../../application/ports/PlatformPort'

export class WebPlatformServices implements PlatformPort {
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
          resolve({ name: file.name, path: file.name, content })
        } else {
          resolve(null)
        }
      }

      ;(input as any).oncancel = () => resolve(null)
      input.click()
    })
  }

  async showSaveDialog(options: FileDialogOptions): Promise<string | null> {
    try {
      const w = window as any
      if (w.showSaveFilePicker) {
        const handle = await w.showSaveFilePicker({
          suggestedName: options.defaultPath || 'untitled',
          types: options.filters?.map((f: any) => ({ description: f.name, accept: { 'application/octet-stream': f.extensions.map((e: string) => `.${e}`) } }))
        })
        return (handle as any).name || options.defaultPath || 'untitled'
      }
    } catch {
      // fall back to prompt
    }
    const filename = prompt(options.title || 'Save file as:', options.defaultPath || 'untitled')
    return filename
  }

  async readFile(_path: string): Promise<ArrayBuffer> {
    throw new Error('Reading arbitrary file paths not supported in web environment')
  }

  async writeFile(path: string, content: ArrayBuffer): Promise<void> {
    try {
      const w = window as any
      if (w.showSaveFilePicker) {
        const handle = await w.showSaveFilePicker({ suggestedName: path })
        const writable = await handle.createWritable()
        await writable.write(content)
        await writable.close()
        return
      }
    } catch {
      // fallback to download
    }
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
    window.close()
  }
}

