# Instalare iOS (Sideload)

1. Asigură-te că ai Xcode instalat și un cont Apple (gratuit sau developer).
2. În proiect, rulează:
   ```bash
   npm run build
   npx cap sync ios
   npx cap open ios
   ```
3. În Xcode, setează Signing & Capabilities la propriul tău Team.
4. Conectează iPhone-ul prin USB. Selectează dispozitivul ca target și rulează.
5. Prima instalare poate necesita să accepți certificatele în Settings > General > Device Management.

Note:
- Notificările locale pot necesita acordarea permisiunii la prima rulare.
- Pentru rulare în fundal, iOS limitează execuția; aplicația păstrează timpul prin timestamp-uri și notificări pentru awareness.
