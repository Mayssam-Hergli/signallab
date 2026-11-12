import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import LabPage from './pages/LabPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="tp/:labId" element={<LabPage />} />
        <Route path="*" element={<LabPage />} />
      </Route>
    </Routes>
  )
}
