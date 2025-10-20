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
  if (!w || !w.Capacitor || !w.Capacitor.Plugins) return null
  return w.Capacitor.Plugins.Updater || null
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
  // Accept both vX.Y.Z and X.Y.Z comparisons
  const newer = isNewerVersion(remote, currentVersion)
  if (!newer && remote !== currentVersion && remote !== `v${currentVersion}`) {
    return null
  }
  return manifest
}

export async function applyOtaUpdate(manifest: OtaManifest): Promise<boolean> {
  const updater = getUpdater()
  if (!updater) {
    alert('Updater indisponibil pe această platformă. Instalează pluginul OTA pentru actualizări fără reinstalare.')
    return false
  }
  try {
    if (typeof updater.download === 'function') {
      await updater.download({ url: manifest.url, version: manifest.version, checksum: manifest.sha256 })
    }
    if (typeof updater.set === 'function') {
      await updater.set({ id: manifest.version })
    }
    if (typeof updater.reload === 'function') {
      await updater.reload()
    } else if (typeof updater.apply === 'function') {
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
    if (typeof updater.reset === 'function') {
      await updater.reset()
    } else if (typeof updater.remove === 'function') {
      await updater.remove()
    } else if (typeof updater.set === 'function') {
      await updater.set({ id: 'base' })
    }
    if (typeof updater.reload === 'function') {
      await updater.reload()
    }
    return true
  } catch (e) {
    console.error('OTA rollback error', e)
    alert('Rollback-ul a eșuat. Încearcă din nou.')
    return false
  }
}
