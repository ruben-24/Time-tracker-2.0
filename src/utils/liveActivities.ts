/* Lock Screen controls and Live Activities helpers (iOS-first).
   If a Live Activities plugin is not available, falls back to
   time-sensitive Local Notifications with action buttons.
*/
import { LocalNotifications, ScheduleOptions, ActionPerformed } from '@capacitor/local-notifications'

let initialized = false
const NOTIF_ID = 101 // single-slot replacement

export async function setupLockScreenControls(onAction: (actionId: string) => void) {
  if (initialized) return
  try {
    await LocalNotifications.requestPermissions()
    // Define actionable categories for lock screen
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: 'work-controls',
          actions: [
            { id: 'PAUSE', title: 'Pauză', destructive: false },
            { id: 'END', title: 'Încheie', destructive: true },
          ],
        },
        {
          id: 'break-controls',
          actions: [
            { id: 'RESUME', title: 'Reia', destructive: false },
            { id: 'END', title: 'Încheie', destructive: true },
          ],
        },
      ],
    })

    LocalNotifications.addListener('localNotificationActionPerformed', (event: ActionPerformed) => {
      try {
        onAction(event.actionId)
      } catch {}
    })

    initialized = true
  } catch (e) {
    console.error('Failed to setup lock screen controls', e)
  }
}

export async function showWorkingNotification(elapsedLabel: string) {
  const opts: ScheduleOptions = {
    notifications: [
      {
        id: NOTIF_ID,
        title: 'Lucru în desfășurare',
        body: elapsedLabel,
        actionTypeId: 'work-controls',
        schedule: { at: new Date(Date.now() + 10) },
        extra: { kind: 'work' },
        attachments: [],
        smallIcon: 'ic_stat_icon',
        channelId: 'default',
        sound: undefined,
      },
    ],
  }
  try {
    await LocalNotifications.cancel({ notifications: [{ id: NOTIF_ID }] })
  } catch {}
  await LocalNotifications.schedule(opts)
}

export async function showBreakNotification(elapsedLabel: string) {
  const opts: ScheduleOptions = {
    notifications: [
      {
        id: NOTIF_ID,
        title: 'Pauză în desfășurare',
        body: elapsedLabel,
        actionTypeId: 'break-controls',
        schedule: { at: new Date(Date.now() + 10) },
        extra: { kind: 'break' },
        attachments: [],
        smallIcon: 'ic_stat_icon',
        channelId: 'default',
        sound: undefined,
      },
    ],
  }
  try {
    await LocalNotifications.cancel({ notifications: [{ id: NOTIF_ID }] })
  } catch {}
  await LocalNotifications.schedule(opts)
}

export async function clearLockScreenNotification() {
  try {
    await LocalNotifications.cancel({ notifications: [{ id: NOTIF_ID }] })
  } catch {}
}
