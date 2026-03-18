import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from '@/pages/LoginPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
      </Routes>
    </BrowserRouter>
  )
}