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
  { k: "28 850 минут, от 20 000 по 0,16", v: 5416 },
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
        <Line at={11} size={88} color={C.soft}>а получает в 2,6 раза больше.</Line>
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
            { label: "Освобождено время 8 из 15 операторов", v: "23 000", pct: 100, color: C.ok, at: 56 },
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
            { n: <Num at={92} to={14} suffix=" тыс." />, k: "BYN чистой выгоды в месяц" },
            { n: <Num at={100} from={106} to={51} dur={40} suffix="%" />, k: "загрузка линии, была 106%" },
            { n: <Num at={108} to={15} suffix=" дн." />, k: "окупается внедрение" },
          ].map((x, k) => (
            <Up key={x.k} at={88 + k * 8}>
              <div style={{ fontSize: 56, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1, whiteSpace: "nowrap" }}>{x.n}</div>
              <div style={{ fontSize: 20, color: C.soft, marginTop: 8, lineHeight: 1.35 }}>{x.k}</div>
            </Up>
          ))}
        </div>
      </div>
      <Source at={130}>Пример: 1 000 звонков в день, ассистент закрывает 40%, подсказки сокращают разговор на 20%, оператор стоит 2 786 BYN. Лист «Клиент».</Source>
    </Stage>
  );
}

/* ---------- 2:31 Plan: ARR by country, 2027–2031, grown on revenue ---------- */

const YEARS = [
  { y: "2027", by: 0.072, ru: 0, cis: 0, total: "$72 тыс.", ebitda: "−$8 тыс." },
  { y: "2028", by: 0.25, ru: 0, cis: 0, total: "$250 тыс.", ebitda: "+$41 тыс." },
  { y: "2029", by: 0.462, ru: 0.138, cis: 0, total: "$0,6 млн", ebitda: "+$128 тыс." },
  { y: "2030", by: 0.711, ru: 0.5, cis: 0, total: "$1,2 млн", ebitda: "+$356 тыс." },
  { y: "2031", by: 0.968, ru: 1.117, cis: 0.095, total: "$2,2 млн", ebitda: "+$699 тыс." },
];
const MAX_ARR = 2.4;
const CHART_H = 380;
const PARTS = [
  { key: "by", label: "Беларусь", color: C.cobalt },
  { key: "ru", label: "Россия с 2029", color: "#2E50D8" },
  { key: "cis", label: "Казахстан и Узбекистан с 2031", color: "rgba(150,170,255,0.55)" },
] as const;

export function Plan() {
  const frame = useFrame();
  const live = useCurrentFrame();
  return (
    <Stage x={36} y={64}>
      <Chapter n={12}>План</Chapter>
      <div style={{ position: "absolute", left: 140, top: 150 }}>
        <Line at={4} size={88}>ARR $2,2 млн к 2031 году.</Line>
        <Line at={11} size={88} color={C.soft}>Растём на выручке.</Line>
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
          { n: <Num at={60} to={333} />, k: "клиента в 2031, 23% из них колл-центры" },
          { n: <Num at={70} to={22} />, k: "человека в команде к 2031, найм на выручку" },
          { n: <Num at={80} to={73} suffix="%+" />, k: "валовая маржа подписки" },
          { n: <>$<Num at={90} to={20} /> тыс.</>, k: "все инвестиции до 2031 года" },
        ].map((x, k) => (
          <Up key={x.k} at={56 + k * 10} style={{ padding: "18px 0", borderTop: `1px solid ${C.rule}` }}>
            <div style={{ fontSize: 52, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1 }}>{x.n}</div>
            <div style={{ fontSize: 21, color: C.soft, marginTop: 8 }}>{x.k}</div>
          </Up>
        ))}
      </div>
      <Source at={130}>Клиенты на конец года — план; цены, отток и CAC — лист «Юнит». 2027 по месяцам — отдельный лист.</Source>
    </Stage>
  );
}

/* ---------- 2:43 The round: $20k, and what the money does month by month ---------- */

const FUNDS = [
  { k: "Новые клиенты: реклама, демо-линия, менеджер на полставки", pct: 44, color: C.cobalt },
  { k: "Продукт: коннекторы 1С и amoCRM, подсказки в продажах", pct: 32, color: "#2E50D8" },
  { k: "Зарплата основателя", pct: 20, color: "rgba(150,170,255,0.55)" },
  { k: "Бухгалтерия и сервисы", pct: 4, color: C.dim },
];

