/* OTA helper utilities for Capacitor apps.
   Works with updater plugins (e.g., @capgo/capacitor-updater) if present.
   On web or missing plugin, it will no-op gracefully and inform the user.
*/

export interface OtaManifest {
  version: string
  url: string
  sha256?: string
  createdAt?: string
}

const getUpdater = (): any | null => {
  const w = window as any
  const cap = w?.Capacitor
  // Ensure we're on a native platform (not web) before accessing plugins
  if (!cap || (typeof cap.isNativePlatform === 'function' && !cap.isNativePlatform())) return null
  const plugins = cap?.Plugins
  if (!plugins) return null
  // Try common plugin identifiers across ecosystems
  return (
    plugins.CapacitorUpdater ||
    plugins.Updater ||
    plugins.capacitorUpdater ||
    null
  )
}

export function hasOtaSupport(): boolean {
  return !!getUpdater()
}

export async function fetchManifest(manifestUrl: string): Promise<OtaManifest | null> {
  try {
    const res = await fetch(manifestUrl, { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as OtaManifest
    if (!data || !data.version || !data.url) return null
    return data
  } catch {
    return null
  }
}

export function isNewerVersion(remote: string, current: string): boolean {
  const norm = (v: string) => v.replace(/^v/i, '')
  const r = norm(remote).split('.').map(n => parseInt(n || '0', 10))
  const c = norm(current).split('.').map(n => parseInt(n || '0', 10))
  for (let i = 0; i < Math.max(r.length, c.length); i++) {
    const rv = r[i] || 0
    const cv = c[i] || 0
    if (rv > cv) return true
    if (rv < cv) return false
  }
  return false
}

export async function checkForOtaUpdate(manifestUrl: string, currentVersion: string): Promise<OtaManifest | null> {
  const manifest = await fetchManifest(manifestUrl)
  if (!manifest) return null
  const remote = manifest.version
  // If remote is not strictly newer (handles v-prefix), do not offer update
  const newer = isNewerVersion(remote, currentVersion)
  return newer ? manifest : null
}

export async function applyOtaUpdate(manifest: OtaManifest): Promise<boolean> {
  const updater = getUpdater()
  if (!updater) {
    alert('Updater indisponibil pe această platformă. Instalează pluginul OTA pentru actualizări fără reinstalare.')
    return false
  }
  try {
    const can = (fn: string) => typeof (updater as any)?.[fn] === 'function'

    // 1) Download bundle (capture returned id/version)
    let downloadId: string | undefined
    if (can('download')) {
      try {
        const res = await (updater as any).download({
          url: manifest.url,
          version: manifest.version,
          id: manifest.version,
          checksum: manifest.sha256,
          hash: manifest.sha256,
        })
        downloadId = (res && (res.id || res.version)) || manifest.version
      } catch (_) {
        const res2 = await (updater as any).download({ url: manifest.url, version: manifest.version })
        downloadId = (res2 && (res2.id || res2.version)) || manifest.version
      }
    }

    // 2) Select downloaded id/version if supported
    if (can('set')) {
      await (updater as any).set({ id: downloadId || manifest.version, version: downloadId || manifest.version })
    }

    // 3) Apply
    if (can('reload')) {
      await (updater as any).reload()
    } else if (can('restart')) {
      await (updater as any).restart()
    } else if (can('apply')) {
      await (updater as any).apply()
    }
    return true
  } catch (e) {
    console.error('OTA apply error', e)
    const message = (e as any)?.message || 'Eroare necunoscută'
    alert(`Aplicarea update-ului a eșuat: ${message}`)
    return false
  }
}

export async function rollbackOtaUpdate(): Promise<boolean> {
  const updater = getUpdater()
  if (!updater) {
    alert('Updater indisponibil pe această platformă.')
    return false
  }
  try {
    const can = (fn: string) => typeof (updater as any)?.[fn] === 'function'

    if (can('reset')) {
      await updater.reset()
    } else if (can('remove')) {
      await updater.remove()
    } else if (can('set')) {
      await updater.set({ id: 'base' })
    }
    if (can('reload')) {
      await updater.reload()
    } else if (can('restart')) {
      await updater.restart()
    }
    return true
  } catch (e) {
    console.error('OTA rollback error', e)
    alert('Rollback-ul a eșuat. Încearcă din nou.')
    return false
  }
}
