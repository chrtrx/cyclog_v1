import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Bikes from './pages/Bikes'
import BikeDetail from './pages/BikeDetail'
import More from './pages/More'
import Setups from './pages/Setups'
import BikeFitArchive from './pages/BikeFitArchive'
import RaceArchive from './pages/RaceArchive'
import TyrePressureDB from './pages/TyrePressureDB'
import ConnectStrava from './pages/ConnectStrava'
import PreRide from './pages/PreRide'
import NavBar from './components/NavBar'

function Loader() {
  return (
    <div style={{
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      height:'100vh',gap:14,fontFamily:'Nunito, sans-serif',fontWeight:800,color:'#777',
    }}>
      <div style={{
        width:40,height:40,border:'4px solid #e5e5e5',borderTopColor:'#58cc02',
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

  // Recovery hat Vorrang: kommt der Nutzer über einen Reset-Link,
  // zeigt die App das Passwort-vergeben-Fenster – egal ob schon eingeloggt.
  if (recovery) {
    return <ResetPassword onDone={clearRecovery} />
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/bikes" element={<Bikes />} />
        <Route path="/bike/:bikeId" element={<BikeDetail />} />
        <Route path="/more" element={<More />} />
        <Route path="/setups" element={<Setups />} />
        <Route path="/fit" element={<BikeFitArchive />} />
        <Route path="/races" element={<RaceArchive />} />
        <Route path="/pressure" element={<TyrePressureDB />} />
        <Route path="/connect-strava" element={<ConnectStrava />} />
        <Route path="/pre-ride" element={<PreRide />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NavBar />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
