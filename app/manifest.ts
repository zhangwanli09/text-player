import type { MetadataRoute } from 'next'

/**
 * PWA Web App Manifest 配置
 * 使应用可以被添加到手机桌面，以独立窗口模式运行
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TextPlayer - 文本播放器',
    short_name: 'TextPlayer',
    description: '粘贴文本或 URL，用自然的声音播放',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#18181b',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
