import { StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Ellipse,
  G,
  Line,
  Path,
  Polygon,
  Polyline,
  Rect,
  Text as SvgText,
} from "react-native-svg";

import { Palette, useTheme, useWizardStyles, WizardAccent } from "@/lib/theme";

/* -------------------------------------------------------------------------- */
/* Shared frame + small drawing helpers                                       */
/* -------------------------------------------------------------------------- */

// Wraps a diagram's SVG in a softly-bordered, theme-aware card that scales to
// the available width while keeping the sketch's aspect ratio.
function DiagramFrame({ w, h, children }: { w: number; h: number; children: React.ReactNode }) {
  const styles = useWizardStyles(makeStyles);
  return (
    <View style={[styles.frame, { aspectRatio: w / h }]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`}>
        {children}
      </Svg>
    </View>
  );
}

// The colors every diagram shares: `ink` for sketch lines (like a pencil),
// `accent` for the phone / highlighted element, `label` for text.
function useDiagramColors(activity: string) {
  const { palette, activityThemes } = useTheme();
  return {
    ink: palette.inputText,
    accent: activityThemes[activity as keyof typeof activityThemes]?.accent ?? palette.primary,
    label: palette.muted,
  };
}

function Label({
  x,
  y,
  children,
  color,
  anchor = "middle",
  size = 10,
}: {
  x: number;
  y: number;
  children: string;
  color: string;
  anchor?: "start" | "middle" | "end";
  size?: number;
}) {
  return (
    <SvgText x={x} y={y} fill={color} fontSize={size} textAnchor={anchor} fontWeight="600">
      {children}
    </SvgText>
  );
}

// A line with a small arrowhead at (x2, y2).
function Arrow({
  x1,
  y1,
  x2,
  y2,
  color,
  dashed,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  dashed?: boolean;
}) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const len = 8;
  const a1 = angle + Math.PI * 0.82;
  const a2 = angle - Math.PI * 0.82;
  return (
    <G>
      <Line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={dashed ? "4 4" : undefined}
      />
      <Polygon
        points={`${x2},${y2} ${x2 + len * Math.cos(a1)},${y2 + len * Math.sin(a1)} ${
          x2 + len * Math.cos(a2)
        },${y2 + len * Math.sin(a2)}`}
        fill={color}
      />
    </G>
  );
}

// A simple phone outline with a camera dot and a screen line.
function Phone({
  x,
  y,
  w,
  h,
  color,
  rotate,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  rotate?: number;
}) {
  const body = (
    <G>
      <Rect x={x} y={y} width={w} height={h} rx={3} stroke={color} strokeWidth={2} fill="none" />
      <Line x1={x + 4} y1={y + 5} x2={x + w - 4} y2={y + 5} stroke={color} strokeWidth={1.5} />
      <Circle cx={x + w / 2} cy={y + h - 3.5} r={1.6} fill={color} />
    </G>
  );
  if (rotate) {
    return <G transform={`rotate(${rotate} ${x + w / 2} ${y + h / 2})`}>{body}</G>;
  }
  return body;
}

const STROKE = 2;

/* -------------------------------------------------------------------------- */
/* 1. Parachute Drop                                                          */
/* -------------------------------------------------------------------------- */

export function ParachuteDiagram() {
  const { ink, accent, label } = useDiagramColors("parachute");
  return (
    <DiagramFrame w={320} h={200}>
      {/* Canopy */}
      <Path d="M64 62 Q150 6 236 62" stroke={ink} strokeWidth={STROKE} fill="none" />
      <Path
        d="M64 62 Q82 74 100 62 Q118 74 136 62 Q154 74 172 62 Q190 74 208 62 Q224 72 236 62"
        stroke={ink}
        strokeWidth={1.5}
        fill="none"
      />
      {/* Strings to the toy */}
      {[
        [70, 64],
        [120, 65],
        [180, 65],
        [230, 64],
      ].map(([sx, sy], i) => (
        <Line key={i} x1={sx} y1={sy} x2={150} y2={104} stroke={ink} strokeWidth={1.5} />
      ))}
      {/* Toy figure */}
      <Circle cx={150} cy={112} r={7} stroke={ink} strokeWidth={STROKE} fill="none" />
      <Line x1={150} y1={119} x2={150} y2={140} stroke={ink} strokeWidth={STROKE} />
      <Line x1={138} y1={128} x2={162} y2={128} stroke={ink} strokeWidth={STROKE} />
      <Line x1={150} y1={140} x2={141} y2={154} stroke={ink} strokeWidth={STROKE} />
      <Line x1={150} y1={140} x2={159} y2={154} stroke={ink} strokeWidth={STROKE} />
      {/* Floor + table */}
      <Line x1={20} y1={176} x2={300} y2={176} stroke={ink} strokeWidth={STROKE} />
      <Line x1={214} y1={150} x2={300} y2={150} stroke={ink} strokeWidth={STROKE} />
      <Line x1={224} y1={150} x2={224} y2={176} stroke={ink} strokeWidth={STROKE} />
      <Line x1={290} y1={150} x2={290} y2={176} stroke={ink} strokeWidth={STROKE} />
      {/* Target zone */}
      <Ellipse cx={128} cy={176} rx={30} ry={6} stroke={accent} strokeWidth={STROKE} fill="none" strokeDasharray="4 3" />
      {/* Drop height marker */}
      <Line x1={42} y1={62} x2={42} y2={176} stroke={ink} strokeWidth={1.5} strokeDasharray="4 4" />
      <Polygon points="42,62 38,70 46,70" fill={ink} />
      <Polygon points="42,176 38,168 46,168" fill={ink} />
      {/* Phone */}
      <Phone x={86} y={150} w={16} h={26} color={accent} />
      {/* Labels */}
      <Label x={150} y={18} color={label}>Parachute</Label>
      <Label x={96} y={92} color={label} size={9}>String</Label>
      <Label x={182} y={116} color={label} size={9}>Toy</Label>
      <Label x={257} y={145} color={label} size={9}>Table</Label>
      <Label x={128} y={194} color={label} size={9}>Target zone</Label>
      <Label x={94} y={146} color={accent} size={9}>Phone</Label>
      <SvgText x={16} y={120} fill={label} fontSize={9} fontWeight="600" textAnchor="middle" transform="rotate(-90 16 120)">
        Drop height
      </SvgText>
    </DiagramFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Sound Pollution Hunter                                                  */
/* -------------------------------------------------------------------------- */

export function SoundDiagram() {
  const { ink, accent, label } = useDiagramColors("sound");
  return (
    <DiagramFrame w={320} h={200}>
      {/* Table */}
      <Line x1={60} y1={104} x2={262} y2={104} stroke={ink} strokeWidth={STROKE} />
      <Line x1={84} y1={104} x2={84} y2={172} stroke={ink} strokeWidth={STROKE} />
      <Line x1={238} y1={104} x2={238} y2={172} stroke={ink} strokeWidth={STROKE} />
      {/* Falling book + motion */}
      <Rect x={150} y={40} width={46} height={13} rx={2} stroke={accent} strokeWidth={STROKE} fill="none" />
      <Line x1={158} y1={58} x2={158} y2={98} stroke={ink} strokeWidth={1.5} strokeDasharray="3 4" />
      <Line x1={188} y1={58} x2={188} y2={98} stroke={ink} strokeWidth={1.5} strokeDasharray="3 4" />
      <Arrow x1={173} y1={62} x2={173} y2={100} color={ink} />
      {/* Phone, 30 cm away */}
      <Phone x={104} y={120} w={18} h={30} color={accent} />
      <Line x1={150} y1={104} x2={124} y2={126} stroke={label} strokeWidth={1.5} strokeDasharray="4 3" />
      {/* Labels */}
      <Label x={173} y={30} color={label} size={9}>Drop object (e.g. book)</Label>
      <Label x={205} y={132} color={label} size={9}>30 cm</Label>
      <Label x={113} y={116} color={accent} size={9}>Phone</Label>
      <Label x={161} y={166} color={label} size={9}>Table</Label>
    </DiagramFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Hand Fan Challenge                                                      */
/* -------------------------------------------------------------------------- */

export function FanDiagram() {
  const { ink, accent, label } = useDiagramColors("fan");
  return (
    <DiagramFrame w={320} h={200}>
      {/* Table */}
      <Line x1={110} y1={138} x2={300} y2={138} stroke={ink} strokeWidth={STROKE} />
      <Line x1={132} y1={138} x2={132} y2={182} stroke={ink} strokeWidth={STROKE} />
      <Line x1={284} y1={138} x2={284} y2={182} stroke={ink} strokeWidth={STROKE} />
      {/* Upright target paper (slightly bent) taped to the table */}
      <Path d="M196 138 L200 138 L210 74 L205 73 Z" stroke={ink} strokeWidth={STROKE} fill="none" />
      <Line x1={192} y1={138} x2={206} y2={138} stroke={accent} strokeWidth={3} />
      {/* Folded paper fan (accordion) */}
      <Polyline points="36,158 50,120 64,158 78,120 92,158" stroke={accent} strokeWidth={STROKE} fill="none" />
      <Line x1={64} y1={158} x2={64} y2={172} stroke={accent} strokeWidth={STROKE} />
      {/* Moving air */}
      <Arrow x1={98} y1={118} x2={186} y2={92} color={ink} dashed />
      {/* Phone */}
      <Phone x={228} y={146} w={16} h={28} color={accent} />
      {/* Labels */}
      <Label x={64} y={112} color={accent} size={9}>Paper fan (1×10 cm)</Label>
      <Label x={142} y={86} color={label} size={9}>Moving air</Label>
      <Label x={230} y={64} color={label} size={9}>Target paper</Label>
      <Label x={236} y={142} color={accent} size={9}>Phone</Label>
      <Label x={258} y={134} color={label} size={9}>Table</Label>
    </DiagramFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Earthquake-Resistant Structure                                         */
/* -------------------------------------------------------------------------- */

export function EarthquakeDiagram() {
  const { ink, accent, label } = useDiagramColors("earthquake");
  const cups = [78, 150, 222];
  return (
    <DiagramFrame w={320} h={200}>
      {/* Cardboard platform */}
      <Rect x={56} y={92} width={188} height={12} rx={2} stroke={ink} strokeWidth={STROKE} fill="none" />
      {/* Cup pillars */}
      {cups.map((cx, i) => (
        <Polygon
          key={i}
          points={`${cx - 9},134 ${cx + 9},134 ${cx + 6},104 ${cx - 6},104`}
          stroke={ink}
          strokeWidth={STROKE}
          fill="none"
        />
      ))}
      {/* Folded-paper anti-vibration base */}
      <Polyline
        points="44,158 64,136 84,158 104,136 124,158 144,136 164,158 184,136 204,158 224,136 244,158"
        stroke={ink}
        strokeWidth={STROKE}
        fill="none"
      />
      {/* Phone centred on the platform */}
      <Phone x={135} y={56} w={30} h={34} color={accent} />
      {/* Labels */}
      <Label x={150} y={84} color={accent} size={9}>Phone</Label>
      <Label x={150} y={46} color={label} size={9}>Cardboard platform</Label>
      <Label x={222} y={122} color={label} size={9}>Cups (pillars)</Label>
      <Label x={150} y={176} color={label} size={9}>Folded paper</Label>
    </DiagramFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Human Performance Lab                                                   */
/* -------------------------------------------------------------------------- */

export function PerformanceDiagram() {
  const { ink, accent, label } = useDiagramColors("performance");
  return (
    <DiagramFrame w={320} h={200}>
      {/* Stick figure */}
      <Circle cx={108} cy={56} r={15} stroke={ink} strokeWidth={STROKE} fill="none" />
      <Line x1={108} y1={71} x2={108} y2={132} stroke={ink} strokeWidth={STROKE} />
      <Line x1={108} y1={132} x2={88} y2={172} stroke={ink} strokeWidth={STROKE} />
      <Line x1={108} y1={132} x2={128} y2={172} stroke={ink} strokeWidth={STROKE} />
      {/* Left arm */}
      <Line x1={108} y1={88} x2={78} y2={108} stroke={ink} strokeWidth={STROKE} />
      {/* Right arm holding the phone */}
      <Line x1={108} y1={88} x2={150} y2={96} stroke={ink} strokeWidth={STROKE} />
      <Phone x={150} y={84} w={20} h={30} color={accent} rotate={18} />
      {/* Movement arrows (circle + figure-8 feel) */}
      <Path d="M196 70 A26 26 0 1 1 195 71" stroke={ink} strokeWidth={STROKE} fill="none" strokeDasharray="5 4" />
      <Arrow x1={196} y1={71} x2={205} y2={62} color={ink} />
      <Arrow x1={224} y1={120} x2={250} y2={110} color={ink} />
      <Arrow x1={224} y1={140} x2={250} y2={150} color={ink} />
      {/* Labels */}
      <Label x={206} y={108} color={label} size={9}>Move in a circle</Label>
      <Label x={250} y={98} color={label} size={9}>then a figure-8</Label>
      <Label x={160} y={134} color={accent} size={9}>Hold the phone</Label>
    </DiagramFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Reaction Board Challenge                                               */
/* -------------------------------------------------------------------------- */

export function ReactionDiagram() {
  const { ink, accent, label } = useDiagramColors("reaction");
  return (
    <DiagramFrame w={320} h={200}>
      {/* Table */}
      <Line x1={48} y1={154} x2={272} y2={154} stroke={ink} strokeWidth={STROKE} />
      <Line x1={72} y1={154} x2={72} y2={184} stroke={ink} strokeWidth={STROKE} />
      <Line x1={248} y1={154} x2={248} y2={184} stroke={ink} strokeWidth={STROKE} />
      {/* Phone lying flat (parallelogram = perspective) */}
      <Polygon points="96,148 208,148 226,116 114,116" stroke={accent} strokeWidth={STROKE} fill="none" />
      {/* Traced pattern on the screen */}
      <Path d="M124 138 Q146 118 166 136 Q184 152 204 124" stroke={ink} strokeWidth={STROKE} fill="none" />
      <Circle cx={204} cy={124} r={3} fill={ink} />
      {/* Finger pointing down to the path */}
      <Line x1={214} y1={92} x2={206} y2={120} stroke={ink} strokeWidth={STROKE} strokeLinecap="round" />
      {/* Labels */}
      <Label x={150} y={106} color={label} size={9}>Finger follows the pattern</Label>
      <Label x={160} y={176} color={label} size={9}>Phone resting on a table</Label>
    </DiagramFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. Breathing Pace Trainer                                                 */
/* -------------------------------------------------------------------------- */

export function BreathingDiagram() {
  const { ink, accent, label } = useDiagramColors("breathing");
  return (
    <DiagramFrame w={320} h={200}>
      {/* Mat */}
      <Line x1={28} y1={162} x2={292} y2={162} stroke={ink} strokeWidth={STROKE} />
      {/* Person lying down (side view) */}
      <Circle cx={64} cy={130} r={15} stroke={ink} strokeWidth={STROKE} fill="none" />
      <Line x1={79} y1={134} x2={186} y2={150} stroke={ink} strokeWidth={STROKE} />
      <Line x1={186} y1={150} x2={236} y2={150} stroke={ink} strokeWidth={STROKE} />
      <Line x1={236} y1={150} x2={262} y2={138} stroke={ink} strokeWidth={STROKE} />
      {/* Bent knee */}
      <Line x1={236} y1={150} x2={250} y2={158} stroke={ink} strokeWidth={STROKE} />
      {/* Arm */}
      <Line x1={120} y1={138} x2={150} y2={150} stroke={ink} strokeWidth={STROKE} />
      {/* Phone resting on the chest */}
      <Phone x={108} y={116} w={26} h={16} color={accent} rotate={8} />
      {/* Rise/fall arrow */}
      <Arrow x1={121} y1={108} x2={121} y2={92} color={ink} />
      {/* Labels */}
      <Label x={150} y={30} color={label} size={10}>Lie down after light exercise</Label>
      <Label x={150} y={86} color={accent} size={9}>Phone on chest</Label>
    </DiagramFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

const makeStyles = (c: Palette, ACCENT: WizardAccent) =>
  StyleSheet.create({
    frame: {
      width: "100%",
      backgroundColor: ACCENT.softHeader,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: ACCENT.border,
      marginTop: 10,
      marginBottom: 4,
      overflow: "hidden",
    },
  });
