// Local-only cache of API keys the user has validated, shared by the Gate and the API Key modal.

export interface SavedKey {
  key: string
  role: string
  name?: string
}

const STORAGE_KEY = "uniapi_saved_keys"

export function loadSavedKeys(): SavedKey[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((k): k is SavedKey => k && typeof k.key === "string")
  } catch {
    return []
  }
}

export function persistSavedKeys(keys: SavedKey[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
  } catch {
    /* ignore quota / serialization errors */
  }
}

export function upsertSavedKey(key: string, role: string, name?: string): SavedKey[] {
  const keys = loadSavedKeys()
  const idx = keys.findIndex((k) => k.key === key)
  const entry: SavedKey = { key, role, name: name ?? keys[idx]?.name }
  if (idx >= 0) keys[idx] = entry
  else keys.push(entry)
  persistSavedKeys(keys)
  return keys
}

export function removeSavedKey(key: string): SavedKey[] {
  const keys = loadSavedKeys().filter((k) => k.key !== key)
  persistSavedKeys(keys)
  return keys
}
