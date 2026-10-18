import { CircleCheck } from "lucide-react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Chapter, Line, Stage, Up, prog, useFrame } from "../primitives";
import { C, LIGHT } from "../theme";

/* ---------- 0:34 Solution: systems flow into WikiAI, WikiAI answers where the talk is ---------- */

const IN = [
  { name: "Bitrix24", soon: false },
  { name: "Jira", soon: false },
  { name: "Документы и файлы", soon: false },
  { name: "amoCRM", soon: true },
  { name: "1С", soon: true },
  { name: "Confluence", soon: true },
  { name: "Google Drive", soon: true },
];

const OUT = [
  { name: "Голосовой ассистент", soon: false },
  { name: "Подсказки оператору", soon: false },
  { name: "Поиск и чат сотрудников", soon: false },
  { name: "Холодные звонки", soon: true },
  { name: "MCP и API для агентов", soon: true },
];

/* Geometry in frame pixels. */
const G = { inRight: 560, inTop: 430, inStep: 70, coreX: 770, coreY: 440, coreW: 390, coreH: 400, outX: 1380, outTop: 470, outStep: 84 };
const inY = (i: number) => G.inTop + i * G.inStep;
const outY = (j: number) => G.outTop + j * G.outStep;
const coreInY = (i: number) => G.coreY + 50 + i * ((G.coreH - 100) / (IN.length - 1));
const coreOutY = (j: number) => G.coreY + 70 + j * ((G.coreH - 140) / (OUT.length - 1));

type P = [number, number];
const wire = (a: P, b: P): [P, P, P, P] => {
  const mx = (a[0] + b[0]) / 2;
  return [a, [mx, a[1]], [mx, b[1]], b];
};
const d = ([a, b, c, e]: [P, P, P, P]) => `M${a[0]},${a[1]} C${b[0]},${b[1]} ${c[0]},${c[1]} ${e[0]},${e[1]}`;
const at = ([a, b, c, e]: [P, P, P, P], t: number): P => {
  const u = 1 - t;
  const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [k[0] * a[0] + k[1] * b[0] + k[2] * c[0] + k[3] * e[0], k[0] * a[1] + k[1] * b[1] + k[2] * c[1] + k[3] * e[1]];
};

const WIRES_IN = IN.map((_, i) => wire([G.inRight + 24, inY(i)], [G.coreX, coreInY(i)]));
const WIRES_OUT = OUT.map((_, j) => wire([G.coreX + G.coreW, coreOutY(j)], [G.outX - 24, outY(j)]));

