import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import CoursePage from './pages/CoursePage'
import Home from './pages/Home'
import LabPage from './pages/LabPage'
import LegacyRedirect from './pages/LegacyRedirect'
import NotFound from './pages/NotFound'

/**
 *   /                       landing: the two courses
 *   /:courseId              one course and its TPs
 *   /:courseId/:labSlug     one TP (?s=<section> scrolls to a section)
 * Static routes rank above dynamic ones, so /tp1 and /tp/tp1 (the routes of
 * the single-course site) reach LegacyRedirect, not CoursePage.
 */
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        {['tp1', 'tp2', 'tp3'].map((id) => (
          <Route key={id} path={id} element={<LegacyRedirect id={id} />} />
        ))}
        <Route path="tp/:labId" element={<LegacyRedirect />} />
        <Route path=":courseId" element={<CoursePage />} />
        <Route path=":courseId/:labSlug" element={<LabPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
