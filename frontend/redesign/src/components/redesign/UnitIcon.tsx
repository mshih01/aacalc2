const baseUnitName: Record<string, string> = {
  inf_a: 'inf',
  art_a: 'art',
  arm_a: 'arm',
  bat1: 'bat',
};

export function UnitIcon({
  unit,
  side = 'attack',
  size = 32,
  dimmed = false,
}: {
  unit: string;
  side?: 'attack' | 'defense';
  size?: number;
  dimmed?: boolean;
}) {
  const base = baseUnitName[unit] ?? unit;
  const amphibious = unit.endsWith('_a');
  return (
    <svg
      className={`unit-icon unit-icon--${side}${dimmed ? ' unit-icon--dimmed' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="16"
        cy="16"
        r="14.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity=".42"
      />
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {drawUnit(base)}
      </g>
      {amphibious ? (
        <path
          d="M5 27.2c1.6 0 1.6 1.1 3.2 1.1s1.6-1.1 3.2-1.1 1.6 1.1 3.2 1.1 1.6-1.1 3.2-1.1 1.6 1.1 3.2 1.1 1.6-1.1 3.2-1.1 1.6 1.1 3.2 1.1"
          stroke="currentColor"
          strokeWidth="1"
          opacity=".7"
        />
      ) : null}
    </svg>
  );
}

function drawUnit(unit: string) {
  switch (unit) {
    case 'inf':
      return (
        <>
          <circle cx="16" cy="9.5" r="2.5" />
          <path d="M16 12.5v7.2M12.2 15.6h7.6M16 19.7l-2.8 5.1M16 19.7l2.8 5.1" />
          <path d="M19.4 13.4l3.6 3.6-1 1-3.6-3.6z" />
        </>
      );
    case 'art':
      return (
        <>
          <circle cx="11.6" cy="22.4" r="2.7" />
          <path d="M11.6 19.7l4.6-6.5 7.6 4.1-4.7 6.5z" />
          <path d="M18.8 17.6l6.7-4.3M14.8 21.9l-2.8 3.9M14.2 18.2l8 4.5" />
          <path d="M16.2 13.2l2.6 1.4" />
        </>
      );
    case 'arm':
      return (
        <>
          <path d="M6.5 18.6h19v5.2h-19z" />
          <path d="M11 18.6v-3.8h9.4l2.4 3.8" />
          <path d="M21.5 14.8h5.2" />
          <circle cx="10" cy="24.2" r="2.2" />
          <circle cx="15" cy="24.2" r="2.2" />
          <circle cx="20" cy="24.2" r="2.2" />
          <circle cx="24.6" cy="24.2" r="2.2" />
          <path d="M6.5 21h19" />
        </>
      );
    case 'fig':
      return (
        <>
          <path d="M16 4.5v23" />
          <path d="M16 13.5 5.2 17.2v2.2L16 17.1l10.8 2.3v-2.2z" />
          <path d="M12.2 5.8h7.6M12.8 26.2 16 23l3.2 3.2" />
        </>
      );
    case 'bom':
      return (
        <>
          <path d="M16 4v24" />
          <path d="M16 12.5 3.8 16.6v2.2L16 16.2l12.2 2.6v-2.2z" />
          <circle cx="9.2" cy="16.4" r="1.1" />
          <circle cx="22.8" cy="16.4" r="1.1" />
          <circle cx="6.8" cy="16.2" r="1.1" />
          <circle cx="25.2" cy="16.2" r="1.1" />
          <path d="M11.8 5.6h8.4M13 26.4 16 23l3 3.4" />
        </>
      );
    case 'sub':
      return (
        <>
          <ellipse cx="16" cy="20.4" rx="10.2" ry="3" />
          <path d="M14 17.4h4v3h-4zM15.3 17.4v-3h1.7v3M18.4 14.4v-2.1" />
          <path d="M6 20.4h-1.4M26 20.4h1.4M11 22.8l-1.5 1.6M21 22.8l1.5 1.6" />
        </>
      );
    case 'tra':
      return (
        <>
          <path d="M5.2 19.5h21.6l-2.2 4.8H7.6z" />
          <path d="M11 19.5v-4.3h5.4v4.3M16.4 15.2h4.3v4.3" />
          <path d="M12.4 15.2v-2.6h2.2v2.6" />
          <path d="M22 12.2h2.4v2.1H22z" />
          <path d="M6.8 24.3h19.4" />
        </>
      );
    case 'des':
      return (
        <>
          <path d="M4.8 20h22.4l-2.4 4.6H7.2z" />
          <path d="M11.4 20v-3h4.2v3M15.6 17h4.8v3" />
          <path d="M17.6 17v-2.3h2.2V17" />
          <path d="M15.6 14.7h5.8" />
          <path d="M7.8 24.6h18.4" />
        </>
      );
    case 'cru':
      return (
        <>
          <path d="M4.2 20.5h23.6l-2.4 4.4H6.6z" />
          <path d="M10.2 20.5v-2.8h4v2.8M16.8 20.5v-2.8h4v2.8" />
          <path d="M13.8 17.7v-2.1h2.2v2.1" />
          <path d="M15.2 15.6h5.4" />
          <path d="M7 24.9h19" />
        </>
      );
    case 'acc':
      return (
        <>
          <path d="M4 19h24l-1.8 4.4H5.8z" />
          <path d="M6 19v-3.4h20V19" />
          <path d="M19.4 15.6v-2.8h4v2.8" />
          <path d="M20.6 12.8V11h1.6v1.8" />
          <path d="M8 17.2h7M8.6 20.2h5.8" />
          <path d="M7 24h19" />
        </>
      );
    case 'bat':
      return (
        <>
          <path d="M3.8 20h24.4l-2.4 4.5H6.2z" />
          <path d="M8.8 20v-3h5v3M18.2 20v-3h5v3" />
          <path d="M12.2 17v-2.6h2.6V17M17.2 17v-2.6h2.6V17" />
          <path d="M13.8 14.4h4.4" />
          <path d="M7.2 24.5h18.6" />
        </>
      );
    case 'dbat':
      return (
        <>
          <path d="M3.8 20h24.4l-2.4 4.5H6.2z" />
          <path d="M8.8 20v-3h5v3M18.2 20v-3h5v3" />
          <path d="M12.2 17v-2.6h2.6V17M17.2 17v-2.6h2.6V17" />
          <path d="M13.8 14.4h4.4" />
          <path d="M16.6 10.8l-1.3 2.1 1.8 1.2-1.1 2" />
        </>
      );
    case 'aa':
      return (
        <>
          <path d="M8 24.4h16l-2 3H10z" />
          <path d="M16 24.2v-5.1" />
          <circle cx="16" cy="16" r="4.4" />
          <path d="M16 8.4v3M16 20.6v3M8.4 16h3M20.6 16h3" />
          <path d="M16 16l6.8-6.8" />
          <circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none" />
        </>
      );
    case 'ic':
      return (
        <>
          <path d="M4.8 25.4V14l5 3.2V14l5 3.2V14l5 3.2V14l5 3.2v8.2z" />
          <path d="M4.8 25.4h22.4M9.4 25.4v-4.2M14.4 25.4v-4.2M19.4 25.4v-4.2M24.4 25.4v-4.2" />
          <path d="M23.8 14v-5.2h2.4V14" />
        </>
      );
    default:
      return <circle cx="16" cy="16" r="7" />;
  }
}
