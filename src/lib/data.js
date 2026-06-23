import { supabase } from './supabase'

// ═══════════════════════════════════════════════════════════
// SERVICE-TYPEN (Vorlagen für Wartung/Tracker)
// ═══════════════════════════════════════════════════════════
export const SERVICE_TYPES = [
  { typeId:'chain-wax',   title:'Kette wachsen',        icon:'🔗', interval:1000, cat:'Antrieb' },
  { typeId:'chain-new',   title:'Kette tauschen',       icon:'⛓️', interval:2500, cat:'Antrieb' },
  { typeId:'cassette',    title:'Kassette tauschen',    icon:'⚙️', interval:12000, cat:'Antrieb' },
  { typeId:'brake-pads',  title:'Bremsbeläge tauschen', icon:'🛑', interval:4000, cat:'Bremsen' },
  { typeId:'rotors',      title:'Bremsscheiben prüfen', icon:'💿', interval:15000, cat:'Bremsen' },
  { typeId:'tyre-f',      title:'Reifen vorne',         icon:'🔵', interval:6000, cat:'Reifen' },
  { typeId:'tyre-r',      title:'Reifen hinten',        icon:'🔴', interval:4000, cat:'Reifen' },
  { typeId:'tubeless',    title:'Tubeless-Milch',       icon:'🥛', interval:500,  cat:'Reifen' },
  { typeId:'bearings',    title:'Lager prüfen',         icon:'🔘', interval:5000, cat:'Lager' },
  { typeId:'headset',     title:'Steuersatz prüfen',    icon:'🧭', interval:5000, cat:'Lager' },
  { typeId:'spokes',      title:'Speichenspannung',     icon:'🎯', interval:3000, cat:'Lager' },
  { typeId:'fork-small',  title:'Federgabel klein',     icon:'🔱', interval:5000, cat:'Fahrwerk' },
  { typeId:'fork-big',    title:'Federgabel groß',      icon:'🔱', interval:10000,cat:'Fahrwerk' },
  { typeId:'shock',       title:'Dämpfer-Service',      icon:'🏗️', interval:5000, cat:'Fahrwerk' },
  { typeId:'dropper',     title:'Dropper-Service',      icon:'📉', interval:8000, cat:'Fahrwerk' },
  { typeId:'torque',      title:'Schrauben nachziehen', icon:'🔩', interval:500,  cat:'Sonstiges' },
]

// ═══════════════════════════════════════════════════════════
// KOMPONENTEN-KATEGORIEN (für Bike-Konfiguration)
// Jede Kategorie definiert ihre spezifischen Felder
// ═══════════════════════════════════════════════════════════
export const COMPONENT_CATEGORIES = [
  {
    id:'cockpit_bar', label:'Lenker', icon:'↔️', group:'Cockpit',
    fields:[
      {k:'width_top',l:'Breite oben (mm)'},
      {k:'width_bottom',l:'Breite unten (mm)'},
      {k:'reach',l:'Reach (mm)'},
      {k:'drop',l:'Drop (mm)'},
      {k:'flare',l:'Flare (°)'},
    ]
  },
  {
    id:'cockpit_stem', label:'Vorbau', icon:'🔧', group:'Cockpit',
    fields:[
      {k:'length',l:'Länge (mm)'},
      {k:'angle',l:'Winkel (°)'},
      {k:'spacer_height',l:'Spacer-Höhe (mm)'},
      {k:'measured_bar_height',l:'Lenkerhöhe gemessen (mm)'},
    ]
  },
  {
    id:'saddle', label:'Sattel', icon:'🪑', group:'Sattel & Position',
    fields:[
      {k:'width',l:'Breite (mm)'},
      {k:'height',l:'Sattelhöhe (mm)'},
      {k:'setback',l:'Setback (mm)'},
      {k:'tilt',l:'Neigung (°)'},
      {k:'position',l:'Position (mm)'},
    ]
  },
  {
    id:'crank', label:'Kurbel', icon:'⚙️', group:'Schaltung',
    fields:[
      {k:'length',l:'Kurbellänge (mm)'},
      {k:'chainring_inner',l:'Innenblatt (Z)'},
      {k:'chainring_outer',l:'Außenblatt (Z)'},
    ]
  },
  {
    id:'cassette', label:'Kassette', icon:'🔩', group:'Schaltung',
    fields:[{k:'range',l:'Abstufung (z.B. 10-52T)'}]
  },
  {
    id:'derailleur_rear', label:'Schaltwerk', icon:'🔄', group:'Schaltung',
    fields:[{k:'series',l:'Serie/Modell'}]
  },
  {
    id:'derailleur_front', label:'Umwerfer', icon:'🔃', group:'Schaltung',
    fields:[{k:'series',l:'Serie/Modell'}]
  },
  {
    id:'powermeter', label:'Powermeter', icon:'⚡', group:'Schaltung',
    fields:[{k:'type',l:'Typ (Pedale/Kurbel)'}]
  },
  {
    id:'wheelset', label:'Laufradsatz', icon:'🛞', group:'Laufräder',
    fields:[
      {k:'rim_depth',l:'Felgenhöhe (mm)'},
      {k:'inner_width',l:'Innenmaulweite (mm)'},
      {k:'outer_width',l:'Außenbreite (mm)'},
      {k:'spokes_front',l:'Speichen vorne'},
      {k:'spokes_rear',l:'Speichen hinten'},
    ]
  },
  {
    id:'tyre', label:'Reifen', icon:'🔵', group:'Reifen',
    fields:[
      {k:'width',l:'Breite (mm)'},
      {k:'tubeless',l:'Tubeless (ja/nein)'},
      {k:'pressure_front',l:'Druck vorne (bar)'},
      {k:'pressure_rear',l:'Druck hinten (bar)'},
    ]
  },
  {
    id:'brake', label:'Bremsen', icon:'🛑', group:'Bremsen',
    fields:[
      {k:'rotor_front',l:'Scheibe vorne (mm)'},
      {k:'rotor_rear',l:'Scheibe hinten (mm)'},
      {k:'pad_model',l:'Belag-Modell'},
    ]
  },
  {
    id:'fork', label:'Federgabel', icon:'🔱', group:'Fahrwerk',
    fields:[
      {k:'travel',l:'Federweg (mm)'},
      {k:'pressure',l:'Luftdruck (psi)'},
      {k:'tokens',l:'Tokens'},
      {k:'rebound',l:'Rebound (Klicks)'},
      {k:'compression',l:'Compression (Klicks)'},
      {k:'sag',l:'Sag (%)'},
    ]
  },
  {
    id:'shock', label:'Dämpfer', icon:'🏗️', group:'Fahrwerk',
    fields:[
      {k:'pressure',l:'Luftdruck (psi)'},
      {k:'tokens',l:'Tokens'},
      {k:'rebound',l:'Rebound (Klicks)'},
      {k:'compression',l:'Compression (Klicks)'},
      {k:'sag',l:'Sag (%)'},
    ]
  },
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
export async function addTracker(userId, tracker) {
  await supabase.from('trackers').delete()
    .eq('user_id', userId).eq('bike_id', tracker.bike_id).eq('type_id', tracker.type_id)
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
// AKTIVITÄTEN (Strava-Import)
// ═══════════════════════════════════════════════════════════
export async function getActivities(bikeId, limit = 20) {
  const { data, error } = await supabase
    .from('activities').select('*').eq('bike_id', bikeId)
    .order('created_at', { ascending: false }).limit(limit)
  if (error) throw error
  return data || []
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
