import { useCurrentFrame } from "remotion";
import { Bar, Chapter, Line, Num, Pulse, Stage, Up, prog, useFrame } from "../primitives";
import { C, LIGHT } from "../theme";
import { Source } from "./business";

/* Every figure here comes from Docs/WikiAI-economics.xlsx. */

/* ---------- 1:56 Client economics: what Ivan pays and what he gets back ---------- */

const BILL = [
  { k: "Ядро «Компания»", v: 890 },
  { k: "Подсказки 15 операторам", v: 2235 },
  { k: "4 линии ассистента", v: 396 },
  { k: "28 850 минут ассистента", v: 5416 },
];

export function ClientRoi() {
  const frame = useFrame();
  const live = useCurrentFrame();
  const queue = Math.sin(live / 53 + 2) > 0.9 ? 1 : 0;
  return (
    <Stage light={LIGHT.soft} x={70} y={40}>
      <Chapter n={9}>Экономика клиента</Chapter>
      <div style={{ position: "absolute", left: 140, top: 150 }}>
        <Line at={4} size={88}>Иван платит 8,9 тыс. BYN,</Line>
        <Line at={11} size={88} color={C.soft}>а экономит 23 тыс. в месяц.</Line>
      </div>

      <div style={{ position: "absolute", left: 140, top: 400, width: 780 }}>
        <Up at={24} style={{ fontSize: 24, color: C.soft }}>Счёт Ивана в месяц, BYN</Up>
        <div style={{ marginTop: 14 }}>
          {BILL.map((b, k) => (
            <Up key={b.k} at={30 + k * 9} dist={10} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "16px 0", borderTop: `1px solid ${C.rule}`, fontSize: 27 }}>
              <span style={{ color: C.soft }}>{b.k}</span>
              <b style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}><Num at={32 + k * 9} to={b.v} dur={28} /></b>
            </Up>
          ))}
          <Up at={70} dist={10} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "18px 0", borderTop: `2px solid ${C.cobalt}`, fontSize: 34, fontWeight: 600 }}>
            <span>Итого</span>
            <span style={{ color: C.cobalt, fontVariantNumeric: "tabular-nums" }}><Num at={72} to={8937} dur={30} /></span>
          </Up>
        </div>
        <Up at={90} style={{ marginTop: 18, fontSize: 22, color: C.soft, lineHeight: 1.5 }}>
          Плюс внедрение «Колл-центр» 6 900 BYN один раз. Наша маржа на Иване 74%.
        </Up>
      </div>

      <div style={{ position: "absolute", left: 1060, top: 400, width: 720 }}>
        <Up at={40} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, color: C.soft }}>
          <Pulse color={C.ok} />
          В очереди сейчас
          <b style={{ marginLeft: "auto", fontSize: 40, fontWeight: 600, color: C.ok, fontVariantNumeric: "tabular-nums" }}>{queue}</b>
        </Up>
        <div style={{ display: "grid", gap: 22, marginTop: 30 }}>
          {[
            { label: "Время 8 из 15 операторов", v: "23 000", pct: 100, color: C.ok, at: 56 },
            { label: "Счёт WikiAI", v: "8 937", pct: 38.9, color: C.cobalt, at: 66 },
          ].map((r) => (
            <Up key={r.label} at={r.at - 4} dist={10}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 25, marginBottom: 10 }}>
                <span>{r.label}</span>
                <b style={{ fontWeight: 600, color: r.color, fontVariantNumeric: "tabular-nums" }}>{r.v}</b>
              </div>
              <Bar at={r.at} pct={r.pct} color={r.color} height={18} />
            </Up>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 30, marginTop: 44 }}>
          {[
            { n: <Num at={92} to={2.6} decimals={1} suffix="×" />, k: "отдача на рубль счёта" },
            { n: <><Num at={100} from={106} to={51} dur={40} suffix="%" /></>, k: "загрузка линии, была 106%" },
            { n: <Num at={108} to={15} suffix=" дн." />, k: "окупается внедрение" },
          ].map((x, k) => (
            <Up key={x.k} at={88 + k * 8}>
              <div style={{ fontSize: 56, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1 }}>{x.n}</div>
              <div style={{ fontSize: 20, color: C.soft, marginTop: 8, lineHeight: 1.35 }}>{x.k}</div>
            </Up>
          ))}
        </div>
      </div>
      <Source at={130}>Пример: 1 000 звонков в день, ассистент закрывает 40%, подсказки сокращают разговор на 20%, оператор стоит 2 786 BYN. Лист «Клиент».</Source>
    </Stage>
  );
}

