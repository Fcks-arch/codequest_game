import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    const token = localStorage.getItem('cq_token')
    if (!token) {
      setUser(null)
      return null
    }

    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    try {
      const res = await axios.get('/api/auth/me')
      setUser(res.data)
      return res.data
    } catch (err) {
      localStorage.removeItem('cq_token')
      delete axios.defaults.headers.common['Authorization']
      setUser(null)
      return null
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('cq_token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      axios.get('/api/auth/me')
        .then(res => setUser(res.data))
        .catch(() => localStorage.removeItem('cq_token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password })
    localStorage.setItem('cq_token', res.data.token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`
    setUser(res.data.user)
    return res.data.user
  }

  const register = async (name, email, password, section) => {
    const res = await axios.post('/api/auth/register', { name, email, password, section, role: 'student' })
    localStorage.setItem('cq_token', res.data.token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`
    setUser(res.data.user)
    return res.data.user
  }

  const loginWithGoogle = async (credential) => {
    const res = await axios.post('/api/auth/google', { credential })
    localStorage.setItem('cq_token', res.data.token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`
    setUser(res.data.user)
    return res.data.user
  }

  const logout = () => {
    localStorage.removeItem('cq_token')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
  }

  const updateXp = (newXp, newLevel) => {
    setUser(prev => ({ ...prev, xp: newXp, level: newLevel }))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout, updateXp, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
