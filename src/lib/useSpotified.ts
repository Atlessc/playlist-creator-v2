import { useState, useEffect, useCallback } from 'react'
import Spotified, { type OAuth2Scope, SpotifyApiError } from 'spotified'

const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID


// Helper: Refresh the access token using the stored refresh token
async function refreshAccessToken(spotified: Spotified) {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return
  try {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,                // PKCE flow requires client_id only 
    })
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const data = await res.json()
    if (data.error) throw data

    // Persist new tokens & schedule next refresh
    const expiresIn = data.expires_in as number
    const nextExpiry = Date.now() + expiresIn * 1000
    localStorage.setItem('accessToken', data.access_token)
    // PKCE flow often returns a new refresh token; fallback to old if absent
    localStorage.setItem('refreshToken', data.refresh_token ?? refreshToken)
    localStorage.setItem('tokenExpiresAt', String(nextExpiry))
    spotified.setBearerToken(data.access_token)

    // Schedule next refresh 60 seconds before expiry
    setTimeout(() => refreshAccessToken(spotified), (expiresIn - 60) * 1000)
    console.log('✅ Access token refreshed; next refresh at', new Date(nextExpiry).toLocaleTimeString())
  } catch (err) {
    console.error('Failed to refresh Spotify token:', err)
  }
}

export const useSpotified = (
  clientId: string,
  redirectUri: string,
  scopes: OAuth2Scope[] = []
) => {
  const [spotified, setSpotified] = useState<Spotified | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize Spotified and restore any existing access token
  useEffect(() => {
    const sdk = new Spotified({ clientId })
    setSpotified(sdk)
    const token = localStorage.getItem('accessToken')
    const expiresAt = Number(localStorage.getItem('tokenExpiresAt'))
    if (token && expiresAt && Date.now() < expiresAt) {
      sdk.setBearerToken(token)
      setIsAuthenticated(true)

      // Schedule a refresh if token is valid
      const msUntilRefresh = expiresAt - Date.now() - 60 * 1000
      setTimeout(() => refreshAccessToken(sdk), msUntilRefresh)
    }
  }, [clientId])

  // Start PKCE auth flow
  const authenticate = useCallback(async () => {
    if (!spotified) return
    try {
      const { url, codeVerifier } = 
        await spotified.auth.AuthorizationCodePKCE.generateAuthorizationURL(
          redirectUri,
          { scope: scopes }
        )
      localStorage.setItem('codeVerifier', codeVerifier)
      window.location.href = url
    } catch (err) {
      setError(`Auth initiation failed: ${(err as Error).message}`)
    }
  }, [spotified, redirectUri, scopes])

  // Handle the callback from Spotify and exchange code for tokens
  const handleCallback = useCallback(async (code: string) => {
    if (!spotified) return
    const codeVerifier = localStorage.getItem('codeVerifier')
    if (!codeVerifier) {
      setError('PKCE code verifier is missing')
      return
    }
    try {
      const tokenResponse = await spotified.auth.AuthorizationCodePKCE
        .requestAccessToken(code, codeVerifier, redirectUri)
      // Spotify returns access_token, refresh_token, expires_in
      const expiresIn = tokenResponse.expires_in
      const expiry = Date.now() + expiresIn * 1000

      // Persist tokens and expiry
      localStorage.setItem('accessToken', tokenResponse.access_token)
      // Spotify may not return a new refresh token; fall back to the existing one
      const prevRefreshToken = localStorage.getItem('refreshToken') ?? ''
      const refreshToken = tokenResponse.refresh_token ?? prevRefreshToken
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('tokenExpiresAt', String(expiry))

      // Configure SDK and state
      spotified.setBearerToken(tokenResponse.access_token)
      setIsAuthenticated(true)
      setError(null)

      // Clean up URL and verifier
      localStorage.removeItem('codeVerifier')
      window.history.replaceState({}, '', '/')

      // Schedule automatic refresh
      setTimeout(() => refreshAccessToken(spotified), (expiresIn - 60) * 1000)
    } catch (err: any) {
      if (err instanceof SpotifyApiError) {
        setError(`Failed to authenticate: ${err.message}`)
      } else {
        setError('Unexpected error during authentication')
      }
    }
  }, [spotified, redirectUri])

  return { spotified, isAuthenticated, error, authenticate, handleCallback }
}
