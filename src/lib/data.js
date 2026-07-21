import { supabase } from './supabase'

// ═══════════════════════════════════════════════════════════
// SERVICE-TYPEN (Vorlagen für Wartung/Tracker)
// ═══════════════════════════════════════════════════════════
export const SERVICE_TYPES = [
  { typeId:'chain-wax',    title:'Kette wachsen',         icon:'🔗', interval:1000,  cat:'Antrieb',   intervalType:'km' },
  { typeId:'chain-new',    title:'Kette tauschen',        icon:'⛓️', interval:2500,  cat:'Antrieb',   intervalType:'km' },
  { typeId:'cassette',     title:'Kassette tauschen',     icon:'⚙️', interval:12000, cat:'Antrieb',   intervalType:'km' },
  { typeId:'brake-pads',   title:'Bremsbeläge tauschen',  icon:'🛑', interval:4000,  cat:'Bremsen',   intervalType:'km' },
  { typeId:'rotors',       title:'Bremsscheiben prüfen',  icon:'💿', interval:15000, cat:'Bremsen',   intervalType:'km' },
  { typeId:'tyre-f',       title:'Reifen vorne',          icon:'🔵', interval:6000,  cat:'Reifen',    intervalType:'km' },
  { typeId:'tyre-r',       title:'Reifen hinten',         icon:'🔴', interval:4000,  cat:'Reifen',    intervalType:'km' },
  { typeId:'tubeless',     title:'Tubeless-Milch',        icon:'🥛', interval:500,   cat:'Reifen',    intervalType:'km' },
  { typeId:'bearings',     title:'Lager prüfen',          icon:'🔘', interval:5000,  cat:'Lager',     intervalType:'km' },
  { typeId:'headset',      title:'Steuersatz prüfen',     icon:'🧭', interval:5000,  cat:'Lager',     intervalType:'km' },
  { typeId:'spokes',       title:'Speichenspannung',      icon:'🎯', interval:3000,  cat:'Lager',     intervalType:'km' },
  { typeId:'fork-small',   title:'Federgabel (km)',        icon:'🔱', interval:5000,  cat:'Fahrwerk',  intervalType:'km' },
  { typeId:'fork-big',     title:'Federgabel groß (km)',   icon:'🔱', interval:10000, cat:'Fahrwerk',  intervalType:'km' },
  { typeId:'shock',        title:'Dämpfer-Service (km)',   icon:'🏗️', interval:5000,  cat:'Fahrwerk',  intervalType:'km' },
  { typeId:'dropper',      title:'Dropper-Service (km)',   icon:'📉', interval:8000,  cat:'Fahrwerk',  intervalType:'km' },
  { typeId:'fork-small-h', title:'Federgabel (Stunden)',   icon:'🔱', interval:50,    cat:'Fahrwerk',  intervalType:'h'  },
  { typeId:'fork-big-h',   title:'Federgabel groß (Std)', icon:'🔱', interval:100,   cat:'Fahrwerk',  intervalType:'h'  },
  { typeId:'shock-h',      title:'Dämpfer-Service (Std)', icon:'🏗️', interval:100,   cat:'Fahrwerk',  intervalType:'h'  },
  { typeId:'dropper-h',    title:'Dropper-Service (Std)', icon:'📉', interval:200,   cat:'Fahrwerk',  intervalType:'h'  },
  { typeId:'torque',       title:'Schrauben nachziehen',  icon:'🔩', interval:500,   cat:'Sonstiges', intervalType:'km' },
  // Datums-basierte Tracker (interval = Monate)
  { typeId:'tubeless-m',  title:'Tubeless-Milch (Monate)', icon:'🥛', interval:3,  cat:'Reifen',    intervalType:'date' },
  { typeId:'fork-oil-m',  title:'Gabelöl wechseln',      icon:'🔱', interval:12,  cat:'Fahrwerk',  intervalType:'date' },
  { typeId:'cable-m',     title:'Züge & Hüllen',          icon:'🪄', interval:12,  cat:'Sonstiges', intervalType:'date' },
  { typeId:'fullcheck-m', title:'Generalcheck (Werkstatt)',icon:'🔍', interval:12,  cat:'Sonstiges', intervalType:'date' },
  { typeId:'battery-m',   title:'Di2-Akku laden',         icon:'🔋', interval:1,   cat:'Elektronik',intervalType:'date' },
]

