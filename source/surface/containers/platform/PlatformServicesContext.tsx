import React from 'react'
import type { PlatformPort as PlatformServices } from '../../../application/ports/PlatformPort'

export const PlatformServicesContext = React.createContext<PlatformServices | null>(null)
