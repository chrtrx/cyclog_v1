import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import NavBar from './components/NavBar'
import InstallHint from './components/InstallHint'
import ForegroundToast from './components/ForegroundToast'
import UpdatePrompt from './components/UpdatePrompt'

// Seiten erst bei Bedarf laden → kleinerer Start, flüssigeres Öffnen.
const Login           = lazy(() => import('./pages/Login'))
const ResetPassword   = lazy(() => import('./pages/ResetPassword'))
const Dashboard       = lazy(() => import('./pages/Dashboard'))
const Bikes           = lazy(() => import('./pages/Bikes'))
const BikeDetail      = lazy(() => import('./pages/BikeDetail'))
const More            = lazy(() => import('./pages/More'))
const Setups          = lazy(() => import('./pages/Setups'))
const BikeFitArchive  = lazy(() => import('./pages/BikeFitArchive'))
const RaceArchive     = lazy(() => import('./pages/RaceArchive'))
const Inbox           = lazy(() => import('./pages/Inbox'))
const TyrePressureDB  = lazy(() => import('./pages/TyrePressureDB'))
const ConnectStrava   = lazy(() => import('./pages/ConnectStrava'))

function Loader() {
  return (
    <div style={{
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      height:'100vh',gap:14,fontFamily:'var(--mono)',fontWeight:700,letterSpacing:'1px',
      textTransform:'uppercase',color:'var(--ink2)',background:'var(--bg0)',
    }}>
      <div style={{
        width:38,height:38,border:'3px solid var(--line)',borderTopColor:'var(--acc)',
        borderRadius:'50%',animation:'spin .8s linear infinite',
      }} />
      Lade…
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function Gate() {
  const { user, loading, recovery, clearRecovery } = useAuth()
  if (loading) return <Loader />

  let content
  if (recovery) {
    // Recovery hat Vorrang: über einen Reset-Link immer das Passwort-Fenster.
    content = <ResetPassword onDone={clearRecovery} />
  } else if (!user) {
    content = (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  } else {
    content = (
      <>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/bikes" element={<Bikes />} />
          <Route path="/bike/:bikeId" element={<BikeDetail />} />
          <Route path="/more" element={<More />} />
          <Route path="/setups" element={<Setups />} />
          <Route path="/fit" element={<BikeFitArchive />} />
          <Route path="/races" element={<RaceArchive />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/pressure" element={<TyrePressureDB />} />
          <Route path="/connect-strava" element={<ConnectStrava />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <NavBar />
        <InstallHint />
        <ForegroundToast />
      </>
    )
  }

  return <Suspense fallback={<Loader />}>{content}</Suspense>
}

export default function App() {
  // Übrige Seiten-Bündel nach dem Start im Hintergrund vorladen, damit das
  // Navigieren später ohne kurzen Lade-Spinner (Suspense) auskommt.
  useEffect(() => {
    const id = setTimeout(() => {
      import('./pages/Dashboard'); import('./pages/Bikes'); import('./pages/BikeDetail')
      import('./pages/More'); import('./pages/RaceArchive'); import('./pages/Setups')
      import('./pages/Inbox'); import('./pages/TyrePressureDB'); import('./pages/BikeFitArchive')
    }, 1200)
    return () => clearTimeout(id)
  }, [])

  return (
    <AuthProvider>
      <UpdatePrompt />
      <Gate />
    </AuthProvider>
  )
}
