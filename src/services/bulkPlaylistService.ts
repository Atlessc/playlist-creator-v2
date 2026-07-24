export interface SongImportItem {
  title: string
  artist?: string
  position?: number
}

export interface SpotifyTrackMatch {
  id: string
  uri: string
  title: string
  artist: string
  album: string
  spotifyUrl?: string
}

export interface SpotifyTrackCandidate extends SpotifyTrackMatch {
  score: number
}

export interface SongSearchResult {
  input: SongImportItem
  track: SpotifyTrackMatch | null
  candidates: SpotifyTrackCandidate[]
  query: string
  error?: string
  matchType?: 'automatic' | 'manual'
  skipped?: boolean
}

export interface SearchProgress {
  completed: number
  total: number
  current: SongImportItem
  result: SongSearchResult
}

export interface UploadProgress {
  completed: number
  total: number
  batchNumber: number
  totalBatches: number
}

interface SpotifyArtist {
  name?: string
}

interface SpotifySearchTrack {
  id?: string
  uri?: string
  name?: string
  artists?: SpotifyArtist[]
  album?: { name?: string }
  external_urls?: { spotify?: string }
}

interface SpotifySearchResponse {
  tracks?: { items?: SpotifySearchTrack[] }
}

interface SpotifyErrorBody {
  error?: {
    message?: string
    status?: number
  }
}

const SEARCH_ENDPOINT = 'https://api.spotify.com/v1/search'
const API_BASE = 'https://api.spotify.com/v1'
const DEFAULT_SEARCH_DELAY_MS = 400
const DEFAULT_SEARCH_CONCURRENCY = 4
const MAX_SEARCH_CONCURRENCY = 6
const MAX_RETRIES = 8
const MAX_REVIEW_CANDIDATES = 5
const VERSION_WORDS = /\b(live|remix|mix|karaoke|tribute|cover|sped up|slowed|acoustic|instrumental|radio edit|remaster(?:ed)?)\b/i

let sharedRateLimitUntil = 0

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Operation aborted', 'AbortError'))
      return
    }

    const timeout = window.setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timeout)
        reject(new DOMException('Operation aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

async function waitForSharedRateLimit(signal?: AbortSignal): Promise<void> {
  const waitMs = sharedRateLimitUntil - Date.now()
  if (waitMs > 0) await sleep(waitMs, signal)
}

function getAccessToken(): string {
  const token = localStorage.getItem('accessToken')
  if (!token) throw new Error('Spotify access token is missing. Reconnect Spotify and try again.')
  return token
}

function getRetryAfterMs(response: Response, retryNumber: number): number {
  const retryAfter = response.headers.get('Retry-After')
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds)) return Math.max(1000, seconds * 1000)
  }

  const exponential = Math.min(60_000, 1000 * 2 ** retryNumber)
  const jitter = Math.floor(Math.random() * 750)
  return exponential + jitter
}

