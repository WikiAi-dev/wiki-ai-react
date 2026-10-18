import { BookOpen } from "lucide-react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { Bar, Chapter, Line, Num, Stage, Up, prog, useFrame } from "../primitives";
import { C, LIGHT } from "../theme";

/* Every figure here comes from WikiAI-economics.xlsx. */

/* ---------- 2:12 Economics ---------- */

const PARTS = [
  { label: "Синтез речи", v: "0,027", flex: 27.2, color: C.cobalt },
  { label: "Языковая модель", v: "0,008", flex: 8.4, color: "rgba(91,132,255,0.6)" },
  { label: "Распознавание", v: "0,003", flex: 2.6, color: "rgba(91,132,255,0.35)" },
  { label: "Сервер и хранение", v: "0,004", flex: 4.1, color: C.dim },
];

function Source({ at, children }: { at: number; children: string }) {
  return <Up at={at} style={{ position: "absolute", right: 140, top: 1030, fontSize: 17, color: C.dim }}>{children}</Up>;
}

export function Economics() {
  const frame = useFrame();
  return (
    <Stage x={30} y={60}>
      <Chapter n={8}>Юнит-экономика</Chapter>
      <div style={{ position: "absolute", left: 140, top: 150 }}>
        <Line at={4} size={92}>Минута ассистента</Line>
        <Line at={11} size={92} color={C.soft}>стоит нам 4 копейки.</Line>
      </div>

      <div style={{ position: "absolute", left: 140, top: 400, width: 800 }}>
        <Up at={28} style={{ fontSize: 24, color: C.soft }}>Себестоимость минуты в облаке</Up>
        <Up at={32} style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 8 }}>
          <span style={{ fontSize: 164, fontWeight: 600, letterSpacing: "-0.055em", lineHeight: 1, color: C.cobalt, textShadow: "0 0 60px rgba(91,132,255,0.35)" }}>
            <Num at={34} to={0.042} decimals={3} dur={44} />
          </span>
          <span style={{ fontSize: 44, color: C.soft }}>BYN</span>
        </Up>
        <div style={{ display: "flex", gap: 5, height: 18, marginTop: 30 }}>
          {PARTS.map((p, k) => (
            <span key={p.label} style={{ flex: p.flex, borderRadius: 5, background: p.color, scale: `${prog(frame, 76 + k * 8, 26)} 1`, transformOrigin: "left" }} />
          ))}
        </div>
        <Up at={96} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 48px", marginTop: 22, fontSize: 22, color: C.soft }}>
          {PARTS.map((p) => (
            <span key={p.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <i style={{ width: 12, height: 12, borderRadius: 3, background: p.color }} />
              {p.label}
              <b style={{ marginLeft: "auto", color: C.ink, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{p.v}</b>
            </span>
          ))}
        </Up>
        <Up at={118} style={{ marginTop: 26, fontSize: 22, color: C.soft }}>
          Звонок 2,4 минуты: <b style={{ color: C.ink, fontWeight: 600 }}>0,10 BYN</b>. Место в базе знаний: <b style={{ color: C.ink, fontWeight: 600 }}>0,70 BYN</b> в месяц.
        </Up>
      </div>

      <div style={{ position: "absolute", left: 1060, top: 400, width: 720 }}>
        <Up at={140} style={{ fontSize: 24, color: C.soft }}>Клиент на тарифе «Бизнес», в месяц</Up>
        <div style={{ display: "grid", gap: 24, marginTop: 30 }}>
          {[
            { label: "Платит клиент", v: "471 BYN", pct: 100, color: C.cobalt, at: 150 },
            { label: "Себестоимость", v: "93", pct: 19.7, color: C.dim, at: 162 },
            { label: "Валовая прибыль", v: "379", pct: 80.3, color: C.ok, at: 174 },
          ].map((r) => (
            <Up key={r.label} at={r.at - 4} dist={10} style={{ display: "grid", gridTemplateColumns: "230px 1fr 130px", gap: 20, alignItems: "center", fontSize: 26 }}>
              <span>{r.label}</span>
              <Bar at={r.at} pct={r.pct} color={r.color} height={16} />
              <b style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums", color: r.color === C.dim ? C.ink : r.color }}>{r.v}</b>
            </Up>
          ))}
        </div>
        <Up at={198} style={{ marginTop: 28, fontSize: 21, color: C.soft, lineHeight: 1.5 }}>
          449 BYN подписка и 5% доплат сверх пакета. Закрытый контур: сервер клиента от $7,5 тыс., маржа 79–83%.
        </Up>
      </div>

      <div style={{ position: "absolute", left: 140, right: 140, top: 868, paddingTop: 24, borderTop: `1px solid ${C.rule}`, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 40 }}>
        {[
          { n: <Num at={232} to={80} suffix="%" />, k: "валовая маржа" },
          { n: <Num at={244} to={13} suffix="×" />, k: "LTV к CAC" },
          { n: <Num at={256} to={3.8} decimals={1} suffix=" мес" />, k: "окупаемость CAC" },
          { n: <>≈ <Num at={268} to={120} /></>, k: "клиентов до безубыточности" },
        ].map((x, k) => (
          <Up key={x.k} at={228 + k * 12}>
            <div style={{ fontSize: 64, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1 }}>{x.n}</div>
            <div style={{ fontSize: 21, color: C.soft, marginTop: 8 }}>{x.k}</div>
          </Up>
        ))}
      </div>
      <Source at={280}>Расчёт: WikiAI-economics.xlsx. Модели через OpenRouter, курс НБРБ 3,0113. CAC и отток: оценка.</Source>
    </Stage>
  );
}

/* ---------- 2:30 Pricing ---------- */

const PLANS = [
  { nm: "Старт", pr: 149, items: ["10 мест в базе знаний", "1 линия, 300 минут", "Bitrix24, Jira, документы"] },
  { nm: "Бизнес", pr: 449, on: true, items: ["30 мест в базе знаний", "3 линии, 1 500 минут", "5 операторов с подсказками", "Лиды в CRM, аналитика"] },
  { nm: "Колл-центр", pr: 1290, items: ["100 мест в базе знаний", "10 линий, 5 000 минут", "20 операторов с подсказками", "Приоритетная поддержка"] },
  { nm: "Закрытый контур", pr: 2900, from: true, items: ["Сервер у клиента", "Открытые модели, без интернета", "Внедрение от 12 000 BYN"] },
];

export function Pricing() {
  const frame = useFrame();
  return (
    <Stage x={36} y={52}>
      <Chapter n={9}>Тарифы</Chapter>
      <div style={{ position: "absolute", left: 140, top: 150 }}>
        <Line at={4} size={88}>Вдвое дешевле,</Line>
        <Line at={11} size={88} color={C.soft}>чем собирать из частей.</Line>
      </div>
      <div style={{ position: "absolute", left: 140, top: 400, display: "grid", gridTemplateColumns: "repeat(4, 380px)", gap: 40 }}>
        {PLANS.map((p, k) => {
          const a = prog(frame, 22 + k * 8, 30);
          return (
            <div
              key={p.nm}
              style={{
                opacity: a,
                translate: `0 ${(1 - a) * 50}px`,
                padding: "30px 32px",
                borderRadius: 26,
                minHeight: 360,
                background: p.on ? "linear-gradient(160deg, #3D67FF 0%, #1C38C8 100%)" : "rgba(255,255,255,0.03)",
                border: p.on ? "none" : `1px solid ${C.rule}`,
                boxShadow: p.on ? `0 0 ${120 * prog(frame, 60, 30)}px -10px rgba(76,118,255,0.55)` : "none",
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 600 }}>{p.nm}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 18 }}>
                {p.from && <span style={{ fontSize: 30, color: p.on ? C.ink : C.soft }}>от</span>}
                <span style={{ fontSize: p.pr > 999 ? 64 : 76, fontWeight: 600, letterSpacing: "-0.045em", lineHeight: 1, whiteSpace: "nowrap" }}>
                  <Num at={26 + k * 8} to={p.pr} dur={34} />
                </span>
                <span style={{ fontSize: 22, whiteSpace: "nowrap", color: p.on ? "rgba(255,255,255,0.75)" : C.soft }}>BYN/мес</span>
              </div>
              <div style={{ display: "grid", gap: 10, marginTop: 26, fontSize: 22, color: p.on ? "rgba(255,255,255,0.82)" : C.soft }}>
                {p.items.map((i) => <span key={i}>{i}</span>)}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 140, right: 140, top: 820, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80 }}>
        <Compare at={120} title="Для «Бизнеса» по отдельности, BYN в месяц" rows={[
          { label: "База знаний и голосовой агент", v: "≈ 890", pct: 100, color: C.dim },
          { label: "WikiAI «Бизнес»", v: "449", pct: 50.4, color: C.cobalt },
        ]} />
        <Compare at={150} title="Если на звонки отвечают люди, BYN в месяц" rows={[
          { label: "Линия 24/7, 4,2 ставки", v: "≈ 11 700", pct: 100, color: C.dim },
          { label: "Один оператор", v: "≈ 2 790", pct: 23.8, color: C.dim },
          { label: "WikiAI «Бизнес»", v: "449", pct: 3.8, color: C.cobalt },
        ]} />
      </div>
      <Source at={200}>Minerva Cloud 500 ₽ за место, Vapi от $0,13 за минуту, оператор 1 800 BYN до вычетов. Без НДС.</Source>
    </Stage>
  );
}

function Compare({ at, title, rows }: { at: number; title: string; rows: { label: string; v: string; pct: number; color: string }[] }) {
  return (
    <div>
      <Up at={at} style={{ fontSize: 20, color: C.dim }}>{title}</Up>
      <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
        {rows.map((r, k) => (
          <Up key={r.label} at={at + 6 + k * 8} dist={8} style={{ display: "grid", gridTemplateColumns: "330px 1fr 120px", gap: 18, alignItems: "center", fontSize: 22 }}>
            <span style={{ color: r.color === C.cobalt ? C.ink : C.soft }}>{r.label}</span>
            <Bar at={at + 10 + k * 8} pct={r.pct} color={r.color} height={12} />
            <b style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums", color: r.color === C.cobalt ? C.cobalt : C.ink }}>{r.v}</b>
          </Up>
        ))}
      </div>
    </div>
  );
}

/* ---------- 2:42 Market ---------- */

const ROWS = [
  ["Minerva", "ИИ-ассистент", "Только CRM", "Частично"],
  ["Naumen KMS", "Семантический поиск", "Только CRM", "Основной фокус"],
  ["Битрикс24", "CoPilot", "Только Bitrix", "Своя телефония"],
  ["Vapi, Retell", "Нет своей базы", "API", "Голосовой агент"],
  ["WikiAI", "RAG и граф", "Коннекторы", "Ассистент и подсказки"],
];

export function Market() {
  const frame = useFrame();
  const ring = (at: number) => prog(frame, at, 34);
  return (
    <Stage x={22} y={62}>
      <Chapter n={10}>Рынок</Chapter>
      <div style={{ position: "absolute", left: 140, top: 150 }}>
        <Line at={4} size={92}>Начинаем с Беларуси.</Line>
      </div>
      {[
        { d: 560, at: 18, border: `1.5px solid ${C.rule}`, bg: "transparent", n: "$20,1 млрд", k: "ПО для управления знаниями, мир", size: 38 },
        { d: 380, at: 32, border: `2px solid ${C.cobalt}`, bg: "rgba(91,132,255,0.06)", n: "≈ $13 млн", k: "3 650 организаций Беларуси от 101 сотрудника", size: 34 },
        { d: 200, at: 46, border: "none", bg: "linear-gradient(160deg, #3D67FF, #1C38C8)", n: "180", k: "клиентов за 3 года", size: 48 },
      ].map((r) => (
        <div
          key={r.n}
          style={{
            position: "absolute",
            left: 480 - r.d / 2,
            top: 960 - r.d,
            width: r.d,
            height: r.d,
            borderRadius: "50%",
            border: r.border,
            background: r.bg,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: r.d === 200 ? "center" : "flex-start",
            paddingTop: r.d === 200 ? 0 : 36,
            textAlign: "center",
            opacity: ring(r.at),
            scale: 0.8 + 0.2 * ring(r.at),
            transformOrigin: "50% 100%",
          }}
        >
          <div style={{ fontSize: r.size, fontWeight: 600, letterSpacing: "-0.03em" }}>{r.n}</div>
          <div style={{ fontSize: 18, color: r.d === 200 ? "rgba(255,255,255,0.8)" : C.soft, maxWidth: r.d * 0.62, marginTop: 6, lineHeight: 1.3 }}>{r.k}</div>
        </div>
      ))}
      <div style={{ position: "absolute", left: 900, top: 400, width: 880 }}>
        <Up at={50} style={{ display: "grid", gridTemplateColumns: "190px 230px 200px 1fr", fontSize: 19, color: C.dim, paddingBottom: 14 }}>
          <span>Продукт</span><span>ИИ-ответы</span><span>Интеграции</span><span>Звонки</span>
        </Up>
        {ROWS.map((r, k) => {
          const us = k === ROWS.length - 1;
          return (
            <Up key={r[0]} at={58 + k * 10} dist={10} style={{ display: "grid", gridTemplateColumns: "190px 230px 200px 1fr", padding: "20px 0", borderTop: us ? `2px solid ${C.cobalt}` : `1px solid ${C.rule}`, fontSize: 24, color: us ? C.cobalt : C.soft, fontWeight: us ? 600 : 400 }}>
              <span style={{ color: us ? C.cobalt : C.ink, fontWeight: 600 }}>{r[0]}</span>
              <span>{r[1]}</span>
              <span>{r[2]}</span>
              <span>{r[3]}</span>
            </Up>
          );
        })}
      </div>
      <Source at={140}>TAM: Grand View Research, 2024. Организации: Белстат, 2024. Конкуренты: открытые описания, октябрь 2026.</Source>
    </Stage>
  );
}

/* ---------- 2:52 Close ---------- */

export function Close() {
  const frame = useFrame();
  const live = useCurrentFrame();
  return (
    <Stage light={LIGHT.cobalt} x={78} y={50}>
      <Up at={4} style={{ position: "absolute", left: 140, top: 220 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em" }}>
          <span style={{ width: 42, height: 42, borderRadius: 12, background: C.cobaltDeep, display: "grid", placeItems: "center" }}>
            <BookOpen size={22} color="#fff" />
          </span>
          WikiAI
        </div>
      </Up>
      <div style={{ position: "absolute", left: 140, top: 320, width: 1200 }}>
        <Line at={10} size={104}>Клиент не ждёт.</Line>
        <Line at={18} size={104} color={C.soft}>Оператор не ищет.</Line>
        <Up at={48} style={{ marginTop: 48, fontSize: 36, color: C.soft, lineHeight: 1.4 }}>
          <b style={{ color: C.ink, fontWeight: 600 }}>Открыты к предложениям:</b> пилот, партнёрство, инвестиции.
        </Up>
      </div>
      <div style={{ position: "absolute", left: 1390, top: 260, width: 360, display: "grid", justifyItems: "center", gap: 28, opacity: prog(frame, 40, 30), translate: `0 ${(1 - prog(frame, 40, 30)) * 30}px` }}>
        <div style={{ width: 320, height: 320, borderRadius: 30, background: "#fff", padding: 24, boxShadow: `0 0 ${110 + 30 * Math.sin(live / 30)}px -20px rgba(76,118,255,0.6)` }}>
          <Img src={staticFile("presentation/wikiai/qr-telegram.png")} style={{ width: "100%", height: "100%" }} />
        </div>
        <div style={{ display: "grid", gap: 8, textAlign: "center", fontSize: 26 }}>
          <span>Telegram @iafanasieff</span>
          <span style={{ color: C.soft }}>wikiai.by</span>
          <span style={{ color: C.soft }}>afanasieffivan@gmail.com</span>
        </div>
      </div>
    </Stage>
  );
}
