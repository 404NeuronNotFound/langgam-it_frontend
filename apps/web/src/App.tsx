import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from '@/pages/LoginPage'
import Register from '@/pages/RegisterPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  )
}