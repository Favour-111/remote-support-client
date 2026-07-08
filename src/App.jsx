import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import UserPage from './pages/User'
import SupportPage from './pages/Support'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/user" element={<UserPage />} />
        <Route path="/support" element={<SupportPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
