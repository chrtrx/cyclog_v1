import {
  getBikes, getComponents, getComponentHistory, getTrackers, getAllServiceLogs,
  getRaces, getEvents, getRideConditions, getSetups, getBikeFits, getUpgrades,
  getCustomServiceTypes, getTyrePressures,
} from './data'
import { TABLES } from './backupFormat'

// Vollstaendige Sicherung aller Nutzerdaten. Zweck ist ausdruecklich NICHT
// Bequemlichkeit, sondern Unabhaengigkeit: Die Datei muss auch dann noch
// lesbar sein, wenn es diese App nicht mehr gibt – deshalb CSV/Excel als
// Hauptformat und JSON zusaetzlich fuer eine spaetere Rueck-Einspielung.

const safe = (p) => p.catch(() => [])
const flat = (arrays) => arrays.flat()

export async function collectBackup(userId) {
  const bikes = await safe(getBikes(userId))
  const byBike = async (fn) => flat(await Promise.all(bikes.map(b =>
    safe(fn(b.id)).then(rows => (rows || []).map(r => ({ rad: b.name, ...r }))))))

  const [
    teile, teileVerlauf, tracker, wartungen, rennen, ereignisse,
    fahrten, setups, fits, upgrades, eigene, druck,
  ] = await Promise.all([
    byBike(getComponents), byBike(getComponentHistory),
    safe(getTrackers(userId)), safe(getAllServiceLogs(userId)),
    safe(getRaces(userId)), safe(getEvents(userId)),
    byBike(getRideConditions), safe(getSetups(userId)),
    byBike(getBikeFits), byBike(getUpgrades),
    safe(getCustomServiceTypes(userId)), safe(getTyrePressures(userId)),
  ])

  // Rad-Namen statt roher IDs, wo es die Lesbarkeit verbessert.
  const nameOf = Object.fromEntries(bikes.map(b => [b.id, b.name]))
  const withBike = (rows) => rows.map(r => (r.bike_id ? { rad: nameOf[r.bike_id] || '', ...r } : r))

  return {
    erstellt: new Date().toISOString(),
    raeder: bikes,
    teile, teile_verlauf: teileVerlauf,
    tracker: withBike(tracker), wartungen: withBike(wartungen),
    rennen: withBike(rennen), ereignisse: withBike(ereignisse),
    fahrten, setups: withBike(setups), bike_fits: fits, upgrades,
    eigene_typen: eigene, reifendruck: withBike(druck),
  }
}


export { toCsv, backupSummary, saveFile, TABLES } from './backupFormat'