export function Solution() {
  const frame = useFrame();
  const live = useCurrentFrame();
  const ignite = prog(frame, 112, 30);
  return (
    <Stage x={50} y={58}>
        <Chapter n={3}>Решение</Chapter>
        <div style={{ position: "absolute", left: 140, top: 150 }}>
          <Line at={4} size={96}>Одна база знаний</Line>
          <Line at={12} size={54} weight={500} color={C.soft}>отвечает клиенту, оператору и менеджеру.</Line>
        </div>

        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          {WIRES_IN.map((w, i) => (
            <path key={`i${i}`} d={d(w)} pathLength={1} fill="none" stroke={IN[i].soon ? C.dim : "rgba(150,170,255,0.55)"} strokeWidth={1.6}
              strokeDasharray="1 1" strokeDashoffset={1 - prog(frame, 60 + i * 6, 40)} opacity={IN[i].soon ? 0.6 : 1} />
          ))}
          {WIRES_OUT.map((w, j) => (
            <path key={`o${j}`} d={d(w)} pathLength={1} fill="none" stroke={OUT[j].soon ? C.dim : "rgba(150,170,255,0.55)"} strokeWidth={1.6}
              strokeDasharray="1 1" strokeDashoffset={1 - prog(frame, 140 + j * 7, 40)} opacity={OUT[j].soon ? 0.6 : 1} />
          ))}
          {frame > 200 && WIRES_IN.map((w, i) => IN[i].soon ? null : <Spark key={`pi${i}`} p={at(w, (live / 50 + i * 0.31) % 1)} />)}
          {frame > 200 && WIRES_OUT.map((w, j) => OUT[j].soon ? null : <Spark key={`po${j}`} p={at(w, (live / 50 + j * 0.27) % 1)} />)}
        </svg>

        <Up at={34} style={{ position: "absolute", left: 140, width: G.inRight - 140, top: G.inTop - 70, textAlign: "right", fontSize: 21, color: C.dim }}>Ваши системы</Up>
        {IN.map((n, i) => (
          <Up key={n.name} at={30 + i * 5} dist={0} style={{ position: "absolute", left: 140, width: G.inRight - 140, top: inY(i) - 20, textAlign: "right", fontSize: 30, fontWeight: n.soon ? 400 : 500, color: n.soon ? C.dim : C.ink }}>
            {n.name}
          </Up>
        ))}

        <div
          style={{
            position: "absolute",
            left: G.coreX,
            top: G.coreY,
            width: G.coreW,
            height: G.coreH,
            borderRadius: 34,
            background: "linear-gradient(160deg, #3D67FF 0%, #1C38C8 100%)",
            boxShadow: `0 0 ${160 * ignite}px ${30 * ignite}px rgba(76,118,255,0.42), 0 1px 0 rgba(255,255,255,0.25) inset`,
            padding: "36px 38px",
            display: "grid",
            alignContent: "center",
            gap: 14,
            opacity: prog(frame, 96, 24),
            scale: interpolate(ignite, [0, 1], [0.9, 1]),
          }}
        >
          <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: "-0.04em" }}>WikiAI</div>
          <div style={{ fontSize: 24, opacity: 0.8, marginTop: -8 }}>RAG и граф знаний</div>
          <div style={{ display: "grid", gap: 10, fontSize: 21, lineHeight: 1.32, marginTop: 12, opacity: 0.92 }}>
            <span>Синхронизируется с источниками</span>
            <span>Отвечает со ссылкой на документ</span>
            <span>Облако или закрытый контур</span>
          </div>
        </div>

        <Up at={150} style={{ position: "absolute", left: G.outX, top: G.outTop - 70, fontSize: 21, color: C.dim }}>Где отвечает</Up>
        {OUT.map((n, j) => (
          <Up key={n.name} at={160 + j * 7} dist={0} style={{ position: "absolute", left: G.outX, top: outY(j) - 20, fontSize: 30, fontWeight: n.soon ? 400 : 600, color: n.soon ? C.dim : C.ink }}>
            {n.name}
          </Up>
        ))}

        <Up at={230} style={{ position: "absolute", left: 140, top: 990, fontSize: 20, color: C.dim }}>Серым отмечено то, что в работе</Up>
    </Stage>
  );
}

/** A spark of data travelling along a wire. */
function Spark({ p }: { p: P }) {
  return (
    <g>
      <circle cx={p[0]} cy={p[1]} r={11} fill="rgba(91,132,255,0.22)" />
      <circle cx={p[0]} cy={p[1]} r={4} fill="#BFD0FF" />
    </g>
  );
}

/* ---------- 0:52 Proof: live since 13 October, two signed contracts ---------- */

const FACTS = [
  { n: "13 октября", text: "Ассистент начал отвечать на реальные звонки: GSM, SIP, запись, резюме и лиды в Bitrix24." },
  { n: "0,9–1,8 с", text: "Столько оператор ждёт подсказку из базы. Замер в проде." },
  { n: "2 договора", text: "На внедрение. Цели пилотов: поиск в 3 раза быстрее, онбординг на 40% короче." },
];

const CONTRACTS = [
  { src: "presentation/wikiai/contract-abatman.jpg", who: "ЗАО «АБАТМЭН»", x: 1030, y: 210, tilt: -3, at: 34 },
  { src: "presentation/wikiai/contract-innogen.jpg", who: "ООО «Инновационная генерация»", x: 1390, y: 280, tilt: 3, at: 50 },
];

