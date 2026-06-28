# Cyclog – Roadmap

Langfristiger Plan zur Weiterentwicklung. Wir bleiben eine **PWA** (Web-App),
liefern in **kleinen, einzeln mergebaren Schritten** aus (Merge → Vercel deployt
automatisch) und verbessern stetig.

**Leitprinzipien**
- Klein & häufig ausliefern
- Erst messen (Beta-Feedback/Analytics), dann bauen
- Web zuerst – native Hülle (Capacitor) nur als späterer Trigger, kein Neubau

**Prioritäten:** 1) Offline · 2) Benachrichtigungen · 3) Design · 4) Funktionalität

---

## 1. Offline (PWA-Fundament)
- [x] Service Worker, Web-App-Manifest, App-Icons (aus CYCLOG-Logo)
- [x] App lädt offline (App-Shell + Fonts im Cache)
- [x] Supabase-Daten offline sichtbar (NetworkFirst: online frisch, offline zuletzt geladen)
- [x] „Installieren"-Hinweis (Android/Desktop-Prompt + iOS-Tipp)
- [ ] Feinschliff: Offline-Status-Anzeige in der UI, „Update verfügbar"-Hinweis
- [ ] Schreibaktionen offline puffern und später synchronisieren (später)

## 2. Benachrichtigungen
- [ ] **Phase A – E-Mail-Erinnerungen:** geplanter Supabase-Job (pg_cron) →
      Edge Function prüft fällige Tracker → Mail via Resend. Opt-in + Frequenz
- [ ] **Phase B – Web-Push:** VAPID-Keys, Push aus Edge Function, nutzt den
      Service Worker aus Schritt 1 (Android/Desktop; iOS nur als Homescreen-PWA)
- [ ] **Phase C – In-App-Inbox:** Glocke mit Verlauf erledigter/fälliger Wartung

## 3. Design
- [ ] „Pro"-Politur schrittweise einziehen (Navy/Tech-Look, aber feiner):
  - [ ] Tracker-Karten + Hero (Hairlines, Typo-Hierarchie, Kontext-Infos, Status-Labels)
  - [ ] Header + Navigation + monochrome Line-Icons
  - [ ] dezent abgerundete Ecken, tabellarische Ziffern
- [ ] Onboarding-Flow für neue (Beta-)Nutzer

## 4. Funktionalität
- [ ] Service-Historie & Kosten pro Rad
- [ ] Verschleiß nach echtem Fahren (Höhenmeter/Watt/Terrain gewichten)
- [ ] Strava: Aktivität automatisch dem richtigen Rad zuordnen
- [ ] Teile-Inventar + Wechsel-Empfehlungen
- [ ] Reifendruck-Empfehlung aus eigener Druck-Datenbank
- [ ] Englische Übersetzung (i18n) – größerer Testerkreis

---

## Beta-Tester (begleitend)
- [ ] Fehler-Monitoring (Sentry, Free-Tier)
- [ ] In-App-Feedback-Button → Supabase-Tabelle / Mail
- [ ] Nutzungs-Analytics, datenschutzfreundlich (Plausible/Umami/PostHog)
- [ ] „Was ist neu"-Screen + Changelog
- [ ] Zugang per Einladungslink/Code (kleiner Kreis 5–15 Radfahrer)

## „Echte App" – späterer Trigger
PWA bleibt der Standard. **Capacitor-Wrap** (App Store / Play Store) erst, wenn:
- Tester ausdrücklich Store-Präsenz wünschen, **oder**
- verlässliche iOS-Push gebraucht wird (Web-Push reicht nicht), **oder**
- Richtung öffentliches Produkt/Monetarisierung.
Vorteil: Capacitor nutzt den bestehenden Code zu ~95 % weiter – kein Neubau.

---

## Horizonte
| Horizont | Fokus | Inhalt |
|---|---|---|
| **H1 – Fundament** | startklar | Offline/PWA ✓ · Pro-Design · Feedback-Button + Sentry · E-Mail-Erinnerungen |
| **H2 – Beta & Lernen** | Tester + Daten | Beta einladen · Analytics · Web-Push · Service-Historie · i18n |
| **H3 – Reife** | vertiefen | Terrain-Verschleiß · Teile-Inventar · In-App-Inbox · ggf. Capacitor/Premium |

_Stand: laufend gepflegt. Abgehakte Punkte sind live auf `main`._