/* ---------- 2:31 Plan: ARR by country, 2027–2031 ---------- */

const YEARS = [
  { y: "2027", by: 0.161, ru: 0.037, cis: 0, total: "$0,2 млн", ebitda: "−$258 тыс." },
  { y: "2028", by: 0.432, ru: 0.306, cis: 0, total: "$0,74 млн", ebitda: "−$333 тыс." },
  { y: "2029", by: 0.778, ru: 1.183, cis: 0.107, total: "$2,1 млн", ebitda: "−$216 тыс." },
  { y: "2030", by: 1.15, ru: 2.862, cis: 0.421, total: "$4,4 млн", ebitda: "+$512 тыс." },
  { y: "2031", by: 1.525, ru: 5.224, cis: 0.931, total: "$7,7 млн", ebitda: "+$1,9 млн" },
];
const MAX_ARR = 8;
const CHART_H = 380;
const PARTS = [
  { key: "by", label: "Беларусь", color: C.cobalt },
  { key: "ru", label: "Россия", color: "#2E50D8" },
  { key: "cis", label: "Казахстан и Узбекистан", color: "rgba(150,170,255,0.55)" },
] as const;

export function Plan() {
  const frame = useFrame();
  const live = useCurrentFrame();
  return (
    <Stage x={36} y={64}>
      <Chapter n={12}>План</Chapter>
      <div style={{ position: "absolute", left: 140, top: 150 }}>
        <Line at={4} size={88}>ARR $7,7 млн к 2031 году.</Line>
        <Line at={11} size={88} color={C.soft}>Прибыль с 2030-го.</Line>
      </div>

      <div style={{ position: "absolute", left: 140, top: 410, width: 1060, height: CHART_H + 120 }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: CHART_H, height: 1, background: C.rule }} />
        {YEARS.map((y, i) => {
          const g = prog(frame, 24 + i * 10, 40);
          const total = y.by + y.ru + y.cis;
          const last = i === YEARS.length - 1;
          return (
            <div key={y.y} style={{ position: "absolute", left: i * 212, width: 150, top: 0, height: CHART_H + 120 }}>
              <div style={{ position: "absolute", bottom: 120 + (total / MAX_ARR) * CHART_H * g + 12, width: 150, textAlign: "center", fontSize: 26, fontWeight: 600, opacity: g, whiteSpace: "nowrap" }}>
                {y.total}
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: 120,
                  width: 150,
                  height: (total / MAX_ARR) * CHART_H * g,
                  display: "flex",
                  flexDirection: "column-reverse",
                  borderRadius: "10px 10px 0 0",
                  overflow: "hidden",
                  boxShadow: last ? `0 0 ${50 + 20 * Math.sin(live / 30)}px -10px rgba(76,118,255,0.7)` : "none",
                }}
              >
                {PARTS.map((p) => (
                  <div key={p.key} style={{ flex: y[p.key], background: p.color }} />
                ))}
              </div>
              <div style={{ position: "absolute", top: CHART_H + 16, width: 150, textAlign: "center", fontSize: 24, color: C.soft }}>{y.y}</div>
              <div style={{ position: "absolute", top: CHART_H + 54, width: 150, textAlign: "center", fontSize: 20, fontWeight: 500, opacity: prog(frame, 80 + i * 6, 20), color: y.ebitda.startsWith("+") ? C.ok : C.alarm, whiteSpace: "nowrap" }}>
                {y.ebitda}
              </div>
            </div>
          );
        })}
        <Up at={90} style={{ position: "absolute", top: CHART_H + 90, left: 0, display: "flex", gap: 28, fontSize: 19, color: C.soft }}>
          {PARTS.map((p) => (
            <span key={p.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <i style={{ width: 12, height: 12, borderRadius: 3, background: p.color }} />
              {p.label}
            </span>
          ))}
          <span style={{ color: C.dim }}>Под годами: EBITDA</span>
        </Up>
      </div>

      <div style={{ position: "absolute", left: 1300, top: 410, width: 480 }}>
        {[
          { n: <Num at={60} to={990} />, k: "клиентов в 2031, 30% из них колл-центры" },
          { n: <Num at={70} to={80} suffix="%" />, k: "ARR 2031 из России и СНГ" },
          { n: <Num at={80} to={70} suffix="%+" />, k: "валовая маржа подписки" },
          { n: <>$<Num at={90} to={1} /> млн</>, k: "инвестиций до прибыли: pre-seed и seed" },
        ].map((x, k) => (
          <Up key={x.k} at={56 + k * 10} style={{ padding: "18px 0", borderTop: `1px solid ${C.rule}` }}>
            <div style={{ fontSize: 52, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1 }}>{x.n}</div>
            <div style={{ fontSize: 21, color: C.soft, marginTop: 8 }}>{x.k}</div>
          </Up>
        ))}
      </div>
      <Source at={130}>Клиенты на конец года — план; цены, отток и CAC — лист «Юнит». Россия со второй половины 2027, Казахстан и Узбекистан с 2029.</Source>
    </Stage>
  );
}

