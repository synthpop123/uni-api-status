"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import yaml from "js-yaml"
import { Badge, Button, Card, SectionHead } from "@/components/dashboard/primitives"
import { Icons } from "@/components/dashboard/icons"
import type { ToastPush } from "@/components/dashboard/toast"
import { api } from "@/lib/api-client"

function validateYaml(content: string): { ok: boolean; error: string | null } {
  if (!content.trim()) return { ok: true, error: null }
  try {
    yaml.load(content)
    return { ok: true, error: null }
  } catch (e) {
    let msg = "Invalid YAML."
    if (e instanceof yaml.YAMLException && e.mark) {
      msg += ` Near line ${e.mark.line + 1}, column ${e.mark.column + 1}: ${e.reason}`
    } else if (e instanceof Error) {
      msg += ` ${e.message}`
    }
    return { ok: false, error: msg }
  }
}

export function Config({ apiKey, toast }: { apiKey: string; toast: ToastPush }) {
  const [text, setText] = useState("")
  const [savedText, setSavedText] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [valid, setValid] = useState(true)
  const [yamlError, setYamlError] = useState<string | null>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const lines = text.split("\n").length
  const dirty = text !== savedText

  const load = useCallback(async () => {
    if (!apiKey) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await api.loadConfig(apiKey)
      const cfg = data.config || ""
      setText(cfg)
      setSavedText(cfg)
      const v = validateYaml(cfg)
      setValid(v.ok)
      setYamlError(v.error)
    } catch (e) {
      toast(`Failed to load config: ${(e as Error).message}`, "error")
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey])

  useEffect(() => {
    load()
  }, [load])

  const applyText = (value: string) => {
    setText(value)
    const v = validateYaml(value)
    setValid(v.ok)
    setYamlError(v.error)
  }

  const save = async () => {
    const v = validateYaml(text)
    setValid(v.ok)
    setYamlError(v.error)
    if (!v.ok) {
      toast(v.error || "Invalid YAML — fix it before saving.", "error")
      return
    }
    setSaving(true)
    try {
      await api.saveConfig(apiKey, text)
      setSavedText(text)
      toast("Configuration saved & validated", "success")
    } catch (e) {
      toast(`Save failed: ${(e as Error).message}`, "error")
    } finally {
      setSaving(false)
    }
  }

  const revert = () => {
    applyText(savedText)
    toast("Reverted to last saved config")
  }

  const download = () => {
    if (!text) {
      toast("Nothing to download — the editor is empty.")
      return
    }
    const blob = new Blob([text], { type: "text/yaml;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "api.yaml"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith(".yaml") && !file.name.endsWith(".yml")) {
      toast("Please choose a .yaml or .yml file.", "error")
      e.target.value = ""
      return
    }
    if (file.size > 1024 * 1024) {
      toast("Config files must be under 1 MB.", "error")
      e.target.value = ""
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = (ev.target?.result as string) ?? ""
      applyText(content)
      toast(`Loaded ${file.name}`, "success")
      e.target.value = ""
    }
    reader.onerror = () => {
      toast("Failed to read the file.", "error")
      e.target.value = ""
    }
    reader.readAsText(file)
  }

  return (
    <div>
      <SectionHead
        title="Configuration"
        sub="Edit the unified gateway YAML. Changes are validated before they go live."
        right={
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {dirty && (
              <Badge tone="warn">
                <Icons.dot size={10} />
                Unsaved
              </Badge>
            )}
            <input ref={fileRef} type="file" accept=".yaml,.yml" onChange={onUpload} style={{ display: "none" }} />
            <Button variant="outline" size="sm" icon={Icons.upload} onClick={() => fileRef.current?.click()}>
              Upload
            </Button>
            <Button variant="outline" size="sm" icon={Icons.download} onClick={download}>
              Download
            </Button>
            <Button variant="outline" size="sm" icon={Icons.refresh} onClick={revert} disabled={!dirty}>
              Revert
            </Button>
            <Button
              variant="accent"
              size="sm"
              icon={saving ? Icons.clock : valid ? Icons.save : Icons.xCircle}
              onClick={save}
              disabled={saving || !dirty || !valid}
            >
              {saving ? "Saving…" : !valid ? "Invalid YAML" : "Save changes"}
            </Button>
          </div>
        }
      />

      {loading ? (
        <Card pad={0} style={{ overflow: "hidden" }}>
          <div style={{ padding: 20 }}>
            <div className="skel" style={{ height: 480, borderRadius: 12 }} />
          </div>
        </Card>
      ) : (
        <Card pad={0} style={{ overflow: "hidden", borderColor: valid ? "var(--line)" : "color-mix(in oklab, var(--down) 50%, var(--line))" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 18px",
              borderBottom: "1px solid var(--line)",
              background: "var(--surface-2)",
            }}
          >
            <div style={{ display: "flex", gap: 7 }}>
              {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                <span key={c} style={{ width: 11, height: 11, borderRadius: 99, background: c, opacity: 0.85 }} />
              ))}
            </div>
            <span className="mono" style={{ fontSize: 12.5, color: "var(--ink-3)", marginLeft: 6 }}>
              uni-api.yaml
            </span>
            <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8 }}>
              {valid ? (
                <Icons.checkCircle size={15} style={{ color: "var(--up)" }} />
              ) : (
                <Icons.xCircle size={15} style={{ color: "var(--down)" }} />
              )}
              <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }} className="tnum">
                {lines} lines · YAML
              </span>
            </span>
          </div>
          <div style={{ display: "flex", fontFamily: "var(--font-mono)", fontSize: 13, lineHeight: "21px", height: 520, overflow: "hidden" }}>
            <div
              ref={lineRef}
              style={{
                padding: "16px 0",
                textAlign: "right",
                color: "var(--ink-faint)",
                userSelect: "none",
                background: "var(--surface-2)",
                minWidth: 48,
                overflow: "hidden",
              }}
            >
              {Array.from({ length: lines }, (_, i) => (
                <div key={i} style={{ padding: "0 12px" }}>
                  {i + 1}
                </div>
              ))}
            </div>
            <textarea
              ref={taRef}
              value={text}
              spellCheck={false}
              onChange={(e) => applyText(e.target.value)}
              onScroll={(e) => {
                if (lineRef.current) lineRef.current.scrollTop = e.currentTarget.scrollTop
              }}
              style={{
                flex: 1,
                padding: "16px 18px",
                border: "none",
                outline: "none",
                resize: "none",
                background: "transparent",
                color: "var(--ink)",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                lineHeight: "21px",
                height: "100%",
                overflow: "auto",
                tabSize: 2,
                whiteSpace: "pre",
              }}
            />
          </div>
        </Card>
      )}

      {!valid && yamlError && (
        <p style={{ fontSize: 12.5, color: "var(--down)", marginTop: 12, display: "flex", alignItems: "center", gap: 7 }}>
          <Icons.alert size={13} /> {yamlError}
        </p>
      )}
      <p style={{ fontSize: 12.5, color: "var(--ink-faint)", marginTop: 14, display: "flex", alignItems: "center", gap: 7 }}>
        <Icons.lock size={13} /> Admin-only. Saving applies the config and may restart the gateway — download a backup first.
      </p>
    </div>
  )
}
