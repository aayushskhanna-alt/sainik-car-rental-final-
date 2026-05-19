import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import DriverView from './DriverView.jsx'
import CustomerPortal from './CustomerPortal.jsx'

const path = window.location.pathname

const getView = () => {
  if (path === '/driver') return <DriverView />
  if (path === '/admin') return <App />
  return <CustomerPortal />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {getView()}
  </StrictMode>,
)
