import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Fatture from './pages/Fatture'
import Clienti from './pages/Clienti'
import Previsione from './pages/Previsione'
import F24Page from './pages/F24'
import Dichiarazione from './pages/Dichiarazione'
import Chat from './pages/Chat'
import Impostazioni from './pages/Impostazioni'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/fatture" element={<Fatture />} />
        <Route path="/clienti" element={<Clienti />} />
        <Route path="/previsione" element={<Previsione />} />
        <Route path="/f24" element={<F24Page />} />
        <Route path="/dichiarazione" element={<Dichiarazione />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/impostazioni" element={<Impostazioni />} />
      </Routes>
    </Layout>
  )
}
