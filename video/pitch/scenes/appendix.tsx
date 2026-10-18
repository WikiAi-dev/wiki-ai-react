import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { Bar, Chapter, Line, Num, Stage, Up, prog, useFrame } from "../primitives";
import { C, LIGHT } from "../theme";
import { Source } from "./business";

/*
 * Appendix for questions after the pitch: the detail behind the economics.
 * Not part of the 3-minute film. Every figure comes from Docs/WikiAI-economics.xlsx.
 */

function Head({ n, chapter, a, b }: { n: string; chapter: string; a: string; b?: string }) {
  return (
    <>
      <Chapter n={n}>{chapter}</Chapter>
      <div style={{ position: "absolute", left: 140, top: 150 }}>
        <Line at={4} size={80}>{a}</Line>
        {b && <Line at={11} size={80} color={C.soft}>{b}</Line>}
      </div>
    </>
  );
}

/** A plain table: the first column is labels, the rest are values. */
function Grid({ at, top, cols, head, rows, highlight }: {
  at: number;
  top: number;
  cols: string;
  head: ReactNode[];
  rows: { cells: ReactNode[]; strong?: boolean; color?: (j: number) => string | undefined }[];
  highlight?: number;
}) {
  return (
    <div style={{ position: "absolute", left: 140, top, width: 1640 }}>
      <Up at={at} style={{ display: "grid", gridTemplateColumns: cols, fontSize: 21, color: C.dim, paddingBottom: 12 }}>
        {head.map((h, j) => <span key={j} style={{ textAlign: j ? "right" : "left", color: j === highlight ? C.soft : undefined }}>{h}</span>)}
      </Up>
      {rows.map((r, k) => (
        <Up key={k} at={at + 6 + k * 6} dist={8} style={{ display: "grid", gridTemplateColumns: cols, alignItems: "center", minHeight: 54, borderTop: `1px solid ${C.rule}`, fontSize: r.strong ? 27 : 25, fontWeight: r.strong ? 600 : 400 }}>
          {r.cells.map((c, j) => (
            <span key={j} style={{ textAlign: j ? "right" : "left", color: j ? (r.color?.(j) ?? C.ink) : C.soft, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{c}</span>
          ))}
        </Up>
      ))}
    </div>
  );
}

/* ---------- П1 Cost: the minute, and the cost against the price of every module ---------- */

const PARTS = [
  { label: "Синтез речи", v: "0,027", flex: 27.2, color: C.cobalt },
  { label: "Языковая модель", v: "0,008", flex: 8.4, color: "rgba(91,132,255,0.6)" },
  { label: "Распознавание", v: "0,003", flex: 2.6, color: "rgba(91,132,255,0.35)" },
  { label: "Сервер и хранение", v: "0,004", flex: 4.1, color: C.dim },
];

const UNITS = [
  { k: "Минута ассистента", cost: "0,042", price: "0,20 BYN", share: 21, gm: "79%" },
  { k: "Оператор с подсказками", cost: "58", price: "149 BYN", share: 39, gm: "61%" },
  { k: "Сотрудник сверх пакета", cost: "0,70", price: "9 BYN", share: 8, gm: "92%" },
  { k: "1 000 ответов API", cost: "3,05", price: "15 BYN", share: 20, gm: "80%" },
];

export function Cost() {
  const frame = useFrame();
  return (
    <Stage x={30} y={60}>
      <Head n="П1" chapter="Себестоимость" a="Минута ассистента" b="стоит нам 4 копейки." />
      <div style={{ position: "absolute", left: 140, top: 400, width: 800 }}>
        <Up at={24} style={{ fontSize: 24, color: C.soft }}>Себестоимость минуты в облаке, BYN</Up>
        <Up at={28} style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 8 }}>
          <span style={{ fontSize: 150, fontWeight: 600, letterSpacing: "-0.055em", lineHeight: 1, color: C.cobalt, textShadow: "0 0 60px rgba(91,132,255,0.35)" }}>
            <Num at={30} to={0.042} decimals={3} dur={40} />
          </span>
        </Up>
        <div style={{ display: "flex", gap: 5, height: 18, marginTop: 30 }}>
          {PARTS.map((p, k) => (
            <span key={p.label} style={{ flex: p.flex, borderRadius: 5, background: p.color, scale: `${prog(frame, 60 + k * 8, 26)} 1`, transformOrigin: "left" }} />
          ))}
        </div>
        <Up at={80} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 48px", marginTop: 22, fontSize: 22, color: C.soft }}>
          {PARTS.map((p) => (
            <span key={p.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <i style={{ width: 12, height: 12, borderRadius: 3, background: p.color }} />
              {p.label}
              <b style={{ marginLeft: "auto", color: C.ink, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{p.v}</b>
            </span>
          ))}
        </Up>
        <Up at={96} style={{ marginTop: 26, fontSize: 22, color: C.soft, lineHeight: 1.5 }}>
          Звонок 2,4 минуты: <b style={{ color: C.ink, fontWeight: 600 }}>0,10 BYN</b>. Синтез речи — 71% цены моделей.
        </Up>
      </div>

      <div style={{ position: "absolute", left: 1060, top: 400, width: 720 }}>
        <Up at={60} style={{ fontSize: 24, color: C.soft }}>Себестоимость в цене модуля</Up>
        <div style={{ display: "grid", gap: 26, marginTop: 26 }}>
          {UNITS.map((u, k) => (
            <Up key={u.k} at={66 + k * 10} dist={10}>
              <div style={{ display: "flex", alignItems: "baseline", fontSize: 25 }}>
                <span>{u.k}</span>
                <span style={{ marginLeft: "auto", color: C.soft, fontVariantNumeric: "tabular-nums" }}>{u.cost} из {u.price}</span>
                <b style={{ width: 90, textAlign: "right", fontWeight: 600, color: C.ok }}>{u.gm}</b>
              </div>
              <div style={{ position: "relative", marginTop: 10 }}>
                <Bar at={70 + k * 10} pct={100} color="rgba(91,132,255,0.45)" height={12} />
                <div style={{ position: "absolute", left: 0, top: 0, height: 12, width: `${u.share}%`, borderRadius: 6, background: C.soft, opacity: prog(frame, 90 + k * 10, 20) }} />
              </div>
            </Up>
          ))}
        </div>
        <Up at={120} style={{ marginTop: 28, fontSize: 21, color: C.dim, lineHeight: 1.5 }}>
          Серым: наша себестоимость. Подсказки дешевле Google Agent Assist в 3,4 раза при полной загрузке оператора.
        </Up>
      </div>
      <Source at={130}>Модели через OpenRouter: Claude Haiku 5.5, Scribe v2, MAI-Voice. Курс НБРБ 3,0113. Лист «Себестоимость».</Source>
    </Stage>
  );
}

/* ---------- П2 Onboarding: what the team spends to set up a client ---------- */

export function Onboarding() {
  const live = useCurrentFrame();
  return (
    <Stage light={LIGHT.soft} x={60} y={40}>
      <Head n="П2" chapter="Внедрение и интеграции" a="Внедрить колл-центр стоит нам" b="3,9 тыс. BYN. Клиент платит 6,9." />
      <Grid
        at={22}
        top={400}
        cols="430px 230px 220px 250px 150px 1fr"
        head={["Услуга", "Часы команды", "Нам стоит, BYN", "Цена, BYN", "Маржа", "Срок"]}
        rows={[
          { cells: ["Быстрый старт", "4", "119", "бесплатно, в CAC", "–", "1 нед."] },
          { cells: ["«Стандарт»", "44 + 4", "1 548", "2 900", "47%", "2 нед."] },
          { cells: ["«Колл-центр»", "98 + 16", "3 869", "6 900", "44%", "4 нед."], strong: true },
          { cells: ["Свой коннектор", "12 + 60", "3 929", "8 640", "55%", "–"] },
          { cells: ["Поддержка коннектора", "6 в год", "357", "1 296 в год", "72%", "–"] },
          { cells: ["Закрытый контур M", "112", "6 667", "18 000", "63%", "–"] },
        ]}
      />
      <Up at={70} style={{ position: "absolute", left: 140, top: 800, width: 1640, fontSize: 22, color: C.dim, lineHeight: 1.5 }}>
        Часы: внедрение + разработка. Больше всего уходит на чистку базы (24 ч), сопровождение пилота (20 ч) и сценарий ассистента (16 ч).
      </Up>
      <div style={{ position: "absolute", left: 140, right: 140, top: 868, paddingTop: 22, borderTop: `1px solid ${C.rule}`, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 40 }}>
        {[
          { n: "29,8 BYN", k: "час внедрения с ФСЗН и простоем 30%" },
          { n: "59,5 BYN", k: "час разработки, простой 25%" },
          { n: "1,2", k: "внедрения «Колл-центр» на специалиста в месяц" },
          { n: "17 + 9", k: "человек на внедрении и интеграциях в 2031" },
        ].map((x, k) => (
          <Up key={x.k} at={80 + k * 8}>
            <div style={{ fontSize: 48, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1, whiteSpace: "nowrap", color: k === 2 ? C.cobalt : C.ink, opacity: k === 2 ? 0.8 + 0.2 * Math.sin(live / 30) : 1 }}>{x.n}</div>
            <div style={{ fontSize: 20, color: C.soft, marginTop: 8 }}>{x.k}</div>
          </Up>
        ))}
      </div>
      <Source at={110}>Полная стоимость: специалист 3 500, разработчик 7 500 BYN в месяц. Лист «Внедрение».</Source>
    </Stage>
  );
}

/* ---------- П3 P&L 2027–2031 ---------- */

const red = (v: string) => (v.startsWith("−") ? C.alarm : C.ok);

export function Pnl() {
  return (
    <Stage x={40} y={60}>
      <Head n="П3" chapter="Финансовый план" a="План 2027–2031," b="тысячи долларов." />
      <Grid
        at={20}
        top={370}
        cols="520px repeat(5, 1fr)"
        head={["", "2027", "2028", "2029", "2030", "2031"]}
        highlight={5}
        rows={[
          { cells: ["Клиентов на конец года", "24", "106", "301", "615", "990"] },
          { cells: ["Выручка", "148", "559", "1 634", "3 687", "6 708"], strong: true },
          { cells: ["Валовая маржа", "69%", "69%", "68%", "68%", "68%"] },
          { cells: ["Операционные расходы", "359", "719", "1 333", "1 996", "2 647"] },
          { cells: ["EBITDA", "−258", "−333", "−216", "+512", "+1 905"], strong: true, color: (j) => red(["", "−", "−", "−", "+", "+"][j]) },
          { cells: ["ARR на конец года", "198", "738", "2 068", "4 432", "7 680"], strong: true },
          { cells: ["Команда, человек", "13", "25", "45", "69", "93"] },
          { cells: ["Деньги на конец года", "242", "409", "193", "705", "2 609"] },
          { cells: ["Burn multiple", "1,3", "0,6", "0,2", "–", "–"] },
        ]}
      />
      <Source at={90}>Инвестиции: pre-seed $500 тыс. в конце 2026, seed $500 тыс. в 2028. EBITDA до налогов. Лист «План 2027–2031».</Source>
    </Stage>
  );
}

/* ---------- П4 Sensitivity: what if we are wrong ---------- */

const TTS = [
  ["$5", "72%", "76%", "80%", "82%"],
  ["$15", "71%", "73%", "74%", "75%"],
  ["$30", "69%", "68%", "66%", "66%"],
  ["$60", "66%", "58%", "51%", "46%"],
  ["$100", "62%", "45%", "30%", "19%"],
];
const LTV = [
  ["0,8%", "17,9×", "9,0×", "5,4×", "3,6×"],
  ["1,2%", "16,8×", "8,4×", "5,1×", "3,4×"],
  ["2%", "14,9×", "7,4×", "4,5×", "3,0×"],
  ["3%", "12,9×", "6,5×", "3,9×", "2,6×"],
  ["5%", "10,0×", "5,0×", "3,0×", "2,0×"],
];

function Heat({ at, left, title, cols, rows, now, good }: {
  at: number;
  left: number;
  title: string;
  cols: string[];
  rows: string[][];
  now: [number, number];
  good: (v: number) => "ok" | "mid" | "bad";
}) {
  const live = useCurrentFrame();
  const tone = { ok: "rgba(67,215,154,0.16)", mid: "rgba(255,200,90,0.14)", bad: "rgba(255,93,80,0.16)" };
  return (
    <div style={{ position: "absolute", left, top: 390, width: 780 }}>
      <Up at={at} style={{ fontSize: 23, color: C.soft }}>{title}</Up>
      <Up at={at + 4} style={{ display: "grid", gridTemplateColumns: "140px repeat(4, 1fr)", gap: 6, marginTop: 18, fontSize: 19, color: C.dim }}>
        {cols.map((c, j) => <span key={j} style={{ textAlign: j ? "center" : "left" }}>{c}</span>)}
      </Up>
      {rows.map((r, i) => (
        <Up key={i} at={at + 8 + i * 5} dist={6} style={{ display: "grid", gridTemplateColumns: "140px repeat(4, 1fr)", gap: 6, marginTop: 6 }}>
          {r.map((v, j) => {
            const n = parseFloat(v.replace(",", ".").replace(/[^0-9.]/g, ""));
            const isNow = i === now[0] && j === now[1];
            return (
              <span
                key={j}
                style={{
                  height: 58,
                  display: "grid",
                  placeItems: j ? "center" : "center start",
                  borderRadius: 10,
                  fontSize: j ? 25 : 21,
                  fontWeight: isNow ? 700 : 500,
                  color: j ? C.ink : C.soft,
                  background: j ? tone[good(n)] : "transparent",
                  outline: isNow ? `2px solid rgba(91,132,255,${0.6 + 0.4 * Math.sin(live / 20)})` : "none",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {v}
              </span>
            );
          })}
        </Up>
      ))}
    </div>
  );
}

export function Sensitivity() {
  return (
    <Stage light={LIGHT.soft} x={50} y={40}>
      <Head n="П4" chapter="Чувствительность" a="Если мы ошиблись" b="в допущениях." />
      <Heat at={20} left={140} title="Маржа колл-центра: цена синтеза × минут в месяц" cols={["$ / 1 млн симв.", "2 000", "8 000", "20 000", "40 000"]}
        rows={TTS} now={[1, 2]} good={(v) => (v >= 65 ? "ok" : v >= 50 ? "mid" : "bad")} />
      <Heat at={40} left={1000} title="LTV / CAC колл-центра: отток × CAC, BYN" cols={["Отток в мес.", "6 000", "12 000", "20 000", "30 000"]}
        rows={LTV} now={[1, 2]} good={(v) => (v >= 3 ? "ok" : v >= 2 ? "mid" : "bad")} />
      <Up at={80} style={{ position: "absolute", left: 140, top: 830, width: 1640, fontSize: 23, color: C.soft, lineHeight: 1.55 }}>
        <b style={{ color: C.ink, fontWeight: 600 }}>Проверяем первым:</b> CAC и отток (истории продаж пока нет), цену сервера в ЦОД, себестоимость в России (×1,3 из-за 152-ФЗ) и цену быстрого голоса.
      </Up>
      <Source at={100}>Рамкой отмечено, что заложено в план. Лист «Чувствительность».</Source>
    </Stage>
  );
}

/* ---------- П5 Rivals: WikiAI against the same thing bought in parts ---------- */

const PARTS_IVAN = [
  { k: "Голосовой агент Vapi на те же минуты", v: "11 294", pct: 86 },
  { k: "Подсказки Genesys 15 операторам", v: "1 129", pct: 8.6 },
  { k: "База знаний Minerva на 40 сотрудников", v: "719", pct: 5.5 },
];

const UNIT_PRICES = [
  { k: "Минута голоса", us: "0,20", them: "Vapi 0,39; роботы без ИИ 0,07" },
  { k: "Подсказки на оператора", us: "149", them: "Google ≈ 500; Zendesk ≈ 150; Genesys ≈ 75" },
  { k: "Поиск на сотрудника", us: "8,90", them: "Minerva 18; Guru 75" },
  { k: "Час интеграции", us: "120", them: "интеграторы Битрикс24 134–185" },
];

export function Rivals() {
  return (
    <Stage x={30} y={50}>
      <Head n="П5" chapter="Конкуренты" a="Из частей —" b="в 1,5 раза дороже." />
      <div style={{ position: "absolute", left: 140, top: 400, width: 800 }}>
        <Up at={20} style={{ fontSize: 24, color: C.soft }}>Колл-центр Ивана, BYN в месяц</Up>
        <div style={{ display: "grid", gap: 20, marginTop: 24 }}>
          {PARTS_IVAN.map((p, k) => (
            <Up key={p.k} at={26 + k * 8} dist={10}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, marginBottom: 8 }}>
                <span style={{ color: C.soft }}>{p.k}</span>
                <b style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{p.v}</b>
              </div>
              <Bar at={30 + k * 8} pct={p.pct} color={C.dim} height={12} />
            </Up>
          ))}
          {[
            { k: "Из частей итого", v: "13 143", pct: 100, color: C.soft },
            { k: "WikiAI", v: "8 937", pct: 68, color: C.cobalt },
          ].map((p, k) => (
            <Up key={p.k} at={58 + k * 8} dist={10}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, fontWeight: 600, marginBottom: 8 }}>
                <span>{p.k}</span>
                <span style={{ color: p.color, fontVariantNumeric: "tabular-nums" }}>{p.v}</span>
              </div>
              <Bar at={62 + k * 8} pct={p.pct} color={p.color} height={16} />
            </Up>
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", left: 1060, top: 400, width: 720 }}>
        <Up at={40} style={{ fontSize: 24, color: C.soft }}>Цена за единицу, BYN</Up>
        {UNIT_PRICES.map((u, k) => (
          <Up key={u.k} at={46 + k * 9} dist={10} style={{ padding: "18px 0", borderTop: `1px solid ${C.rule}`, marginTop: k ? 0 : 16 }}>
            <div style={{ display: "flex", alignItems: "baseline", fontSize: 26 }}>
              <span>{u.k}</span>
              <b style={{ marginLeft: "auto", fontSize: 36, fontWeight: 600, color: C.cobalt, fontVariantNumeric: "tabular-nums" }}>{u.us}</b>
            </div>
            <div style={{ fontSize: 20, color: C.dim, marginTop: 6 }}>{u.them}</div>
          </Up>
        ))}
      </div>
      <Source at={100}>Открытые цены вендоров, октябрь 2026; Google — при полной загрузке оператора. Лист «Конкуренты».</Source>
    </Stage>
  );
}

/* ---------- П6 Closed circuit: the client's server, our licence ---------- */

export function OnPrem() {
  return (
    <Stage light={LIGHT.soft} x={64} y={40}>
      <Head n="П6" chapter="Закрытый контур" a="Сервер клиента," b="наша лицензия." />
      <Grid
        at={20}
        top={390}
        cols="560px repeat(3, 1fr)"
        head={["", "S: до 5 линий", "M: до 20 линий", "L: до 50 линий"]}
        rows={[
          { cells: ["Видеокарты", "RTX PRO 4500", "RTX PRO 6000", "2× RTX PRO 6000"] },
          { cells: ["Железо клиента", "$7 500", "$20 000", "$36 000"] },
          { cells: ["Лицензия и поддержка, BYN в месяц", "2 900", "4 900", "8 900"], strong: true },
          { cells: ["Внедрение, BYN разово", "12 000", "18 000", "30 000"] },
          { cells: ["Наша маржа на лицензии", "79%", "82%", "83%"], color: () => C.ok },
          { cells: ["Наша маржа на внедрении", "60%", "63%", "65%"] },
          { cells: ["Клиент платит в первый год, BYN", "46 800", "76 800", "136 800"] },
        ]}
      />
      <Up at={70} style={{ position: "absolute", left: 140, top: 850, width: 1640, fontSize: 23, color: C.soft, lineHeight: 1.5 }}>
        Открытые модели работают без интернета, данные не покидают контур. Для банков, госсектора и всех, чьи данные не должны уходить в облако.
      </Up>
      <Source at={90}>Цены видеокарт: 2026, оценка. Лист «Закрытый контур».</Source>
    </Stage>
  );
}
