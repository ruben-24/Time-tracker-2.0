# Time Tracker 2.0

Aplicație Vue + Capacitor pentru contorizarea timpului de lucru și pauzelor, cu import/export de date și configurare pentru iOS (sideload).

## Funcționalități
- Contorizare lucru și pauze
- Adăugare manuală sesiuni (ore, minute, secunde)
- Adrese: implicită și personalizată
- Import/Export JSON
- Rulează în fundal (notificări locale pentru awareness)

## Stack
- Vue 3 + Vite + TypeScript
- Pinia pentru state management
- Tailwind CSS pentru UI
- Capacitor (iOS)

## Dezvoltare
```bash
npm install
npm run dev
```

## Build Web
```bash
npm run build
```

## iOS (sideload)
1. Build web:
   ```bash
   npm run build
   ```
2. Sync Capacitor:
   ```bash
   npx cap sync ios
   ```
3. Deschide proiectul Xcode:
   ```bash
   npx cap open ios
   ```
4. Configurează semnarea în Xcode și rulează pe dispozitiv.

## Import/Export
- Export: butonul "Exportă date" generează JSON.
- Import: selectează un fișier `.json` valid.

## Note
- Pentru verificări stricte TypeScript, folosește Node 20.x cu `vue-tsc`.