// ═══════════════════════════════════════════════════════════
// TEIL-KATEGORIEN (7 universelle Kategorien)
// ═══════════════════════════════════════════════════════════
export const PART_CATEGORIES = [
  { id: 'frame',      label: 'Rahmen & Gabel', icon: '🚲' },
  { id: 'drivetrain', label: 'Schaltgruppe',   icon: '⚙️' },
  { id: 'wheels',     label: 'Laufräder',      icon: '🛞' },
  { id: 'extras',     label: 'Anbauteile',     icon: '🔩' },
]

export const BIKE_TYPES = ['Rennrad','Gravel','MTB','Zeitfahrrad','Bikepacking','Indoor','E-Bike']

// ═══════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════
export async function getProfile(userId) {
  const { data } = await supabase.from('profiles').select('*').eq('user_id', userId).single()
  return data
}
export async function updateProfile(userId, updates) {
  const { error } = await supabase.from('profiles').update(updates).eq('user_id', userId)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════
// BIKES
// ═══════════════════════════════════════════════════════════
export async function getBikes(userId) {
  const { data, error } = await supabase
    .from('bikes').select('*').eq('user_id', userId).order('created_at')
  if (error) throw error
  return data
}
export async function getBike(bikeId) {
  const { data, error } = await supabase.from('bikes').select('*').eq('id', bikeId).single()
  if (error) throw error
  return data
}
export async function addBike(userId, bike) {
  const { data, error } = await supabase
    .from('bikes').insert({ ...bike, user_id: userId }).select().single()
  if (error) throw error
  return data
}
export async function updateBike(bikeId, updates) {
  const { error } = await supabase.from('bikes').update(updates).eq('id', bikeId)
  if (error) throw error
}
export async function deleteBike(bikeId) {
  const { error } = await supabase.from('bikes').delete().eq('id', bikeId)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════
// KOMPONENTEN
// ═══════════════════════════════════════════════════════════
export async function getComponents(bikeId) {
  const { data, error } = await supabase
    .from('components').select('*').eq('bike_id', bikeId).order('created_at')
  if (error) throw error
  return data
}
export async function upsertComponent(userId, component) {
  const payload = { ...component, user_id: userId }
  const { data, error } = await supabase
    .from('components').upsert(payload).select().single()
  if (error) throw error
  return data
}
export async function deleteComponent(componentId) {
  const { error } = await supabase.from('components').delete().eq('id', componentId)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════
// TRACKERS
// ═══════════════════════════════════════════════════════════
export async function getTrackers(userId) {
  const { data, error } = await supabase
    .from('trackers').select('*').eq('user_id', userId).order('start_date', { ascending: false })
  if (error) throw error
  return data
}
export async function addTracker(userId, tracker, { replace = true } = {}) {
  // replace=true (Standard): vorhandenen Tracker gleichen Typs ersetzen.
  // replace=false: zusätzlichen Tracker anlegen (bewusstes Duplikat).
  if (replace) {
    await supabase.from('trackers').delete()
      .eq('user_id', userId).eq('bike_id', tracker.bike_id).eq('type_id', tracker.type_id)
  }
  const { data, error } = await supabase
    .from('trackers').insert({ ...tracker, user_id: userId }).select().single()
  if (error) throw error
  return data
}
export async function updateTracker(trackerId, updates) {
  const { error } = await supabase.from('trackers').update(updates).eq('id', trackerId)
  if (error) throw error
}
export async function deleteTracker(trackerId) {
  const { error } = await supabase.from('trackers').delete().eq('id', trackerId)
  if (error) throw error
}

// ── Eigene Tracker-Typen (Symbol + Name) ──────────────────────
export async function getCustomServiceTypes(userId) {
  const { data, error } = await supabase
    .from('custom_service_types').select('*').eq('user_id', userId).order('created_at')
  if (error) throw error
  return data
}
export async function addCustomServiceType(userId, t) {
  const { data, error } = await supabase
    .from('custom_service_types')
    .insert({ ...t, user_id: userId, type_id: t.type_id || `custom-${Date.now()}` })
    .select().single()
  if (error) throw error
  return data
}
export async function deleteCustomServiceType(id) {
  const { error } = await supabase.from('custom_service_types').delete().eq('id', id)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════
// SERVICE LOG
// ═══════════════════════════════════════════════════════════
export async function getServiceLogs(bikeId) {
  const { data, error } = await supabase
    .from('service_logs').select('*').eq('bike_id', bikeId).order('service_date', { ascending: false })
  if (error) throw error
  return data
}
export async function addServiceLog(userId, log) {
  const { data, error } = await supabase
    .from('service_logs').insert({ ...log, user_id: userId }).select().single()
  if (error) throw error
  return data
}

// ── Bike-Fit-Historie ──────────────────────────────────────
export async function getFitHistory(bikeId) {
  const { data, error } = await supabase
    .from('fit_history').select('*').eq('bike_id', bikeId).order('created_at', { ascending: false })
  if (error) throw error
  return data
}
function fmtFitChange(c) {
  const u = c.unit === '°' ? '°' : c.unit ? ' ' + c.unit : ''
  return c.from == null || c.from === '' ? `${c.label} ${c.to}${u}` : `${c.label} ${c.from}→${c.to}${u}`
}
// Legt eine Änderung ab. Änderungen innerhalb von 30 Minuten (Tuning-Session)
// werden zu einem Eintrag zusammengefasst statt bei jedem Auto-Save einen
// neuen Verlaufseintrag anzulegen; je Feld gilt der ursprüngliche "from"-Wert
// der Session und der jeweils neueste "to"-Wert.
export async function logFitChange(userId, bikeId, fit, diffEntries) {
  if (!diffEntries || !diffEntries.length) return
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const { data: recent } = await supabase
    .from('fit_history').select('id,changes').eq('bike_id', bikeId).gte('created_at', cutoff)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (recent) {
    const byKey = {}
    for (const c of recent.changes || []) byKey[c.key] = c
    for (const c of diffEntries) byKey[c.key] = { ...c, from: byKey[c.key]?.from ?? c.from }
    const merged = Object.values(byKey)
    const { error } = await supabase.from('fit_history')
      .update({ fit, changes: merged, summary: merged.map(fmtFitChange).join(' · '), created_at: new Date().toISOString() })
      .eq('id', recent.id)
    if (error) throw error
    return
  }
  const { error } = await supabase.from('fit_history')
    .insert({ user_id: userId, bike_id: bikeId, fit, changes: diffEntries, summary: diffEntries.map(fmtFitChange).join(' · ') })
  if (error) throw error
}

// ── Fahrbedingungen je Ausfahrt (Verschleiß-Kontext) ───────
export async function getRideConditions(bikeId) {
  const { data, error } = await supabase
    .from('ride_conditions').select('*').eq('bike_id', bikeId).order('ride_date', { ascending: true })
  if (error) throw error
  return data
}
export async function addRideCondition(userId, entry) {
  const { error } = await supabase.from('ride_conditions').insert({ ...entry, user_id: userId })
  if (error) throw error
}
export async function updateRideCondition(id, patch) {
  const { error } = await supabase.from('ride_conditions').update(patch).eq('id', id)
  if (error) throw error
}

// ── Fahrt-Metriken aus Strava (Intensitäts-Erkennung) ──────
export async function getRideMetrics(bikeId, sinceIso) {
  const { data, error } = await supabase
    .from('ride_metrics').select('*')
    .eq('bike_id', bikeId).gte('ride_date', sinceIso)
    .order('ride_date', { ascending: true })
  if (error) throw error
  return data
}
export async function markRideMetricsConsumed(ids) {
  if (!ids || !ids.length) return
  const { error } = await supabase.from('ride_metrics').update({ consumed: true }).in('id', ids)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════
// SETUPS
// ═══════════════════════════════════════════════════════════
export async function getSetups(userId) {
  const { data, error } = await supabase
    .from('setups').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  if (error) throw error
  return data
}
export async function addSetup(userId, setup) {
  const { data, error } = await supabase
    .from('setups').insert({ ...setup, user_id: userId }).select().single()
  if (error) throw error
  return data
}
export async function deleteSetup(setupId) {
  const { error } = await supabase.from('setups').delete().eq('id', setupId)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════
// BIKE-FIT
// ═══════════════════════════════════════════════════════════
export async function getBikeFits(bikeId) {
  const { data, error } = await supabase
    .from('bike_fits').select('*').eq('bike_id', bikeId).order('fit_date', { ascending: false })
  if (error) throw error
  return data
}
export async function addBikeFit(userId, fit) {
  const { data, error } = await supabase
    .from('bike_fits').insert({ ...fit, user_id: userId }).select().single()
  if (error) throw error
  return data
}

// ═══════════════════════════════════════════════════════════
// RACES
// ═══════════════════════════════════════════════════════════
export async function getRaces(userId) {
  const { data, error } = await supabase
    .from('races').select('*').eq('user_id', userId).order('race_date', { ascending: false })
  if (error) throw error
  return data
}
export async function addRace(userId, race) {
  const { data, error } = await supabase
    .from('races').insert({ ...race, user_id: userId }).select().single()
  if (error) throw error
  return data
}
export async function deleteRace(raceId) {
  const { error } = await supabase.from('races').delete().eq('id', raceId)
  if (error) throw error
}

// ── Wettkampf-Erkennung: Renntagebuch-Vorschläge aus Strava ──
export async function getRaceCandidates(userId) {
  const { data, error } = await supabase
    .from('race_candidates').select('*').eq('user_id', userId).eq('dismissed', false).order('created_at', { ascending: false })
  if (error) throw error
  return data
}
export async function dismissRaceCandidate(id) {
  const { error } = await supabase.from('race_candidates').update({ dismissed: true }).eq('id', id)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════
// REIFENDRUCK-DATENBANK
// ═══════════════════════════════════════════════════════════
export async function getTyrePressures(userId) {
  const { data, error } = await supabase
    .from('tyre_pressures').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  if (error) throw error
  return data
}
export async function addTyrePressure(userId, entry) {
  const { data, error } = await supabase
    .from('tyre_pressures').insert({ ...entry, user_id: userId }).select().single()
  if (error) throw error
  return data
}
export async function deleteTyrePressure(id) {
  const { error } = await supabase.from('tyre_pressures').delete().eq('id', id)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════
// UPGRADES (Wunschliste)
// ═══════════════════════════════════════════════════════════
export async function getUpgrades(bikeId) {
  const { data, error } = await supabase
    .from('upgrades').select('*').eq('bike_id', bikeId).order('created_at', { ascending: false })
  if (error) throw error
  return data
}
export async function addUpgrade(userId, upgrade) {
  const { data, error } = await supabase
    .from('upgrades').insert({ ...upgrade, user_id: userId }).select().single()
  if (error) throw error
  return data
}
export async function updateUpgrade(id, updates) {
  const { error } = await supabase.from('upgrades').update(updates).eq('id', id)
  if (error) throw error
}
export async function deleteUpgrade(id) {
  const { error } = await supabase.from('upgrades').delete().eq('id', id)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════
// AKTIVITÄTEN
// ═══════════════════════════════════════════════════════════
export async function getBikeHours(bikeId) {
  const { data, error } = await supabase
    .from('activities').select('moving_time').eq('bike_id', bikeId)
  if (error || !data) return 0
  return data.reduce((s, a) => s + (Number(a.moving_time) || 0), 0) / 3600
}

// ═══════════════════════════════════════════════════════════
// ARCHIVIERUNG
// ═══════════════════════════════════════════════════════════
export async function archiveBike(bikeId, archived) {
  const { error } = await supabase.from('bikes').update({ archived }).eq('id', bikeId)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════
// BENACHRICHTIGUNGS-INBOX
// ═══════════════════════════════════════════════════════════
export async function getNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(100)
  if (error) throw error
  return data
}
export async function getUnreadCount(userId) {
  const { count } = await supabase
    .from('notifications').select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('read', false)
  return count || 0
}
export async function markNotificationsRead(userId) {
  const { error } = await supabase
    .from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
  if (error) throw error
}
export async function deleteNotification(id) {
  const { error } = await supabase.from('notifications').delete().eq('id', id)
  if (error) throw error
}
export async function clearNotifications(userId) {
  const { error } = await supabase.from('notifications').delete().eq('user_id', userId)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════
// PACKLISTE
// ═══════════════════════════════════════════════════════════
export async function getPackItems(userId) {
  const { data, error } = await supabase
    .from('pack_items').select('*').eq('user_id', userId)
    .order('sort_order').order('created_at')
  if (error) throw error
  return data
}
export async function addPackItem(userId, item) {
  const { data, error } = await supabase
    .from('pack_items').insert({ ...item, user_id: userId }).select().single()
  if (error) throw error
  return data
}
export async function updatePackItem(id, updates) {
  const { error } = await supabase.from('pack_items').update(updates).eq('id', id)
  if (error) throw error
}
export async function deletePackItem(id) {
  const { error } = await supabase.from('pack_items').delete().eq('id', id)
  if (error) throw error
}
export async function resetPackList(userId) {
  const { error } = await supabase.from('pack_items').update({ checked: false }).eq('user_id', userId)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════
// STRAVA
// ═══════════════════════════════════════════════════════════
export async function syncStrava(userId) {
  const { data, error } = await supabase.functions.invoke('strava-sync', { body: { userId } })
  if (error) throw error
  return data
}
export async function connectStrava(code, userId) {
  const { data, error } = await supabase.functions.invoke('strava-auth', { body: { code, userId } })
  if (error) throw error
  return data
}
export async function getStravaStatus(userId) {
  const { data } = await supabase
    .from('strava_tokens').select('athlete_name, updated_at').eq('user_id', userId).single()
  return data
}
