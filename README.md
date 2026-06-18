# 🚴 Cyclog

Dein digitales Fahrrad-Gedächtnis: Verschleiß-Tracker, Komponenten-Verwaltung, Setups, Bike-Fit-Archiv, Race-Archiv und Reifendruck-Datenbank. Mit Strava-Sync über alle Geräte.

Gebaut mit **Vite + React + Supabase**. Läuft als Website auf Desktop, Tablet und Smartphone.

---

## 📦 Was ist enthalten

| Modul | Beschreibung |
|-------|-------------|
| **Dashboard** | Alle Bikes, km-Stände, fällige Wartungen auf einen Blick |
| **Verschleiß-Tracker** | Balken füllt sich mit gefahrenen km bis zum Intervall |
| **Bike-Detail** | Komplette Komponenten-Konfiguration (Rahmen, Cockpit, Schaltung, Laufräder, Reifen, Bremsen, Fahrwerk) + Geometrie |
| **Setups** | Komplette Konfigurationen speichern & zwei vergleichen |
| **Bike-Fit Archiv** | Jede Sitzposition historisch & reproduzierbar |
| **Race-Archiv** | Rennen mit Setup + Ergebnis dokumentieren |
| **Reifendruck-DB** | Persönliche Erfahrungsdatenbank mit Bewertung |
| **Strava** | OAuth-Login, Bikes & km automatisch importieren |

---

## 🚀 Setup in 5 Schritten

### 1. Projekt installieren

```bash
npm install
```

### 2. Supabase-Projekt anlegen

1. Gehe zu [supabase.com](https://supabase.com) → neues Projekt erstellen (kostenlos)
2. Öffne im Dashboard den **SQL Editor**
3. Kopiere den kompletten Inhalt von `supabase/schema.sql` hinein und führe ihn aus
   → legt alle Tabellen, Sicherheitsregeln und Trigger an

### 3. Umgebungsvariablen setzen

Kopiere `.env.example` zu `.env`:

```bash
cp .env.example .env
```

Trage deine Werte ein (findest du in Supabase unter **Settings → API**):

```
VITE_SUPABASE_URL=https://deinprojekt.supabase.co
VITE_SUPABASE_ANON_KEY=dein_anon_key
VITE_STRAVA_CLIENT_ID=deine_strava_id
```

### 4. Lokal starten

```bash
npm run dev
```

Öffnet auf `http://localhost:5173`.
Dank `host: true` ist die App auch im lokalen Netzwerk erreichbar — z.B. vom Handy unter `http://DEINE-LAPTOP-IP:5173`.

### 5. Login

Cyclog nutzt **Magic-Link Login** (kein Passwort): E-Mail eingeben → Link in der Mail klicken → eingeloggt. Funktioniert sofort, ohne weitere Einrichtung.

---

## 🟠 Strava einrichten (optional)

### Strava-App anlegen

1. Gehe zu [strava.com/settings/api](https://www.strava.com/settings/api)
2. Erstelle eine App:
   - **Authorization Callback Domain:** deine Domain (lokal: `localhost`, später z.B. `cyclog.vercel.app`)
3. Notiere **Client ID** (ins `.env`) und **Client Secret** (NUR server-seitig, siehe unten)

### Edge Functions deployen

Die Strava-Tokens und das Secret bleiben server-seitig in Supabase Edge Functions:

```bash
# Supabase CLI installieren (einmalig)
npm install -g supabase

# Einloggen & verknüpfen
supabase login
supabase link --project-ref DEIN-PROJEKT-REF

# Secrets setzen (Client Secret bleibt NUR hier!)
supabase secrets set STRAVA_CLIENT_ID=deine_id
supabase secrets set STRAVA_CLIENT_SECRET=dein_secret

# Functions deployen
supabase functions deploy strava-auth
supabase functions deploy strava-sync
```

Danach in der App auf **„Mit Strava verbinden"** → autorisieren → Bikes & km werden importiert.

---

## 🌐 Online stellen (Vercel)

```bash
npm install -g vercel
vercel
```

1. Folge den Anweisungen
2. Trage im Vercel-Dashboard die gleichen `VITE_*` Umgebungsvariablen ein
3. Aktualisiere die **Strava Callback Domain** auf deine Vercel-URL

Danach ist Cyclog von jedem Gerät über die Vercel-URL erreichbar — die Daten synchronisieren automatisch über Supabase.

---

## 🗂️ Projektstruktur

```
cyclog-app/
├── index.html
├── vite.config.js          # host:true für Netzwerkzugriff
├── .env.example
├── src/
│   ├── main.jsx
│   ├── App.jsx             # Routing + Auth-Gate
│   ├── lib/
│   │   ├── supabase.js     # Supabase Client
│   │   ├── auth.jsx        # Login/Session (Magic-Link)
│   │   ├── data.js         # ALLE Datenbank-Abfragen + Konstanten
│   │   └── helpers.js      # Tracker-Berechnungen
│   ├── components/
│   │   ├── NavBar.jsx      # untere Navigation
│   │   ├── TrackerCard.jsx # Verschleiß-Balken
│   │   └── ui.jsx          # gemeinsame Bausteine (Sheet, Field, Buttons)
│   └── pages/
│       ├── Login.jsx
│       ├── Dashboard.jsx       # Start: Bikes + Tracker + Status
│       ├── BikeDetail.jsx      # Komponenten + Geometrie
│       ├── Setups.jsx          # Setups + Vergleich
│       ├── BikeFitArchive.jsx  # Positionen
│       ├── RaceArchive.jsx     # Rennen
│       ├── TyrePressureDB.jsx  # Reifendruck
│       └── ConnectStrava.jsx   # OAuth
└── supabase/
    ├── schema.sql              # komplettes Datenbank-Schema
    └── functions/
        ├── strava-auth/        # OAuth Code → Token
        └── strava-sync/        # Bikes & km abrufen
```

---

## 🎨 Design

Duolingo-inspiriert: Nunito-Schrift, kräftiges Grün `#58cc02`, dicke abgerundete Karten mit Schatten-Offset, klare Statusfarben (grün/gelb/rot). Mobile-First, max. 2–3 Klicks für häufige Aktionen.

---

## 🔜 Nächste Ausbaustufen

- Fotoarchiv (Supabase Storage Bucket anlegen, `photos`-Tabelle ist vorbereitet)
- Aktivitäten-Import (Tabelle `activities` vorbereitet)
- E-Mail-Benachrichtigungen bei fälligen Wartungen
- Dark Mode (Spalte `theme` in `profiles` vorbereitet)
- Gewichts-Vergleiche zwischen Setups

Das Datenmodell deckt all das bereits ab — die Tabellen sind angelegt.
