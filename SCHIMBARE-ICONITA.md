# Cum să schimbi iconița aplicației iOS

Acest ghid te ajută să schimbi iconița aplicației ChronoFlux pentru iOS **direct din GitHub**, fără a avea nevoie de Xcode sau macOS.

## 📋 Proces Simplificat

### Pas 1: Pregătește noua iconița

1. Creează sau obține o imagine SVG pentru iconița ta nouă
2. Asigură-te că:
   - Fișierul este în format **SVG**
   - Dimensiunile sunt pătrate (ex: 1024x1024px sau orice dimensiune pătrată)
   - Design-ul este clar și vizibil la dimensiuni mici
   - Fundalul este transparent sau solid (evită gradient-uri complexe în fundal)

### Pas 2: Înlocuiește iconița pe GitHub

1. Navighează la repository-ul tău pe GitHub
2. Mergi la folderul `resources/`
3. Găsește fișierul `icon.svg`
4. Click pe fișier, apoi click pe butonul de edit (creion) sau delete
5. Șterge fișierul existent și upload-ează noua ta iconița SVG
6. **IMPORTANT**: Asigură-te că noua iconița se numește exact `icon.svg`
7. Scrie un mesaj de commit (ex: "Update app icon")
8. Click pe "Commit changes"

### Pas 3: Generarea automată

După ce ai commit-at noua iconița:

1. GitHub Actions va detecta automat schimbarea
2. Va rula workflow-ul `Generate App Icons`
3. Workflow-ul va:
   - Genera toate dimensiunile necesare pentru iOS (20px până la 1024px)
   - Crea folderul `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
   - Genera toate fișierele PNG necesare
   - Commit-a automat toate schimbările înapoi în repository

4. Procesul durează aproximativ 2-3 minute
5. Poți urmări progresul în tab-ul "Actions" din GitHub

### Pas 4: Verificare

1. Mergi la tab-ul "Actions" pe GitHub
2. Caută workflow-ul "Generate App Icons"
3. Verifică că s-a finalizat cu succes (bifă verde ✓)
4. Verifică că există un nou commit automat cu mesajul "chore: Update app icons [skip ci]"

## 🔄 Generare Manuală (opțional)

Dacă vrei să rulezi generarea manual:

1. Mergi la tab-ul "Actions"
2. Selectează workflow-ul "Generate App Icons"
3. Click pe "Run workflow"
4. Selectează branch-ul dorit
5. Click pe "Run workflow" din meniul dropdown

## 📁 Structura Generată

După procesare, GitHub Actions va crea următoarea structură în folderul `ios/`:

```
ios/
└── App/
    └── App/
        └── Assets.xcassets/
            └── AppIcon.appiconset/
                ├── Contents.json
                ├── AppIcon-20x20@1x.png
                ├── AppIcon-20x20@2x.png
                ├── AppIcon-20x20@3x.png
                ├── AppIcon-29x29@1x.png
                ├── AppIcon-29x29@2x.png
                ├── AppIcon-29x29@3x.png
                ├── AppIcon-40x40@1x.png
                ├── AppIcon-40x40@2x.png
                ├── AppIcon-40x40@3x.png
                ├── AppIcon-60x60@2x.png
                ├── AppIcon-60x60@3x.png
                ├── AppIcon-76x76@1x.png
                ├── AppIcon-76x76@2x.png
                ├── AppIcon-83.5x83.5@2x.png
                └── AppIcon-1024x1024@1x.png
```

## 🛠️ Comenzi Disponibile

În `package.json` ai acum următoarele comenzi utile:

- `npm run generate:icons` - Generează iconițele din `resources/icon.svg`
- `npm run sync:ios` - Sincronizează proiectul Capacitor cu iOS

## ⚠️ Notițe Importante

1. **Format SVG obligatoriu**: Iconița trebuie să fie în format SVG pentru a genera automat toate dimensiunile
2. **Nume fix**: Fișierul trebuie să se numească exact `icon.svg` în folderul `resources/`
3. **Design simplu**: Iconițele iOS sunt mici, evită detalii foarte fine
4. **Culori**: Asigură-te că iconița arată bine pe fundaluri diferite
5. **Preview**: Poți folosi [tools.appicon.co](https://tools.appicon.co) pentru preview înainte de upload

## 🎨 Recomandări Design

- **Formă**: IOS adaugă automat colțuri rotunjite, nu le include în design
- **Margini**: Lasă 10% margine în jurul elementului principal
- **Contrast**: Folosește culori cu contrast bun pentru vizibilitate
- **Simplitate**: Design-uri simple funcționează mai bine la dimensiuni mici
- **Test**: Verifică cum arată iconița la diferite dimensiuni

## 🔍 Debugging

Dacă GitHub Action eșuează:

1. Verifică tab-ul "Actions" pentru log-uri detaliate
2. Asigură-te că `resources/icon.svg` este un fișier SVG valid
3. Verifică că `capacitor.assets.json` există și este valid
4. Rulează manual workflow-ul din GitHub Actions

## 📞 Suport

Pentru probleme sau întrebări:
- Verifică log-urile din GitHub Actions
- Testează local cu `npm run generate:icons` (dacă ai Node.js instalat)
- Verifică documentația Capacitor Assets: https://github.com/ionic-team/capacitor-assets
