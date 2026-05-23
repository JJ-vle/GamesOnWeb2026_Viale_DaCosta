const STORAGE_KEY = 'univneeds_audio_settings_v1'

const DEFAULT_SETTINGS = Object.freeze({
  musicVolume: 0.6,
  sfxVolume: 0.8
})

const state = {
  loaded: false,
  settings: { ...DEFAULT_SETTINGS }
}

function clamp01(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

function safeWindow() {
  return typeof window !== 'undefined' ? window : null
}

function persist() {
  const w = safeWindow()
  if (!w?.localStorage) return
  try {
    w.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings))
  } catch (e) {
    // Ignore storage errors (private mode, quota, etc.)
  }
}

function emitChange() {
  const w = safeWindow()
  if (!w) return
  try {
    w.dispatchEvent(new CustomEvent('audioSettingsChanged', { detail: getAudioSettings() }))
  } catch (e) {
    // Ignore event dispatch issues.
  }
}

export function loadAudioSettings() {
  if (state.loaded) return getAudioSettings()
  state.loaded = true

  const w = safeWindow()
  if (!w?.localStorage) return getAudioSettings()

  try {
    const raw = w.localStorage.getItem(STORAGE_KEY)
    if (!raw) return getAudioSettings()
    const parsed = JSON.parse(raw)
    state.settings.musicVolume = clamp01(parsed?.musicVolume ?? DEFAULT_SETTINGS.musicVolume)
    state.settings.sfxVolume = clamp01(parsed?.sfxVolume ?? DEFAULT_SETTINGS.sfxVolume)
  } catch (e) {
    // Keep defaults on parse/storage errors.
  }

  return getAudioSettings()
}

export function getAudioSettings() {
  if (!state.loaded) loadAudioSettings()
  return { ...state.settings }
}

export function setMusicVolume(value) {
  if (!state.loaded) loadAudioSettings()
  state.settings.musicVolume = clamp01(value)
  persist()
  emitChange()
  return state.settings.musicVolume
}

export function setSfxVolume(value) {
  if (!state.loaded) loadAudioSettings()
  state.settings.sfxVolume = clamp01(value)
  persist()
  emitChange()
  return state.settings.sfxVolume
}

export function applyMusicVolume(baseVolume = 1) {
  if (!state.loaded) loadAudioSettings()
  const base = Math.max(0, Number(baseVolume) || 0)
  return clamp01(base * state.settings.musicVolume)
}

export function applySfxVolume(baseVolume = 1) {
  if (!state.loaded) loadAudioSettings()
  const base = Math.max(0, Number(baseVolume) || 0)
  return clamp01(base * state.settings.sfxVolume)
}
