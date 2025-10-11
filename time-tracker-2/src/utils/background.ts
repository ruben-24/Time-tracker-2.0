import { App } from '@capacitor/app'
import { LocalNotifications } from '@capacitor/local-notifications'

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
              title: 'Time Tracker 2.0',
              body: 'Cronometrul rulează în fundal',
              schedule: { at: new Date(Date.now() + 1000) },
            },
          ],
        })
      } catch {}
    }
  })
}
