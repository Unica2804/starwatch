/**
 * VLM Web Worker — isolated inference, WebGPU → WASM fallback.
 * Model shards live on HuggingFace (not Render, 25MB limit) and are
 * cached in IndexedDB after explicit user consent (>200MB).
 *
 * Until the fine-tuned Gemma 3n-E2B ONNX lands, `identify()` runs in
 * ephemeris-only mode: returns no VLM claims so crossValidate narrates
 * sky math alone rather than hallucinating. Never trust "run finished"
 * without asserting pixel output — see FAILED_APPROACH.md.
 */

export type Backend = 'webgpu' | 'wasm' | 'ephemeris-only'

export interface IdentifyInput {
  pixels: Uint8ClampedArray
  width: number
  height: number
}

export interface IdentifyResult {
  backend: Backend
  claims: { label: string; confidence: number }[]
}

let backend: Backend | null = null

async function pickBackend(): Promise<Backend> {
  if (backend) return backend
  try {
    const nav = navigator as Navigator & { gpu?: unknown }
    if (nav.gpu) {
      const gpu = nav.gpu as unknown as {
        requestAdapter(): Promise<unknown>
      }
      const adapter = await gpu.requestAdapter()
      if (adapter) {
        backend = 'webgpu'
        return backend
      }
    }
  } catch {
    // fall through to WASM
  }
  backend = 'wasm'
  // Real ONNX session init lands with the model drop. For now the
  // worker reports wasm-capable but yields no claims until weights exist.
  return backend
}

export async function identify(_input: IdentifyInput): Promise<IdentifyResult> {
  const b = await pickBackend()
  // Ephemeris-only until weights ship: zero claims, zero hallucinations.
  return { backend: b === 'wasm' ? 'ephemeris-only' : b, claims: [] }
}
