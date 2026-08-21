Drop sound effect files here, e.g.:

- `success.mp3`
- `error.mp3`
- `notification.mp3`
- `click.mp3`

Play them with the `useSound` hook (`src/hooks/use-sound.ts`), e.g. `useSound("success")`.
Playback is skipped automatically while the user has sound muted (see `SoundProvider`).
