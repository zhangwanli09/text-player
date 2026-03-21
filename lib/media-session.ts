export function setupMediaSession(options: {
  title: string;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
}) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: options.title,
    artist: 'TextPlayer',
  });

  navigator.mediaSession.setActionHandler('play', options.onPlay);
  navigator.mediaSession.setActionHandler('pause', options.onPause);
  navigator.mediaSession.setActionHandler('stop', options.onStop);
}

export function clearMediaSession() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

  navigator.mediaSession.metadata = null;
  navigator.mediaSession.setActionHandler('play', null);
  navigator.mediaSession.setActionHandler('pause', null);
  navigator.mediaSession.setActionHandler('stop', null);
}

export function updatePlaybackState(state: 'playing' | 'paused' | 'none') {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  navigator.mediaSession.playbackState = state;
}
