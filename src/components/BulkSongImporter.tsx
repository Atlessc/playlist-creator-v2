import { useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileJson,
  Loader2,
  Pause,
  Play,
  SkipForward,
  Upload,
} from 'lucide-react'
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
  type SpotifyTrackCandidate,
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
  const unresolvedResults = useMemo(
    () => unmatchedResults.filter((result) => !result.skipped),
    [unmatchedResults],
  )
  const skippedResults = useMemo(
    () => unmatchedResults.filter((result) => result.skipped),
    [unmatchedResults],
  )
  const searchPercent = songs.length ? Math.round((results.length / songs.length) * 100) : 0
  const uploadPercent = matchedResults.length
    ? Math.round((uploadedCount / matchedResults.length) * 100)
    : 0

  const saveResults = (nextResults: SongSearchResult[]) => {
    setResults(nextResults)
    writeCheckpoint({
      fingerprint,
      results: nextResults,
      playlistId: activePlaylistId ?? undefined,
      uploadedCount,
    })
  }

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

  const handleSelectCandidate = (resultIndex: number, candidate: SpotifyTrackCandidate) => {
    const nextResults = results.map((result, index) =>
      index === resultIndex
        ? {
            ...result,
            track: {
              id: candidate.id,
              uri: candidate.uri,
              title: candidate.title,
              artist: candidate.artist,
              album: candidate.album,
              spotifyUrl: candidate.spotifyUrl,
            },
            error: undefined,
            matchType: 'manual' as const,
            skipped: false,
          }
        : result,
    )
    saveResults(nextResults)
    toast.success(`Selected “${candidate.title}” by ${candidate.artist}.`)
  }

  const handleSkipResult = (resultIndex: number) => {
    const nextResults = results.map((result, index) =>
      index === resultIndex ? { ...result, skipped: true } : result,
    )
    saveResults(nextResults)
  }

  const handleUndoReview = (resultIndex: number) => {
    const nextResults = results.map((result, index) =>
      index === resultIndex
        ? { ...result, track: null, skipped: false, matchType: undefined, error: 'No confident match found' }
        : result,
    )
    saveResults(nextResults)
  }

  const handleUpload = async () => {
    if (!matchedResults.length || isUploading) return
    if (unresolvedResults.length) {
      toast.error(`Review or skip the remaining ${unresolvedResults.length} unresolved songs before uploading.`)
      return
    }

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
            Import a JSON song list, search Spotify sequentially with 429 retry handling, manually review close
            matches, resume interrupted runs, and upload in Spotify-safe batches of 100.
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <Stat label="Imported" value={songs.length} />
            <Stat label="Searched" value={results.length} />
            <Stat label="Matched" value={matchedResults.length} tone="success" />
            <Stat label="Needs review" value={unresolvedResults.length} tone={unresolvedResults.length ? 'warning' : undefined} />
            <Stat label="Skipped" value={skippedResults.length} />
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
              disabled={
                isSearching ||
                isUploading ||
                !matchedResults.length ||
                results.length < songs.length ||
                unresolvedResults.length > 0
              }
              className="bg-green-600 hover:bg-green-700"
            >
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {existingPlaylist.trim() || activePlaylistId ? 'Append reviewed tracks' : 'Create and upload playlist'}
            </Button>

            {unmatchedResults.length > 0 && (
              <Button
                variant="outline"
                onClick={() =>
                  downloadJson(
                    'unmatched-songs.json',
                    unmatchedResults.map((result) => ({
                      ...result.input,
                      skipped: result.skipped,
                      candidates: result.candidates ?? [],
                      error: result.error,
                      query: result.query,
                    })),
                  )
                }
              >
                Download review JSON
              </Button>
            )}
          </div>

          {unresolvedResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
                <p>
                  Spotify could not confidently identify {unresolvedResults.length} songs. Choose the correct nearby
                  result or explicitly skip each one. Nothing unresolved will be silently uploaded.
                </p>
              </div>

              {results.map((result, resultIndex) => {
                if (result.track || result.skipped) return null
                return (
                  <ReviewCard
                    key={`${result.input.position ?? resultIndex}-${result.input.title}`}
                    result={result}
                    onSelect={(candidate) => handleSelectCandidate(resultIndex, candidate)}
                    onSkip={() => handleSkipResult(resultIndex)}
                  />
                )
              })}
            </div>
          )}

          {(skippedResults.length > 0 || results.some((result) => result.matchType === 'manual')) && (
            <details className="rounded-lg border border-white/10 bg-white/5 p-4">
              <summary className="cursor-pointer font-medium text-white">Reviewed decisions</summary>
              <div className="mt-3 space-y-2">
                {results.map((result, resultIndex) => {
                  if (!result.skipped && result.matchType !== 'manual') return null
                  return (
                    <div
                      key={`reviewed-${result.input.position ?? resultIndex}-${result.input.title}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-white">
                          {result.input.position ? `#${result.input.position} · ` : ''}
                          {result.input.title} — {result.input.artist || 'Unknown artist'}
                        </p>
                        <p className="text-gray-400">
                          {result.skipped
                            ? 'Skipped'
                            : `Manually matched to ${result.track?.title} — ${result.track?.artist}`}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleUndoReview(resultIndex)}>
                        Review again
                      </Button>
                    </div>
                  )
                })}
              </div>
            </details>
          )}

          {results.length === songs.length && unresolvedResults.length === 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-100">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
              <p>
                Review complete: {matchedResults.length} tracks will upload and {skippedResults.length} songs will be
                skipped.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function ReviewCard({
  result,
  onSelect,
  onSkip,
}: {
  result: SongSearchResult
  onSelect: (candidate: SpotifyTrackCandidate) => void
  onSkip: () => void
}) {
  const candidates = result.candidates ?? []

  return (
    <article className="rounded-xl border border-yellow-500/30 bg-black/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-yellow-400">Needs manual match</p>
          <h3 className="mt-1 text-lg font-semibold text-white">
            {result.input.position ? `#${result.input.position} · ` : ''}
            {result.input.title}
          </h3>
          <p className="text-sm text-gray-300">{result.input.artist || 'No artist supplied'}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onSkip}>
          <SkipForward className="mr-2 h-4 w-4" />
          Skip this song
        </Button>
      </div>

      {candidates.length ? (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {candidates.map((candidate) => (
            <div key={candidate.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{candidate.title}</p>
                  <p className="truncate text-sm text-gray-300">{candidate.artist}</p>
                  <p className="truncate text-xs text-gray-500">{candidate.album}</p>
                  <p className="mt-1 text-xs text-gray-500">Match score: {candidate.score}</p>
                </div>
                {candidate.spotifyUrl && (
                  <a
                    href={candidate.spotifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-gray-400 hover:text-white"
                    aria-label={`Open ${candidate.title} in Spotify`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
              <Button className="mt-3 w-full bg-neon-purple hover:bg-neon-purple/80" onClick={() => onSelect(candidate)}>
                Use this track
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-white/10 bg-white/5 p-3 text-sm text-gray-400">
          Spotify returned no useful nearby tracks for this entry. Skip it for now and correct the title or artist in
          the JSON before another import.
        </p>
      )}
    </article>
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
