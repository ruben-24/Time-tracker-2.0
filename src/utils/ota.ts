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
  const plugins = w?.Capacitor?.Plugins
  if (!plugins) return null
  // Try common plugin identifiers across ecosystems
  return (
    plugins.CapacitorUpdater ||
    plugins.Updater ||
    plugins.capacitorUpdater ||
    null
  )
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

    if (can('download')) {
      // Support different parameter shapes across plugins
      await updater.download({
        url: manifest.url,
        version: manifest.version,
        id: manifest.version,
        checksum: manifest.sha256,
      })
    }
    if (can('set')) {
      await updater.set({ id: manifest.version, version: manifest.version })
    }
    if (can('reload')) {
      await updater.reload()
    } else if (can('restart')) {
      await updater.restart()
    } else if (can('apply')) {
      await updater.apply()
    }
    return true
  } catch (e) {
    console.error('OTA apply error', e)
    alert('Aplicarea update-ului a eșuat. Încearcă din nou.')
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