async function spotifyRequest<T>(
  pathOrUrl: string,
  init: RequestInit = {},
  signal?: AbortSignal,
): Promise<T> {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${API_BASE}${pathOrUrl}`

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    await waitForSharedRateLimit(signal)

    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${getAccessToken()}`)
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

    const response = await fetch(url, { ...init, headers, signal })

    if (response.ok) {
      if (response.status === 204) return undefined as T
      return (await response.json()) as T
    }

    if (response.status === 429) {
      if (attempt === MAX_RETRIES) break
      const retryMs = getRetryAfterMs(response, attempt)
      sharedRateLimitUntil = Math.max(sharedRateLimitUntil, Date.now() + retryMs)
      await waitForSharedRateLimit(signal)
      continue
    }

    if (response.status >= 500) {
      if (attempt === MAX_RETRIES) break
      await sleep(getRetryAfterMs(response, attempt), signal)
      continue
    }

    let detail = `Spotify request failed (${response.status})`
    try {
      const body = (await response.json()) as SpotifyErrorBody
      detail = body.error?.message || detail
    } catch {
      // Spotify occasionally returns an empty or non-JSON error body.
    }
    throw new Error(detail)
  }

  throw new Error('Spotify kept rate-limiting or failing the request after multiple retries.')
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function parseSongImportJson(raw: unknown): SongImportItem[] {
  const candidate = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
      ? ((raw as Record<string, unknown>).songs ??
          (raw as Record<string, unknown>).tracks ??
          (raw as Record<string, unknown>).items)
      : null

  if (!Array.isArray(candidate)) {
    throw new Error('Expected a JSON array, or an object containing a songs, tracks, or items array.')
  }

  const songs = candidate
    .map((entry, index): SongImportItem | null => {
      if (typeof entry === 'string') {
        const title = cleanString(entry)
        return title ? { title, position: index + 1 } : null
      }

      if (!entry || typeof entry !== 'object') return null
      const record = entry as Record<string, unknown>
      const title = cleanString(record.title ?? record.name ?? record.song)
      const artist = cleanString(record.artist ?? record.artistName ?? record.performer)
      const rawPosition = record.position ?? record.index
      const position = typeof rawPosition === 'number' ? rawPosition : index + 1

      return title ? { title, artist: artist || undefined, position } : null
    })
    .filter((song): song is SongImportItem => Boolean(song))

  const seen = new Set<string>()
  return songs.filter((song) => {
    const key = `${song.title.toLocaleLowerCase()}::${song.artist?.toLocaleLowerCase() ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(feat(?:uring)?|ft)\.?\b.*$/i, '')
    .replace(/\b(cast|soundtrack version)\b/g, ' ')
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function scoreTrack(input: SongImportItem, track: SpotifySearchTrack): number {
  const wantedTitle = normalize(input.title)
  const resultTitle = normalize(track.name ?? '')
  const wantedArtist = normalize(input.artist ?? '')
  const resultArtists = (track.artists ?? []).map((artist) => normalize(artist.name ?? ''))

  let score = 0
  if (resultTitle === wantedTitle) score += 100
  else if (resultTitle.startsWith(wantedTitle) || wantedTitle.startsWith(resultTitle)) score += 65
  else if (resultTitle.includes(wantedTitle) || wantedTitle.includes(resultTitle)) score += 40

  if (wantedArtist) {
    if (resultArtists.some((artist) => artist === wantedArtist)) score += 80
    else if (resultArtists.some((artist) => artist.includes(wantedArtist) || wantedArtist.includes(artist))) score += 40
    else score -= 35
  }

  const inputRequestsVersion = VERSION_WORDS.test(input.title)
  const resultIsAlternate = VERSION_WORDS.test(track.name ?? '')
  if (!inputRequestsVersion && resultIsAlternate) score -= 45

  return score
}

function mapSpotifyTrack(track: SpotifySearchTrack): SpotifyTrackMatch | null {
  if (!track.id || !track.uri || !track.name) return null
  return {
    id: track.id,
    uri: track.uri,
    title: track.name,
    artist: (track.artists ?? []).map((artist) => artist.name).filter(Boolean).join(', '),
    album: track.album?.name ?? '',
    spotifyUrl: track.external_urls?.spotify,
  }
}

function buildQuery(song: SongImportItem, includeArtist: boolean): string {
  const title = `track:"${song.title.replaceAll('"', '')}"`
  if (includeArtist && song.artist) return `${title} artist:"${song.artist.replaceAll('"', '')}"`
  return title
}

function buildLooseQuery(song: SongImportItem): string {
  return [song.title, song.artist].filter(Boolean).join(' ')
}

async function runSearchQuery(query: string, signal?: AbortSignal): Promise<SpotifySearchTrack[]> {
  const params = new URLSearchParams({ q: query, type: 'track', market: 'US', limit: '10' })
  const response = await spotifyRequest<SpotifySearchResponse>(`${SEARCH_ENDPOINT}?${params}`, {}, signal)
  return response.tracks?.items ?? []
}

function mergeCandidates(...groups: SpotifySearchTrack[][]): SpotifySearchTrack[] {
  const byId = new Map<string, SpotifySearchTrack>()
  for (const track of groups.flat()) {
    if (track.id && !byId.has(track.id)) byId.set(track.id, track)
  }
  return [...byId.values()]
}

function rankCandidates(song: SongImportItem, candidates: SpotifySearchTrack[]): Array<{
  track: SpotifySearchTrack
  match: SpotifyTrackMatch
  score: number
}> {
  return candidates
    .map((track) => {
      const match = mapSpotifyTrack(track)
      return match ? { track, match, score: scoreTrack(song, track) } : null
    })
    .filter((candidate): candidate is { track: SpotifySearchTrack; match: SpotifyTrackMatch; score: number } => Boolean(candidate))
    .sort((a, b) => b.score - a.score)
}

export async function searchSpotifyTrack(
  song: SongImportItem,
  signal?: AbortSignal,
): Promise<SongSearchResult> {
  const exactQuery = buildQuery(song, true)

  try {
    const exactCandidates = await runSearchQuery(exactQuery, signal)
    let combinedCandidates = exactCandidates
    let ranked = rankCandidates(song, combinedCandidates)
    const minimumScore = song.artist ? 85 : 60

    if (song.artist && (!ranked[0] || ranked[0].score < minimumScore)) {
      const titleOnlyCandidates = await runSearchQuery(buildQuery(song, false), signal)
      combinedCandidates = mergeCandidates(combinedCandidates, titleOnlyCandidates)
      ranked = rankCandidates(song, combinedCandidates)
    }

    if (!ranked[0] || ranked[0].score < minimumScore) {
      const looseCandidates = await runSearchQuery(buildLooseQuery(song), signal)
      combinedCandidates = mergeCandidates(combinedCandidates, looseCandidates)
      ranked = rankCandidates(song, combinedCandidates)
    }

    const best = ranked[0]
    const confidentTrack = best && best.score >= minimumScore ? best.match : null
    const reviewCandidates: SpotifyTrackCandidate[] = confidentTrack
      ? []
      : ranked.slice(0, MAX_REVIEW_CANDIDATES).map(({ match, score }) => ({ ...match, score }))

    return {
      input: song,
      track: confidentTrack,
      candidates: reviewCandidates,
      query: exactQuery,
      error: confidentTrack ? undefined : 'No confident match found',
      matchType: confidentTrack ? 'automatic' : undefined,
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    return {
      input: song,
      track: null,
      candidates: [],
      query: exactQuery,
      error: error instanceof Error ? error.message : 'Unknown Spotify search error',
    }
  }
}

export async function searchSongList(
  songs: SongImportItem[],
  options: {
    startIndex?: number
    delayMs?: number
    concurrency?: number
    signal?: AbortSignal
    onProgress?: (progress: SearchProgress) => void
  } = {},
): Promise<SongSearchResult[]> {
  const results: SongSearchResult[] = []
  const startIndex = Math.max(0, options.startIndex ?? 0)
  const concurrency = Math.min(
    MAX_SEARCH_CONCURRENCY,
    Math.max(1, Math.floor(options.concurrency ?? DEFAULT_SEARCH_CONCURRENCY)),
  )
  const configuredDelayMs = Math.max(0, options.delayMs ?? DEFAULT_SEARCH_DELAY_MS)
  const interBatchDelayMs = Math.max(50, Math.floor(configuredDelayMs / concurrency))

  for (let batchStart = startIndex; batchStart < songs.length; batchStart += concurrency) {
    if (options.signal?.aborted) throw new DOMException('Operation aborted', 'AbortError')

    const batchSongs = songs.slice(batchStart, batchStart + concurrency)
    const batchResults = await Promise.all(
      batchSongs.map((song) => searchSpotifyTrack(song, options.signal)),
    )

    batchResults.forEach((result, offset) => {
      const absoluteIndex = batchStart + offset
      results.push(result)
      options.onProgress?.({
        completed: absoluteIndex + 1,
        total: songs.length,
        current: songs[absoluteIndex],
        result,
      })
    })

    if (batchStart + concurrency < songs.length) {
      const jitter = Math.floor(Math.random() * 75)
      await sleep(interBatchDelayMs + jitter, options.signal)
    }
  }

  return results
}

export function extractSpotifyPlaylistId(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const uriMatch = trimmed.match(/^spotify:playlist:([A-Za-z0-9]+)$/)
  if (uriMatch) return uriMatch[1]

  const urlMatch = trimmed.match(/open\.spotify\.com\/playlist\/([A-Za-z0-9]+)/)
  if (urlMatch) return urlMatch[1]

  return /^[A-Za-z0-9]+$/.test(trimmed) ? trimmed : null
}

export async function createSpotifyPlaylist(
  name: string,
  description: string,
  signal?: AbortSignal,
): Promise<{ id: string; external_urls?: { spotify?: string } }> {
  const profile = await spotifyRequest<{ id: string }>('/me', {}, signal)
  return spotifyRequest(`/users/${profile.id}/playlists`, {
    method: 'POST',
    body: JSON.stringify({ name, description, public: false }),
  }, signal)
}

export async function uploadTracksToSpotifyPlaylist(
  playlistId: string,
  trackUris: string[],
  options: {
    startIndex?: number
    signal?: AbortSignal
    onProgress?: (progress: UploadProgress) => void
  } = {},
): Promise<void> {
  const uniqueUris = [...new Set(trackUris)]
  const batchSize = 100
  const startIndex = Math.max(0, options.startIndex ?? 0)
  const totalBatches = Math.ceil(uniqueUris.length / batchSize)

  for (let index = startIndex; index < uniqueUris.length; index += batchSize) {
    const batch = uniqueUris.slice(index, index + batchSize)
    await spotifyRequest(`/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ uris: batch }),
    }, options.signal)

    options.onProgress?.({
      completed: Math.min(index + batch.length, uniqueUris.length),
      total: uniqueUris.length,
      batchNumber: Math.floor(index / batchSize) + 1,
      totalBatches,
    })

    if (index + batchSize < uniqueUris.length) await sleep(400, options.signal)
  }
}
