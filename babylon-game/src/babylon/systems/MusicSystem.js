import { applyMusicVolume, getAudioSettings } from './AudioSettings'

function pickRandomTrack(tracks, except = null) {
  if (!Array.isArray(tracks) || tracks.length === 0) return null
  if (tracks.length === 1) return tracks[0]

  const filtered = except ? tracks.filter((t) => t !== except) : tracks.slice()
  if (filtered.length === 0) return tracks[0]

  const index = Math.floor(Math.random() * filtered.length)
  return filtered[index]
}

export class MusicSystem {
  constructor({ zoneTracks = [], bossTracks = [] } = {}) {
    this.zoneTracks = zoneTracks.slice()
    this.bossTracks = bossTracks.slice()

    this.currentAudio = null
    this.currentTrack = null
    this.currentMode = 'zone' // 'zone' | 'boss'
    this.zoneTrack = null
    this._pendingTrack = null
    this._isDucked = false
    this._duckFactor = 0.55

    const settings = getAudioSettings()
    this.musicVolume = settings.musicVolume
  }

  getMusicVolume() {
    return this.musicVolume
  }

  setMusicVolume(value) {
    this.musicVolume = Math.max(0, Math.min(1, Number(value) || 0))
    this._applyCurrentVolume()
  }

  setDucked(ducked) {
    const next = !!ducked
    if (this._isDucked === next) return
    this._isDucked = next
    this._applyCurrentVolume()
  }

  setDuckFactor(factor) {
    const n = Number(factor)
    if (!Number.isFinite(n)) return
    this._duckFactor = Math.min(1, Math.max(0, n))
    this._applyCurrentVolume()
  }

  pickRandomZoneTrack(except = null) {
    return pickRandomTrack(this.zoneTracks, except)
  }

  pickRandomBossTrack() {
    return pickRandomTrack(this.bossTracks, null)
  }

  playZoneTrack(trackPath) {
    if (!trackPath) return
    this.zoneTrack = trackPath
    this.currentMode = 'zone'
    this._play(trackPath)
  }

  playRandomZoneTrack() {
    const track = this.pickRandomZoneTrack(this.zoneTrack)
    if (!track) return null
    this.playZoneTrack(track)
    return track
  }

  playBossTrack() {
    const track = this.pickRandomBossTrack()
    if (!track) return null
    this.currentMode = 'boss'
    this._play(track)
    return track
  }

  restoreZoneTrack() {
    if (!this.zoneTrack) {
      this.playRandomZoneTrack()
      return
    }
    this.currentMode = 'zone'
    this._play(this.zoneTrack)
  }

  unlockFromGesture() {
    if (!this.currentAudio || !this.currentAudio.paused) return

    const playAttempt = this.currentAudio.play()
    if (playAttempt && typeof playAttempt.catch === 'function') {
      playAttempt.catch(() => {
        // Still blocked by browser autoplay policy.
      })
    }

    if (this._pendingTrack) {
      const pending = this._pendingTrack
      this._pendingTrack = null
      this._play(pending)
    }
  }

  _play(trackPath) {
    if (!trackPath) return
    if (this.currentTrack === trackPath && this.currentAudio && !this.currentAudio.paused) return

    this._stopCurrent()

    const audio = new Audio(trackPath)
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = this._computeVolume()

    this.currentAudio = audio
    this.currentTrack = trackPath

    const playAttempt = audio.play()
    if (playAttempt && typeof playAttempt.catch === 'function') {
      playAttempt.catch(() => {
        this._pendingTrack = trackPath
      })
    }
  }

  _stopCurrent() {
    if (!this.currentAudio) return
    try {
      this.currentAudio.pause()
      this.currentAudio.currentTime = 0
    } catch (e) {
      // Ignore browser media errors.
    }
    this.currentAudio = null
  }

  _computeVolume() {
    const base = applyMusicVolume(1)
    const duckMultiplier = this._isDucked ? this._duckFactor : 1
    return Math.min(1, Math.max(0, base * duckMultiplier))
  }

  _applyCurrentVolume() {
    if (!this.currentAudio) return
    this.currentAudio.volume = this._computeVolume()
  }

  stop() {
    this._stopCurrent()
    this.currentTrack = null
    this._pendingTrack = null
  }

  dispose() {
    this.stop()
  }
}
