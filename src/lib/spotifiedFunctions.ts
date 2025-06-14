import { Spotified } from 'spotified'

export async function searchArtistByName(spotified: Spotified, name: string) {
  // Search for artists by name, return list of top results
  try {
    const res = await spotified.search.searchForItem(
      name,
      ['artist'],
      {limit: 10}
    )
    console.log("Spotify search results:", res)
    // return res.artists ? JSON.stringify(res.artists.items)  : JSON.stringify([])
    return res.artists?.items ?? []
  } catch (err) {
    console.error("Spotify search error:", err)
    throw err
  }
}

export async function getArtistAlbums(spotified: Spotified, artistId: string) {
  // Fetch all albums for a given artist
  try {
    const res = await spotified.artist.getArtistAlbums(artistId, { include_groups: 'album', market: 'US', limit: 50 })
    const albums = res.items || []
    console.log("Artist albums:", albums)
    return albums
  } catch (err) {
    console.error("Failed to fetch artist albums:", err)
    throw err
  }
}

export async function createPlaylist(spotified: Spotified, userId: string, name: string) {
  try {
    const playlist = await spotified.playlist.createPlaylist(
      userId,
      name,
      {}
    )
    return playlist
  } catch (err) {
    console.error("Error creating playlist:", err)
    throw err
  }
}

export async function addTracksToPlaylist(
  spotified: Spotified,
  playlistId: string,
  trackUris: string[],
  batchSize = 100,
  delayMs = 250
): Promise<void> {
  if (!trackUris.length) return

  // Helper to sleep between batches
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms))

  // Break into chunks of up to batchSize (max 100)
  for (let i = 0; i < trackUris.length; i += batchSize) {
    const batch = trackUris.slice(i, i + batchSize)
    try {
      await spotified.playlist.addItemsToPlaylist(
        playlistId,
        { uris: batch }
      )
      console.log(
        `✅ Added ${batch.length} tracks (batch ${i / batchSize + 1})`
      )
    } catch (err: any) {
      // If rate limited, wait for suggested time then retry
      if (err.status === 429 && err.details?.headers?.['retry-after']) {
        const retryAfter = Number(err.details.headers['retry-after']) * 1000
        console.warn(
          `⚠️ Rate limited. Retrying batch ${i / batchSize + 1} after ${retryAfter}ms.`
        )
        await sleep(retryAfter)
        i -= batchSize // retry this batch
      } else {
        console.error(
          `Error adding batch ${i / batchSize + 1}:`,
          err
        )
        throw err
      }
    }
    // Throttle before next batch to avoid rate limiting
    if (i + batchSize < trackUris.length) {
      await sleep(delayMs)
    }
  }
}