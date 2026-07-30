const MAP = [
  ".....................xxxxx............xxxxxxxxxxxxxxxxxxx...",
  "...xxxxxxxxxxxxxxxxxxxxxxxx...xxxxxxxxxxxxxxxxxxxxxxxxxxxxx.",
  "..xxxxxxxxxxxxxxxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "..xxxxxxxxxxxxxxxxxxxx.xxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "...xxxxxxxxxxxxxxxxxxx......xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.",
  "...xxxxxxxxxxxxxxxxxx.......xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx..",
  "....xxxxxxxxxxxxxxxx.......xxxxxxxxxxxxxx.xxxxxxxxxxxxxxx...",
  ".....xxxxxxxxxxxxxx.........xxxxxxxxxxx.xxxxxxxxxxxxxxxx....",
  ".......xxxxxxxxxxx.........xxxxxxxxxxxxxxxxxxxxxxxxxxx......",
  ".........xxxxxxx...........xxxxxxxxxxx....xxxxx.xxxxx.......",
  "............xxxxx..........xxxxxxxxxxxx...xxxxx.xxxx........",
  "..............xxxx.........xxxxxxxxxxxxxx..xxxx.xxxxx.......",
  "..................xxx.......xxxxxxxxxxxx........xxxxxx......",
  ".................xxxxxxx......xxxxxxxxxx.......xxxxxxxx.....",
  ".................xxxxxxxx......xxxxxxxx.........xxxxxxxx....",
  ".................xxxxxxx.......xxxxxxxx..........xxxxxxxx...",
  ".................xxxxxxx.......xxxxxxx..........xxxxxxxxx...",
  "..................xxxxxx........xxxxxx..........xxxxxxxxx...",
  "..................xxxxx..........xxxx............xxxxxxx....",
  "...................xxxx...........xx.....................xx.",
  "...................xxx...................................xx.",
  "...................xx.......................................",
  "...................xx.......................................",
];

const STEP = 14;
const COLS = 60;
const ROWS = MAP.length;

// Hubs destacados (Brasil, EUA, Europa, Ásia)
const HUBS: [number, number][] = [
  [20, 14],
  [21, 15],
  [10, 6],
  [31, 6],
  [50, 8],
];

const isHub = (c: number, r: number) => HUBS.some(([hc, hr]) => hc === c && hr === r);

export function HeroDotMap() {
  const dots: JSX.Element[] = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (MAP[r][c] !== "x") continue;
      const cx = c * STEP + STEP / 2;
      const cy = r * STEP + STEP / 2;
      const hub = isHub(c, r);
      dots.push(
        <circle
          key={`${r}-${c}`}
          cx={cx}
          cy={cy}
          r={hub ? 2.6 : 1.5}
          fill={hub ? "hsl(var(--primary))" : "hsl(var(--foreground))"}
          opacity={hub ? 0.55 : 0.16}
        >
          {hub && (
            <animate
              attributeName="opacity"
              values="0.25;0.7;0.25"
              dur="3.2s"
              repeatCount="indefinite"
            />
          )}
        </circle>
      );
    }
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 hidden lg:flex items-center justify-center overflow-hidden"
    >
      <svg
        viewBox={`0 0 ${COLS * STEP} ${ROWS * STEP}`}
        className="w-[115%] max-w-none h-auto -translate-y-6"
        style={{
          maskImage:
            "radial-gradient(ellipse 70% 65% at 50% 45%, black 35%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 65% at 50% 45%, black 35%, transparent 78%)",
        }}
      >
        {dots}
      </svg>
    </div>
  );
}
