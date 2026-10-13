NFC Maths Alarm - Java Android starter project

Features:
- Set an exact alarm using Android AlarmManager.
- Foreground service plays the alarm sound in a loop.
- Alarm activity can appear over the lock screen on supported Android versions/settings.
- NFC foreground dispatch checks for a text NDEF record containing NFC_MATHS_ALARM_2026.
- Five fixed arithmetic questions; wrong answers do not dismiss the alarm.

IMPORTANT LIMITATIONS:
- This is a starter/demo project and has not been built or tested on your phone.
- NFC reading generally requires the screen to be on; the user may need to wake/unlock the phone before scanning, depending on device/security settings.
- Android/OEM power management and full-screen-intent restrictions can affect lock-screen behavior.
- Android 13+ notification permission and Android 12+ exact alarm permission may need to be enabled in Settings.
- Do not rely on this prototype as a safety-critical alarm.

Build requirements:
- JDK 17
- Android SDK Platform 35 and Build Tools installed
- Gradle 8.9+ (or a compatible Gradle distribution)

To build from this folder:
  gradle assembleDebug
APK output:
  app/build/outputs/apk/debug/app-debug.apk

Write an NFC NDEF Text record exactly:
  NFC_MATHS_ALARM_2026

The demo-only button skips NFC for testing and should be removed for a final strict demonstration.
