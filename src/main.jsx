import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Kiosk from './kiosk/Kiosk.jsx'
import AdminApp from './admin/AdminApp.jsx'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="*" element={<Kiosk />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
