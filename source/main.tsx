/**
 * Main Application Entry Point
 * Bootstrap the Cadence application
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { CadenceMain } from './surface/components/CadenceMain'
import { seedDemoData } from './infrastructure/seed/demoData'
import './index.css'

// Initialize demo project if needed
const DEMO_PROJECT_ID = 'demo-project-1'

// Seed demo data
seedDemoData(DEMO_PROJECT_ID)

// Get root element
const rootElement = document.getElementById('root')
if (!rootElement) {
    throw new Error('Root element not found')
}

// Create React root and render application
const root = ReactDOM.createRoot(rootElement)
root.render(
    <React.StrictMode>
        <CadenceMain initialProjectId={DEMO_PROJECT_ID} />
    </React.StrictMode>
)
