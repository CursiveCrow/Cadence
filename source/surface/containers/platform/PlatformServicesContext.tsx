import React from 'react'
import type { PlatformServices } from '../../../infrastructure/platform/services/interfaces'

export const PlatformServicesContext = React.createContext<PlatformServices | null>(null)

