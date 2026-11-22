// Windows PowerShell 5.1 decodes a native command's UTF-8 output with the console code page (437), so text such
// as a non-breaking hyphen (bytes E2 80 91) arrived in the nightly ledger as three code-page characters. This maps
// those characters back to their bytes and re-decodes them, one UTF-8 sequence at a time; anything that does not
// form a valid sequence (real accented text) is left exactly as it was. The capture itself is fixed in the scripts.

// Unicode code points of code page 437 bytes 0x80-0xFF.
const CP437_HIGH = [
  0xc7, 0xfc, 0xe9, 0xe2, 0xe4, 0xe0, 0xe5, 0xe7, 0xea, 0xeb, 0xe8, 0xef, 0xee, 0xec, 0xc4, 0xc5,
  0xc9, 0xe6, 0xc6, 0xf4, 0xf6, 0xf2, 0xfb, 0xf9, 0xff, 0xd6, 0xdc, 0xa2, 0xa3, 0xa5, 0x20a7, 0x192,
  0xe1, 0xed, 0xf3, 0xfa, 0xf1, 0xd1, 0xaa, 0xba, 0xbf, 0x2310, 0xac, 0xbd, 0xbc, 0xa1, 0xab, 0xbb,
  0x2591, 0x2592, 0x2593, 0x2502, 0x2524, 0x2561, 0x2562, 0x2556, 0x2555, 0x2563, 0x2551, 0x2557, 0x255d, 0x255c, 0x255b, 0x2510,
  0x2514, 0x2534, 0x252c, 0x251c, 0x2500, 0x253c, 0x255e, 0x255f, 0x255a, 0x2554, 0x2569, 0x2566, 0x2560, 0x2550, 0x256c, 0x2567,
  0x2568, 0x2564, 0x2565, 0x2559, 0x2558, 0x2552, 0x2553, 0x256b, 0x256a, 0x2518, 0x250c, 0x2588, 0x2584, 0x258c, 0x2590, 0x2580,
  0x3b1, 0xdf, 0x393, 0x3c0, 0x3a3, 0x3c3, 0xb5, 0x3c4, 0x3a6, 0x398, 0x3a9, 0x3b4, 0x221e, 0x3c6, 0x3b5, 0x2229,
  0x2261, 0xb1, 0x2265, 0x2264, 0x2320, 0x2321, 0xf7, 0x2248, 0xb0, 0x2219, 0xb7, 0x221a, 0x207f, 0xb2, 0x25a0, 0xa0,
]
const BYTE_OF = new Map<number, number>(CP437_HIGH.map((cp, i) => [cp, 0x80 + i]))
const decoder = new TextDecoder('utf-8', { fatal: true })

const seqLength = (lead: number) => (lead >= 0xc2 && lead <= 0xdf ? 2 : lead >= 0xe0 && lead <= 0xef ? 3 : lead >= 0xf0 && lead <= 0xf4 ? 4 : 0)

export function repairText(s: string): string {
  if (!/[Γ├┬≡]/.test(s)) return s
  const chars = [...s]
  let out = ''
  for (let i = 0; i < chars.length; ) {
    const lead = BYTE_OF.get(chars[i].codePointAt(0) as number)
    const len = lead === undefined ? 0 : seqLength(lead)
    if (len && i + len <= chars.length) {
      const bytes = chars.slice(i, i + len).map((c) => BYTE_OF.get(c.codePointAt(0) as number))
      if (bytes.every((b, k) => b !== undefined && (k === 0 || (b >= 0x80 && b <= 0xbf)))) {
        try {
          out += decoder.decode(new Uint8Array(bytes as number[]))
          i += len
          continue
        } catch {
          // not a valid sequence: keep the original character
        }
      }
    }
    out += chars[i]
    i++
  }
  return out
}

/** repairText applied to every string inside a JSON value. */
export function repairDeep<T>(v: T): T {
  if (typeof v === 'string') return repairText(v) as T
  if (Array.isArray(v)) return v.map(repairDeep) as T
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, repairDeep(x)])) as T
  return v
}
