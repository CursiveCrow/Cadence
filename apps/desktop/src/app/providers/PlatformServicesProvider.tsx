import React from 'react'
import { PlatformServicesContext, createPlatformServices } from '@cadence/platform-services'

export const PlatformServicesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const services = React.useMemo(() => createPlatformServices(), [])
    return (
        <PlatformServicesContext.Provider value={services}>
            {children}
        </PlatformServicesContext.Provider>
    )
}


