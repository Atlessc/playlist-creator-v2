import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileJson, Loader2, Pause, Play, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { Input } from './ui/input'
import {
  createSpotifyPlaylist,
  extractSpotifyPlaylistId,
  parseSongImportJson,
  searchSongList,
  uploadTracksToSpotifyPlaylist,
  type SongImportItem,
  type SongSearchResult,
} from '../services/bulkPlaylistService'

const CHECKPOINT_PREFIX = 'playlist-creator-bulk-import-v1'

interface SearchCheckpoint {
  fingerprint: string
  results: SongSearchResult[]
  playlistId?: string
  uploadedCount?: number
}

function getFingerprint(songs: SongImportItem[]): string {
  const first = songs[0]
  const last = songs[songs.length - 1]
  return [
    songs.length,
    first?.title ?? '',
    first?.artist ?? '',
    last?.title ?? '',
    last?.artist ?? '',
  ].join('::')
}

function getCheckpointKey(fingerprint: string): string {
  return `${CHECKPOINT_PREFIX}:${fingerprint}`
}

function readCheckpoint(fingerprint: string): SearchCheckpoint | null {
  try {
    const raw = localStorage.getItem(getCheckpointKey(fingerprint))
    if (!raw) return null
    const parsed = JSON.parse(raw) as SearchCheckpoint
    return parsed.fingerprint === fingerprint ? parsed : null
  } catch {
    return null
  }
}

function writeCheckpoint(checkpoint: SearchCheckpoint): void {
  localStorage.setItem(getCheckpointKey(checkpoint.fingerprint), JSON.stringify(checkpoint))
}