export function Proof() {
  const frame = useFrame();
  const live = useCurrentFrame();
  return (
    <Stage x={74} y={36}>
      <Chapter n={4}>Подтверждение решения</Chapter>
      <div style={{ position: "absolute", left: 140, top: 150, width: 800 }}>
        <Line at={4} size={100}>Уже работает.</Line>
        <Line at={12} size={100} color={C.soft}>Уже продаётся.</Line>
        <div style={{ marginTop: 56, display: "grid", gap: 6 }}>
          {FACTS.map((f, k) => (
            <Up key={f.n} at={38 + k * 16} style={{ padding: "24px 0", borderTop: `1px solid ${C.rule}` }}>
              <div style={{ fontSize: 64, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{f.n}</div>
              <div style={{ fontSize: 25, color: C.soft, marginTop: 12, lineHeight: 1.4, maxWidth: 700 }}>{f.text}</div>
            </Up>
          ))}
        </div>
      </div>
      {CONTRACTS.map((c) => {
        const p = prog(frame, c.at, 40);
        return (
          <div key={c.who} style={{ position: "absolute", left: c.x, top: c.y, width: 360, perspective: 2000 }}>
            <div
              style={{
                opacity: p,
                translate: `0 ${(1 - p) * 90 + Math.sin(live / 40 + c.tilt) * 4}px`,
                rotate: `y ${-24 + p * 12}deg`,
              }}
            >
              <div style={{ rotate: `${c.tilt}deg`, borderRadius: 10, overflow: "hidden", boxShadow: "0 50px 120px -30px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.08)" }}>
                <Img src={staticFile(c.src)} style={{ display: "block", width: "100%" }} />
              </div>
              <div style={{ marginTop: 22, fontSize: 24, fontWeight: 600 }}>{c.who}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 19, color: C.soft, marginTop: 6 }}>
                <CircleCheck size={18} color={C.ok} />
                Договор на внедрение, 19.09.2025
              </div>
            </div>
          </div>
        );
      })}
    </Stage>
  );
}

/* ---------- 1:04 Awards ---------- */

const AWARDS = [
  { src: "presentation/wikiai/diploma-belagroprombank.jpg", title: "Белагропромбанк", sub: "«Стартап-марафон», 2025" },
  { src: "presentation/wikiai/diploma-talents.jpg", title: "Таланты XXI века", sub: "Диплом I степени, 2025" },
  { src: "presentation/wikiai/review-bsuir.jpg", title: "Рецензия БГУИР", sub: "Кафедра ИИТ" },
  { src: "presentation/wikiai/diploma-nan.jpg", title: "НАН Беларуси", sub: "Диплом I степени, 2026" },
];

export function Awards() {
  const frame = useFrame();
  return (
    <Stage light={LIGHT.soft} x={50} y={30}>
      <Chapter n={4}>Подтверждение решения</Chapter>
      <div style={{ position: "absolute", left: 140, top: 150 }}>
        <Line at={2} size={88}>Нас оценили эксперты и жюри.</Line>
      </div>
      <div style={{ position: "absolute", left: 225, top: 340, display: "grid", gridTemplateColumns: "repeat(4, 330px)", gap: 50, perspective: 2400 }}>
        {AWARDS.map((a, k) => {
          const p = prog(frame, 10 + k * 6, 34);
          return (
            <div key={a.title} style={{ opacity: p, translate: `0 ${(1 - p) * 120}px`, rotate: `x ${(1 - p) * 28}deg` }}>
              <div style={{ width: 330, height: 440, borderRadius: 10, overflow: "hidden", background: "#fff", boxShadow: "0 40px 100px -30px rgba(0,0,0,0.9)" }}>
                <Img src={staticFile(a.src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
              </div>
              <div style={{ marginTop: 22, fontSize: 26, fontWeight: 600 }}>{a.title}</div>
              <div style={{ marginTop: 4, fontSize: 20, color: C.soft }}>{a.sub}</div>
            </div>
          );
        })}
      </div>
    </Stage>
  );
}
