// src/pages/CallbackPage.tsx
import { useEffect } from 'react'
import { useSpotified } from '../lib/useSpotified'
import { useNavigate } from 'react-router-dom'

export default function CallbackPage() {
  const navigate = useNavigate()
  const { handleCallback } = useSpotified(import.meta.env.VITE_SPOTIFY_CLIENT_ID, 'http://localhost:5173/callback', [
      'playlist-modify-private', 'user-read-private'
  ])
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const codeParam = params.get('code')
    if (codeParam) {
      handleCallback(codeParam)
      navigate('/')  // go back to home after handling
    }
  }, [])
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-teal-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="animate-spin w-12 h-12 border-4 border-neon-purple border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-xl font-semibold">Processing Spotify login...</p>
        <p className="text-sm opacity-75 mt-2">Taking you back to Wonderland...</p>
      </div>
    </div>
  )
}