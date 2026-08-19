import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import LessonPage from './pages/LessonPage'
import HomePage from './pages/HomePage'
import IslandPage from './pages/IslandPage'
import QuestPage from './pages/QuestPage'
import LeaderboardPage from './pages/LeaderboardPage'
import ProgressPage from './pages/ProgressPage'
import ProfilePage from './pages/ProfilePage'

function LoadingScreen() {
  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center',
      justifyContent:'center', fontSize:14, color:'#64748B'
    }}>
      Loading...
    </div>
  )
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/" element={user ? <HomePage/> : <Navigate to="/login" replace/>}/>
      <Route path="/login" element={user ? <Navigate to="/" replace/> : <LoginPage/>}/>
      <Route path="/forgot-password" element={user ? <Navigate to="/" replace/> : <ForgotPasswordPage/>}/>
      <Route path="/reset-password" element={user ? <Navigate to="/" replace/> : <ResetPasswordPage/>}/>
      <Route path="/dashboard" element={<Navigate to="/quest" replace/>}/>

      <Route path="/quest" element={
        <PrivateRoute><QuestPage/></PrivateRoute>
      }/>

      <Route path="/leaderboard" element={
        <PrivateRoute><LeaderboardPage/></PrivateRoute>
      }/>

      <Route path="/progress" element={
        <PrivateRoute><ProgressPage/></PrivateRoute>
      }/>

      <Route path="/profile" element={
        <PrivateRoute><ProfilePage/></PrivateRoute>
      }/>

      <Route path="/island/:id" element={
        <PrivateRoute><IslandPage/></PrivateRoute>
      }/>

      <Route path="/lesson/:id" element={
        <PrivateRoute><LessonPage/></PrivateRoute>
      }/>

      <Route path="*" element={<Navigate to={user ? '/quest' : '/login'} replace/>}/>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes/>
    </AuthProvider>
  )
}
