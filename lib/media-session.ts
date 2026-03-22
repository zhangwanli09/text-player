/**
 * Media Session API 封装
 * 用于在手机锁屏/通知栏显示当前播放信息及控制按钮（播放/暂停/停止）
 * 非浏览器环境（SSR）下所有操作静默跳过
 */

/**
 * 设置 Media Session 元数据和操作回调
 * 调用后锁屏界面会显示标题和播放控制按钮
 */
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

/** 清除 Media Session 元数据和所有操作回调 */
export function clearMediaSession() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

  navigator.mediaSession.metadata = null;
  navigator.mediaSession.setActionHandler('play', null);
  navigator.mediaSession.setActionHandler('pause', null);
  navigator.mediaSession.setActionHandler('stop', null);
}

/** 更新播放状态（用于同步锁屏界面的播放/暂停图标） */
export function updatePlaybackState(state: 'playing' | 'paused' | 'none') {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  navigator.mediaSession.playbackState = state;
}
