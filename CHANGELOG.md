# Changelog

All notable changes to this project will be documented in this file.

## [2.1.0] - 2024-12-19

### Added
- **Auto-save pentru setări** - modificările din setări se salvează automat
- **Incrementare automată a versiunii** - la fiecare push se incrementează versiunea
- **Changelog în aplicație** - istoricul modificărilor disponibil în aplicație

### Fixed
- **Logica pauzelor în sesiuni** - pauzele se salvează corect în sesiunea activă
- **Timer de pauză continuu** - nu se mai resetează când apesi "Pauză" din nou
- **Salvare pauze în istoric** - pauzele apar ca sesiuni separate cu referință la sesiunea de lucru

### Improved
- **Persistența setărilor** - toate setările se salvează automat în localStorage
- **Gestionarea versiunilor** - sistem automat de versioning
- **Documentația modificărilor** - changelog complet cu toate îmbunătățirile

## [2.0.0] - 2024-12-19

### Added
- **Design profesional și sexy** - glassmorphism, animații, gradienturi
- **Temă dinamică** - 20+ preset-uri de background și butoane
- **Culori personalizabile** - picker pentru culori custom
- **Efecte vizuale** - particule, glass effect, animații
- **Butoane floating** - accesibile tot timpul pe main page
- **Setări extinse** - esențiale, notificări, performanță, avansate
- **Import/Export** - backup în fișiere și iCloud
- **Gestionare adrese** - cu tarife și selectare
- **Adăugare manuală** - sesiuni integrate cu pauze
- **Timer logic perfect** - work/pause/resume/end
- **Istoric și statistici** - toate sesiunile și analizele

### Technical
- **Vue.js 3** - framework modern
- **Pinia** - state management
- **Tailwind CSS** - styling utility-first
- **Capacitor** - integrare mobile
- **TypeScript** - type safety