function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function BulkSongImporter() {
  const [songs, setSongs] = useState<SongImportItem[]>([])
  const [results, setResults] = useState<SongSearchResult[]>([])
  const [fileName, setFileName] = useState('')
  const [playlistName, setPlaylistName] = useState('WGM')
  const [existingPlaylist, setExistingPlaylist] = useState('')
  const [searchDelayMs, setSearchDelayMs] = useState(400)
  const [isSearching, setIsSearching] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedCount, setUploadedCount] = useState(0)
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fingerprint = useMemo(() => getFingerprint(songs), [songs])
  const matchedResults = useMemo(() => results.filter((result) => result.track), [results])
  const unmatchedResults = useMemo(() => results.filter((result) => !result.track), [results])
  const searchPercent = songs.length ? Math.round((results.length / songs.length) * 100) : 0
  const uploadPercent = matchedResults.length
    ? Math.round((uploadedCount / matchedResults.length) * 100)
    : 0

  const handleFile = async (file: File | undefined) => {
    if (!file) return

    try {
      const parsedJson = JSON.parse(await file.text()) as unknown
      const parsedSongs = parseSongImportJson(parsedJson)
      if (!parsedSongs.length) throw new Error('The JSON file did not contain any usable song titles.')

      const nextFingerprint = getFingerprint(parsedSongs)
      const checkpoint = readCheckpoint(nextFingerprint)

      setSongs(parsedSongs)
      setResults(checkpoint?.results ?? [])
      setUploadedCount(checkpoint?.uploadedCount ?? 0)
      setActivePlaylistId(checkpoint?.playlistId ?? null)
      setFileName(file.name)
      toast.success(
        checkpoint?.results.length
          ? `Loaded ${parsedSongs.length} songs and restored ${checkpoint.results.length} completed searches.`
          : `Loaded ${parsedSongs.length} unique songs.`,
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read the JSON file.')
    }
  }

  const handleSearch = async () => {
    if (!songs.length || isSearching) return

    const controller = new AbortController()
    abortControllerRef.current = controller
    setIsSearching(true)

    try {
      const startIndex = results.length
      const newResults = [...results]

      await searchSongList(songs, {
        startIndex,
        delayMs: searchDelayMs,
        signal: controller.signal,
        onProgress: ({ result }) => {
          newResults.push(result)
          setResults([...newResults])
          writeCheckpoint({
            fingerprint,
            results: newResults,
            playlistId: activePlaylistId ?? undefined,
            uploadedCount,
          })
        },
      })

      toast.success(`Search complete: ${newResults.filter((result) => result.track).length} tracks matched.`)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast.info('Search paused. Progress has been saved in this browser.')
      } else {
        toast.error(error instanceof Error ? error.message : 'Bulk search failed.')
      }
    } finally {
      abortControllerRef.current = null
      setIsSearching(false)
    }
  }

  const handlePause = () => {
    abortControllerRef.current?.abort()
  }

  const handleUpload = async () => {
    if (!matchedResults.length || isUploading) return

    const suppliedPlaylistId = extractSpotifyPlaylistId(existingPlaylist)
    if (existingPlaylist.trim() && !suppliedPlaylistId) {
      toast.error('Enter a valid Spotify playlist URL, URI, or playlist ID.')
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller
    setIsUploading(true)

    try {
      let playlistId = suppliedPlaylistId ?? activePlaylistId
      if (!playlistId) {
        const playlist = await createSpotifyPlaylist(
          playlistName.trim() || 'WGM',
          `Imported from ${fileName || 'a JSON song list'} by Playlist Creator v2`,
          controller.signal,
        )
        playlistId = playlist.id
        setActivePlaylistId(playlistId)
      }

      const uris = matchedResults.flatMap((result) => (result.track ? [result.track.uri] : []))
      await uploadTracksToSpotifyPlaylist(playlistId, uris, {
        startIndex: uploadedCount,
        signal: controller.signal,
        onProgress: ({ completed }) => {
          setUploadedCount(completed)
          writeCheckpoint({
            fingerprint,
            results,
            playlistId,
            uploadedCount: completed,
          })
        },
      })

      toast.success(`Uploaded ${uris.length} tracks to Spotify.`)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast.info('Upload paused. Completed batches have been checkpointed.')
      } else {
        toast.error(error instanceof Error ? error.message : 'Spotify upload failed.')
      }
    } finally {
      abortControllerRef.current = null
      setIsUploading(false)
    }
  }

  const clearCheckpoint = () => {
    if (fingerprint) localStorage.removeItem(getCheckpointKey(fingerprint))
    setResults([])
    setUploadedCount(0)
    setActivePlaylistId(null)
    toast.success('Saved bulk-import progress cleared.')
  }

  return (
    <section className="mb-8 rounded-xl border border-white/10 bg-black/20 p-6 backdrop-blur-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileJson className="h-6 w-6 text-neon-teal" />
            <h2 className="text-2xl font-bold text-white">Bulk JSON Song Import</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-gray-300">
            Import a JSON song list, search Spotify sequentially with 429 retry handling, resume interrupted runs,
            and upload matches in Spotify-safe batches of 100.
          </p>
        </div>

        {songs.length > 0 && (
          <Button variant="outline" onClick={clearCheckpoint} disabled={isSearching || isUploading}>
            Reset saved progress
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2 text-sm text-gray-300">
          <span>Song JSON file</span>
          <Input
            type="file"
            accept="application/json,.json"
            onChange={(event) => handleFile(event.target.files?.[0])}
            disabled={isSearching || isUploading}
          />
        </label>

        <label className="space-y-2 text-sm text-gray-300">
          <span>New playlist name</span>
          <Input
            value={playlistName}
            onChange={(event) => setPlaylistName(event.target.value)}
            placeholder="WGM"
            disabled={isUploading}
          />
        </label>

        <label className="space-y-2 text-sm text-gray-300">
          <span>Existing playlist URL or ID (optional)</span>
          <Input
            value={existingPlaylist}
            onChange={(event) => setExistingPlaylist(event.target.value)}
            placeholder="Paste to append instead of create"
            disabled={isUploading}
          />
        </label>

        <label className="space-y-2 text-sm text-gray-300">
          <span>Delay between searches (ms)</span>
          <Input
            type="number"
            min={200}
            step={50}
            value={searchDelayMs}
            onChange={(event) => setSearchDelayMs(Math.max(200, Number(event.target.value) || 400))}
            disabled={isSearching}
          />
        </label>
      </div>

      {songs.length > 0 && (
        <div className="mt-6 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Imported" value={songs.length} />
            <Stat label="Searched" value={results.length} />
            <Stat label="Matched" value={matchedResults.length} tone="success" />
            <Stat label="Unmatched" value={unmatchedResults.length} tone={unmatchedResults.length ? 'warning' : undefined} />
            <Stat label="Uploaded" value={uploadedCount} />
          </div>

          <ProgressBar label="Spotify search" percent={searchPercent} />
          {uploadedCount > 0 && <ProgressBar label="Spotify upload" percent={uploadPercent} />}

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleSearch}
              disabled={isSearching || isUploading || results.length >= songs.length}
              className="bg-gradient-to-r from-neon-teal to-neon-purple"
            >
              {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              {results.length ? 'Resume search' : 'Start search'}
            </Button>

            {(isSearching || isUploading) && (
              <Button variant="outline" onClick={handlePause}>
                <Pause className="mr-2 h-4 w-4" />
                Pause safely
              </Button>
            )}

            <Button
              onClick={handleUpload}
              disabled={isSearching || isUploading || !matchedResults.length || results.length < songs.length}
              className="bg-green-600 hover:bg-green-700"
            >
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {existingPlaylist.trim() || activePlaylistId ? 'Append matched tracks' : 'Create and upload playlist'}
            </Button>

            {unmatchedResults.length > 0 && (
              <Button
                variant="outline"
                onClick={() => downloadJson('unmatched-songs.json', unmatchedResults.map((result) => ({
                  ...result.input,
                  error: result.error,
                  query: result.query,
                })))}
              >
                Download unmatched JSON
              </Button>
            )}
          </div>

          {results.length === songs.length && (
            <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
              {unmatchedResults.length ? (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
              )}
              <p>
                Search finished with {matchedResults.length} confident matches and {unmatchedResults.length} unmatched songs.
                Only confident matches will be uploaded; unmatched entries are kept out rather than silently adding the wrong track.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'success' | 'warning'
}) {
  const valueClass = tone === 'success' ? 'text-green-400' : tone === 'warning' ? 'text-yellow-400' : 'text-white'
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</p>
    </div>
  )
}

function ProgressBar({ label, percent }: { label: string; percent: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-neon-teal via-neon-purple to-neon-pink transition-all"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  )
}
