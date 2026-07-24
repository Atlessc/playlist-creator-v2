# Bulk JSON Spotify Import

The bulk importer is available at `/bulk` and from the **Bulk JSON Import** shortcut in the app.

## Supported JSON shapes

The importer accepts any of these forms:

```json
[
  { "title": "Unwritten", "artist": "Natasha Bedingfield" },
  { "title": "Since U Been Gone", "artist": "Kelly Clarkson" }
]
```

```json
[
  "Unwritten",
  "Since U Been Gone"
]
```

```json
{
  "songs": [
    { "name": "Unwritten", "artistName": "Natasha Bedingfield" }
  ]
}
```

The top-level object key may be `songs`, `tracks`, or `items`. Song titles may use `title`, `name`, or `song`. Artist names may use `artist`, `artistName`, or `performer`.

Including the artist is strongly recommended because it substantially improves match accuracy.

## Workflow

1. Connect Spotify.
2. Open **Bulk JSON Import**.
3. Select the JSON file.
4. Leave the existing-playlist field blank to create a new playlist, or paste a Spotify playlist URL, URI, or ID to append.
5. Start the search.
6. Review every low-confidence song. The importer shows up to five nearby Spotify results with title, artist, album, score, and an **Open in Spotify** link.
7. Choose **Use this track** for the correct result or **Skip this song** when none are correct.
8. Upload after all unresolved songs have been reviewed.

## Rate-limit behavior

- Searches run sequentially instead of launching 1,000 requests at once.
- The default delay is 400 ms plus a small random jitter.
- HTTP 429 responses respect Spotify's `Retry-After` header when present.
- Temporary Spotify 5xx errors use exponential backoff with jitter.
- Search and upload progress is checkpointed to `localStorage`.
- Searches and uploads can be paused safely and resumed after a refresh.
- Playlist uploads are split into batches of 100 Spotify URIs.

## Matching behavior

The importer first searches using exact track and artist qualifiers. When the top result is not confident enough, it now also searches by title and then with a looser title-and-artist query. Results from all searches are merged, deduplicated, scored, and ranked.

Low-confidence tracks are not discarded. Up to five nearby candidates are saved in the checkpoint and displayed for manual selection. Upload stays disabled until every unresolved entry is either manually matched or explicitly skipped.

Unless the input specifically requests one, alternate versions such as live, remix, karaoke, tribute, acoustic, sped-up, slowed, and remastered tracks receive a matching penalty.

Use **Download review JSON** to export unresolved or skipped entries together with their candidate results.

### Existing checkpoints from the first importer version

Older checkpoints do not contain close-match candidates because that version discarded them. You do not need to search the original 1,000 songs again:

1. Download the old `unmatched-songs.json` file.
2. Import that smaller file as a new bulk job.
3. Search only those unmatched songs.
4. Manually choose the correct candidates.
5. Paste the existing Spotify playlist URL or ID and append the recovered tracks.

## Spotify setup

The app needs these scopes:

- `playlist-modify-private`
- `playlist-modify-public`
- `user-read-private`

Ensure `VITE_SPOTIFY_CLIENT_ID` is set and that the redirect URI used by the app is registered in the Spotify Developer Dashboard.
