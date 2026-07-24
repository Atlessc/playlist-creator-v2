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
6. Review the matched and unmatched counts.
7. Upload the confident matches.

## Rate-limit behavior

- Searches run sequentially instead of launching 1,000 requests at once.
- The default delay is 400 ms plus a small random jitter.
- HTTP 429 responses respect Spotify's `Retry-After` header when present.
- Temporary Spotify 5xx errors use exponential backoff with jitter.
- Search and upload progress is checkpointed to `localStorage`.
- Searches and uploads can be paused safely and resumed after a refresh.
- Playlist uploads are split into batches of 100 Spotify URIs.

## Matching behavior

The importer searches using exact track and artist qualifiers when an artist is present. It scores the returned candidates and rejects low-confidence matches rather than silently uploading the wrong recording.

Unless the input specifically requests one, alternate versions such as live, remix, karaoke, tribute, acoustic, sped-up, slowed, and remastered tracks receive a matching penalty.

Use **Download unmatched JSON** to export anything that needs manual correction.

## Spotify setup

The app needs these scopes:

- `playlist-modify-private`
- `playlist-modify-public`
- `user-read-private`

Ensure `VITE_SPOTIFY_CLIENT_ID` is set and that the redirect URI used by the app is registered in the Spotify Developer Dashboard.
