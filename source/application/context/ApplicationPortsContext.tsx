import React from 'react'
import type { PersistencePort } from '../ports/PersistencePort'

export type ApplicationPorts = { persistence: PersistencePort }

export const ApplicationPortsContext = React.createContext<ApplicationPorts | null>(null)

export function useApplicationPorts(): ApplicationPorts {
  const ctx = React.useContext(ApplicationPortsContext)
  if (!ctx) throw new Error('ApplicationPortsContext not provided')
  return ctx
}

