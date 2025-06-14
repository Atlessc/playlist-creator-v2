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
  return <p>Processing Spotify login...</p>
}
