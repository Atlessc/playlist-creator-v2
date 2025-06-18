// src/services/spotifyService.ts
// import { get } from 'node:https';
import Spotified from 'spotified';
// import {getArtistTopTracks} from 'spotified/src/endpoints/Artist';  // removed unused invalid import


export type GetTrackParams = OptionalParams;
export interface OptionalParams {
  market?: string;
}

// export function getArtistTopTracks(id: string) {
//     return get(`/artists/${id}/top-tracks`, {});
//   }

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

export async function getTopTracks(spotified: Spotified, artistId: string) {
  try {
    // Spotify API requires a market for top tracks; use US as default
    const res = await spotified.artist.getArtistTopTracks(artistId)
    // The result likely has a .tracks array (each with name, album, etc.)
    return res || []
  } catch (err) {
    console.error("Error fetching top tracks:", err)
    throw err
  }
}

export async function getArtistAlbums(
  spotified: Spotified,
  artistId: string,
  limit = 20,
  market = 'US'
) {
  try {
    // Fetch up to `limit` full albums (not singles/compilations)
    const res = await spotified.artist.getArtistAlbums(artistId, {
      include_groups: 'album',
      market,
      limit
    })
    return res.items ?? []
  } catch (err) {
    console.error('Error fetching artist albums:', err)
    throw err
  }
}

export async function getArtistAlbumTracks(
  spotified: Spotified,
  albumId: string,
  market = 'US'
) {
  try {
    // Fetch all tracks for the given album
    const res = await spotified.album.getAlbumTracks(albumId, { market })
    return res.items ?? []
  } catch (err) {
    console.error('Error fetching album tracks:', err)
    throw err
  }
}

export async function getLatestAlbumTracks(
  spotified: Spotified,
  artistId: string,
  market = 'US'
) {
  try {
    // Get the artist's albums, sorted by release date
    const albums = await getArtistAlbums(spotified, artistId, 5, market)
    if (!albums.length) return []
    
    // Get the most recent album
    const latestAlbum = albums[0]
    
    // Fetch tracks from the latest album
    const tracks = await getArtistAlbumTracks(spotified, latestAlbum.id, market)
    
    // Add album name to each track for consistency
    return tracks.map(track => ({
      ...track,
      album: { name: latestAlbum.name }
    }))
  } catch (err) {
    console.error('Error fetching latest album tracks:', err)
    return []
  }
}

export async function getAllArtistAlbums(
  spotified: Spotified,
  artistId: string,
  market = 'US'
) {
  try {
    // Fetch all album types (albums, singles, compilations)
    const res = await spotified.artist.getArtistAlbums(artistId, {
      include_groups: 'album,single,compilation',
      market,
      limit: 50
    })
    return res.items ?? []
  } catch (err) {
    console.error('Error fetching all artist albums:', err)
    throw err
  }
}

export async function getFullAlbumTracks(
  spotified: Spotified,
  albumId: string,
  market = 'US'
) {
  try {
    // Get album details including tracks
    const album = await spotified.album.getAlbum(albumId, { market })
    
    // Return tracks with album info attached
    return {
      album: {
        id: album.id,
        name: album.name,
        images: album.images,
        release_date: album.release_date,
        total_tracks: album.total_tracks,
        artists: album.artists
      },
      tracks: album.tracks.items.map(track => ({
        ...track,
        album: { 
          name: album.name,
          images: album.images 
        }
      }))
    }
  } catch (err) {
    console.error('Error fetching full album tracks:', err)
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