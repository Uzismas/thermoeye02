export function OriginalScanSvg() {
  return (
    <svg viewBox="0 0 320 320" aria-hidden="true">
      <defs>
        <radialGradient id="optic" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#eefbf4" />
          <stop offset="48%" stopColor="#89c7b1" />
          <stop offset="100%" stopColor="#0d2e31" />
        </radialGradient>
      </defs>
      <rect width="320" height="320" rx="18" fill="#10292e" />
      <circle cx="160" cy="160" r="132" fill="url(#optic)" opacity=".9" />
      <path d="M35 161 C85 148 122 176 160 159 C198 142 236 165 286 151" fill="none" stroke="#f7fff9" strokeWidth="3" opacity=".75" />
      <path d="M68 95 C126 130 104 213 170 227 C218 237 241 201 286 215" fill="none" stroke="#d4f6e3" strokeWidth="2" opacity=".72" />
      <path d="M51 230 C106 202 120 105 183 91 C223 82 251 103 292 75" fill="none" stroke="#c7ead9" strokeWidth="2" opacity=".64" />
      <circle cx="160" cy="160" r="18" fill="#173d3d" opacity=".62" />
      <g stroke="#eefbf4" strokeWidth="1.2" opacity=".5" fill="none">
        <path d="M160 160 L95 80" />
        <path d="M160 160 L232 92" />
        <path d="M160 160 L251 196" />
        <path d="M160 160 L82 224" />
        <path d="M160 160 L158 34" />
      </g>
    </svg>
  );
}

export function SegmentationSvg() {
  return (
    <svg viewBox="0 0 320 320" aria-hidden="true">
      <rect width="320" height="320" rx="18" fill="#f4faf8" />
      <circle cx="160" cy="160" r="132" fill="#e4f3ec" />
      <g fill="none" strokeLinecap="round">
        <path d="M39 158 C84 139 126 173 162 154 C204 132 236 167 283 145" stroke="#047857" strokeWidth="6" />
        <path d="M64 100 C121 129 112 209 171 224 C217 236 239 202 284 215" stroke="#10b981" strokeWidth="4" />
        <path d="M50 231 C106 201 121 104 183 91 C226 81 251 103 292 74" stroke="#0f766e" strokeWidth="4" />
        <path d="M160 158 L96 79 M160 158 L231 92 M160 158 L251 197 M160 158 L84 224 M160 158 L160 35" stroke="#14b8a6" strokeWidth="2" />
      </g>
      <circle cx="160" cy="160" r="19" fill="#0f766e" />
    </svg>
  );
}

export function HeatmapSvg() {
  return (
    <svg viewBox="0 0 320 320" aria-hidden="true">
      <defs>
        <radialGradient id="riskA" cx="43%" cy="45%" r="48%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="42%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#0f766e" />
        </radialGradient>
      </defs>
      <rect width="320" height="320" rx="18" fill="#10292e" />
      <circle cx="160" cy="160" r="132" fill="url(#riskA)" />
      <circle cx="125" cy="138" r="62" fill="#dc2626" opacity=".62" />
      <circle cx="205" cy="207" r="44" fill="#f97316" opacity=".55" />
      <path d="M42 158 C84 140 126 172 162 155 C204 133 236 167 283 145" fill="none" stroke="#fff7ed" strokeWidth="5" opacity=".78" />
      <circle cx="160" cy="160" r="18" fill="#111827" opacity=".5" />
    </svg>
  );
}
