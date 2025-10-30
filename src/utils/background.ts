import { App } from '@capacitor/app'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

export async function setupBackgroundHandlers() {
  try {
    await LocalNotifications.requestPermissions()
  } catch {}

  App.addListener('appStateChange', async ({ isActive }) => {
    if (!isActive) {
      // Keep user aware timer is running
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Date.now() % 2147483647,
              title: 'ChronoFlux',
              body: 'Cronometrul rulează în fundal',
              schedule: { at: new Date(Date.now() + 1000) },
            },
          ],
        })
      } catch {}
      try { await Haptics.impact({ style: ImpactStyle.Light }) } catch {}
    }
  })
}
