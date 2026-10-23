/**
 * Стилизованная схема села для макета карты (срез 0).
 * Заменяется настоящим Leaflet + GeoJSON в срезе 2 — поэтому только декорация,
 * без интерактива и без претензии на реальную географию.
 */
export function MapPreview() {
  return (
    <svg
      viewBox="0 0 360 620"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className="absolute inset-0 size-full"
    >
      <rect width="360" height="620" fill="#dcebf7" />

      {/* Дороги */}
      <g stroke="#ffffff" fill="none" strokeLinecap="round">
        <path d="M-20 150 C 60 120, 120 200, 200 180 S 320 120, 380 165" strokeWidth="18" />
        <path d="M-20 330 C 80 300, 150 370, 250 340 S 340 300, 380 330" strokeWidth="14" />
        <path d="M-20 470 C 90 440, 140 520, 240 490 S 330 440, 380 470" strokeWidth="18" />
        <path d="M120 -20 C 110 120, 150 260, 130 400 S 100 560, 120 640" strokeWidth="14" />
        <path d="M280 -20 C 270 120, 300 240, 285 380 S 260 540, 280 640" strokeWidth="12" />
      </g>

      {/* Участки риска */}
      <g>
        <ellipse
          cx="66"
          cy="118"
          rx="46"
          ry="38"
          fill="#8fd6e6"
          opacity="0.75"
          transform="rotate(-12 66 118)"
        />
        <ellipse
          cx="158"
          cy="336"
          rx="72"
          ry="54"
          fill="#e4644e"
          opacity="0.62"
          transform="rotate(-16 158 336)"
        />
        <ellipse
          cx="146"
          cy="452"
          rx="55"
          ry="64"
          fill="#f2a93b"
          opacity="0.62"
          transform="rotate(10 146 452)"
        />
      </g>

      {/* Метки отчётов */}
      <g>
        <circle cx="158" cy="336" r="14" fill="#123a5c" />
        <circle cx="158" cy="336" r="4.5" fill="#ffffff" />
        <circle cx="146" cy="452" r="14" fill="#123a5c" />
        <circle cx="146" cy="452" r="4.5" fill="#ffffff" />
      </g>
    </svg>
  )
}