/* ---------- 2:43 The round ---------- */

const FUNDS = [
  { k: "Продукт: разработка, качество ответов, скорость голоса", pct: 40, color: C.cobalt },
  { k: "Продажи и маркетинг в Беларуси и России", pct: 32, color: "#2E50D8" },
  { k: "Основатели, руководители, серверы, офис", pct: 24, color: "rgba(150,170,255,0.55)" },
  { k: "Выход в Россию: юрлицо, ЦОД под 152-ФЗ", pct: 4, color: C.dim },
];

const MILESTONES = [
  { n: "65", k: "платящих клиентов, 18 колл-центров" },
  { n: "$470 тыс.", k: "ARR" },
  { n: "20+", k: "клиентов в России" },
  { n: "1,5 с", k: "ответ голосом и подсказки в продажах" },
];

export function Round() {
  const frame = useFrame();
  return (
    <Stage light={LIGHT.cobalt} x={66} y={44}>
      <Chapter n={13}>Раунд</Chapter>
      <div style={{ position: "absolute", left: 140, top: 150 }}>
        <Line at={4} size={88}>Привлекаем $500 тыс.</Line>
        <Line at={11} size={88} color={C.soft}>16,7% при оценке $2,5 млн.</Line>
      </div>

      <div style={{ position: "absolute", left: 140, top: 400, width: 800 }}>
        <Up at={24} style={{ fontSize: 24, color: C.soft }}>На что пойдут деньги за 18 месяцев</Up>
        <div style={{ display: "flex", gap: 5, height: 22, marginTop: 22 }}>
          {FUNDS.map((f, k) => (
            <span key={f.k} style={{ flex: f.pct, borderRadius: 6, background: f.color, scale: `${prog(frame, 30 + k * 8, 26)} 1`, transformOrigin: "left" }} />
          ))}
        </div>
        <div style={{ marginTop: 18 }}>
          {FUNDS.map((f, k) => (
            <Up key={f.k} at={44 + k * 8} dist={10} style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 0", borderTop: `1px solid ${C.rule}`, fontSize: 24 }}>
              <i style={{ width: 14, height: 14, borderRadius: 4, background: f.color, flex: "none" }} />
              <span style={{ color: C.soft }}>{f.k}</span>
              <b style={{ marginLeft: "auto", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{f.pct}%</b>
            </Up>
          ))}
        </div>
        <Up at={84} style={{ marginTop: 20, fontSize: 21, color: C.dim, lineHeight: 1.5 }}>
          Доля или конвертируемый заём. Можно двумя траншами по $250 тыс.
        </Up>
      </div>

      <div style={{ position: "absolute", left: 1060, top: 400, width: 720 }}>
        <Up at={50} style={{ fontSize: 24, color: C.soft }}>К seed-раунду в середине 2028</Up>
        <div style={{ marginTop: 10 }}>
          {MILESTONES.map((m, k) => (
            <Up key={m.k} at={58 + k * 10} dist={10} style={{ display: "flex", alignItems: "baseline", gap: 22, padding: "16px 0", borderTop: `1px solid ${C.rule}` }}>
              <span style={{ width: 230, flex: "none", fontSize: 46, fontWeight: 600, letterSpacing: "-0.04em", color: C.cobalt, whiteSpace: "nowrap" }}>{m.n}</span>
              <span style={{ fontSize: 23, color: C.soft, lineHeight: 1.35 }}>{m.k}</span>
            </Up>
          ))}
        </div>
        <Up at={104} style={{ marginTop: 22, fontSize: 23, color: C.soft, lineHeight: 1.5 }}>
          <b style={{ color: C.ink, fontWeight: 600 }}>Дальше:</b> seed $500 тыс. в 2028, EBITDA в плюсе с 2030.
        </Up>
      </div>
      <Source at={120}>Сумма: расходы 2027 и первой половины 2028 минус валовая прибыль, плюс 15% запаса. Лист «Раунд».</Source>
    </Stage>
  );
}
