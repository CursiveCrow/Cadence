export type EditSession = {
  onCommit: (value: string) => void
  type?: 'text' | 'number'
}

export class TextInputManager {
  private input: HTMLInputElement | null = null
  private session: EditSession | null = null

  constructor() {
    this.ensure()
  }

  private ensure() {
    if (this.input) return
    const input = document.createElement('input')
    input.type = 'text'
    Object.assign(input.style, {
      position: 'absolute',
      opacity: '0',
      pointerEvents: 'none',
      zIndex: '0',
      left: '0px',
      top: '0px',
      width: '1px',
      height: '1px'
    })
    document.body.appendChild(input)

    input.addEventListener('blur', () => {
      if (this.session) {
        try { this.session.onCommit(input.value) } catch {}
        this.session = null
      }
    })

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        try { (e.target as HTMLInputElement).blur() } catch {}
      }
      if (e.key === 'Escape') {
        this.session = null
        try { (e.target as HTMLInputElement).blur() } catch {}
      }
    })

    this.input = input
  }

  beginEdit(session: EditSession, initialValue: string = '') {
    this.ensure()
    if (!this.input) return
    this.session = session
    this.input.value = initialValue
    try { this.input.focus() } catch {}
  }

  destroy() {
    if (this.input) {
      try { document.body.removeChild(this.input) } catch {}
      this.input = null
    }
    this.session = null
  }
}