/* Cash on the account at the end of each month of 2027, thousand $; month 0 is the round. */
const CASH = [20.0, 18.8, 17.6, 15.0, 12.9, 11.0, 9.1, 7.8, 7.2, 6.7, 8.0, 10.1, 12.2];
const MONTHS = ["старт", "янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const LOW = 9;
const CASH_H = 200;

export function Round() {
  const frame = useFrame();
  const live = useCurrentFrame();
  return (
    <Stage light={LIGHT.cobalt} x={66} y={44}>
      <Chapter n={13}>Раунд</Chapter>
      <div style={{ position: "absolute", left: 140, top: 150 }}>
        <Line at={4} size={88}>Привлекаем $20 тыс.</Line>
        <Line at={11} size={88} color={C.soft}>8% при оценке $230 тыс.</Line>
      </div>

      <div style={{ position: "absolute", left: 140, top: 400, width: 800 }}>
        <Up at={24} style={{ fontSize: 24, color: C.soft }}>На что идут расходы 2027</Up>
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
          Расходы 2027 — $39 тыс., из них $31 тыс. покрывает валовая прибыль. Доля или конвертируемый заём.
        </Up>
      </div>

      <div style={{ position: "absolute", left: 1060, top: 400, width: 720 }}>
        <Up at={40} style={{ fontSize: 24, color: C.soft }}>Деньги на счёте в 2027, тыс. $</Up>
        <div style={{ position: "relative", height: CASH_H + 70, marginTop: 20 }}>
          {CASH.map((v, m) => {
            const g = prog(frame, 46 + m * 3, 24);
            const low = m === LOW;
            return (
              <div key={m} style={{ position: "absolute", left: m * 55, bottom: 34, width: 40 }}>
                {(m === 0 || low || m === CASH.length - 1) && (
                  <div style={{ position: "absolute", bottom: (v / 20) * CASH_H * g + 8, width: 70, left: -15, textAlign: "center", fontSize: 20, fontWeight: 600, opacity: g, color: low ? C.alarm : C.ink }}>
                    {v.toLocaleString("ru-RU", { minimumFractionDigits: 1 })}
                  </div>
                )}
                <div
                  style={{
                    height: (v / 20) * CASH_H * g,
                    borderRadius: "6px 6px 0 0",
                    background: m === 0 ? C.cobalt : m >= 10 ? C.ok : "rgba(150,170,255,0.45)",
                    boxShadow: low ? `0 0 ${18 + 8 * Math.sin(live / 18)}px rgba(255,93,80,0.55)` : "none",
                    outline: low ? `2px solid ${C.alarm}` : "none",
                  }}
                />
                <div style={{ position: "absolute", top: "100%", marginTop: 8, width: 40, textAlign: "center", fontSize: 15, color: C.dim }}>{MONTHS[m]}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 6 }}>
          {[
            { n: "окт", k: "EBITDA в плюсе, дальше растём на выручке" },
            { n: "13", k: "платящих клиентов к концу 2027, 3 колл-центра" },
            { n: "$6 тыс.", k: "выручки в месяц (MRR) в декабре" },
          ].map((m, k) => (
            <Up key={m.k} at={90 + k * 8} dist={10} style={{ display: "flex", alignItems: "baseline", gap: 20, padding: "12px 0", borderTop: `1px solid ${C.rule}` }}>
              <span style={{ width: 150, flex: "none", fontSize: 36, fontWeight: 600, letterSpacing: "-0.03em", color: C.cobalt, whiteSpace: "nowrap" }}>{m.n}</span>
              <span style={{ fontSize: 22, color: C.soft, lineHeight: 1.35 }}>{m.k}</span>
            </Up>
          ))}
        </div>
      </div>
      <Source at={120}>Минимум $6,7 тыс. в сентябре: денег хватает с запасом. Сценарий: при оценке 3× ARR в 2031 доля стоит ≈ $420 тыс. Листы «Раунд» и «2027 по месяцам».</Source>
    </Stage>
  );
}
