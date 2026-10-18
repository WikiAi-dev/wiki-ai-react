import { BookOpen } from "lucide-react";
import type { ReactNode } from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { Chapter, Line, Num, Pulse, Stage, Up, prog, useFrame } from "../primitives";
import { C, LIGHT } from "../theme";

/* Every figure here comes from Docs/WikiAI-economics.xlsx. */

export function Source({ at, children }: { at: number; children: ReactNode }) {
  return <Up at={at} style={{ position: "absolute", left: 140, right: 140, top: 1030, textAlign: "right", fontSize: 17, color: C.dim }}>{children}</Up>;
}

/* ---------- 1:42 Business model: the core is the platform, modules sit on top ---------- */

const MODULES = [
  { nm: "Голосовой ассистент", pr: "0,20", unit: "BYN за минуту", sub: "и 99 BYN за линию", gm: "79%" },
  { nm: "Подсказки в звонках", pr: "149", unit: "BYN за оператора", sub: "холодные звонки в работе", gm: "61%" },
  { nm: "API и MCP для агентов", pr: "15", unit: "BYN за 1 000 ответов", sub: "в работе", gm: "80%", soon: true },
  { nm: "Закрытый контур", pr: "от 2 900", unit: "BYN в месяц", sub: "на сервере клиента", gm: "79–83%" },
];

const CORE = [
  { nm: "Команда", pr: 290, sub: "25 сотрудников, 3 коннектора" },
  { nm: "Компания", pr: 890, sub: "100 сотрудников, 10 коннекторов" },
  { nm: "Корпорация", pr: 2490, sub: "400 сотрудников, SSO и SLA" },
];

export function Pricing() {
  const frame = useFrame();
  const live = useCurrentFrame();
  const slab = prog(frame, 20, 34);
  const sheen = ((live / 240) % 1) * 140 - 20;
  return (
    <Stage x={40} y={70}>
      <Chapter n={8}>Бизнес-модель</Chapter>
      <div style={{ position: "absolute", left: 140, top: 150 }}>
        <Line at={4} size={88}>Продаём ядро,</Line>
        <Line at={11} size={88} color={C.soft}>зарабатываем на модулях.</Line>
      </div>

      <div style={{ position: "absolute", left: 140, top: 392, display: "grid", gridTemplateColumns: "repeat(4, 380px)", gap: 40 }}>
        {MODULES.map((m, k) => {
          const a = prog(frame, 56 + k * 10, 30);
          return (
            <div
              key={m.nm}
              style={{
                opacity: a,
                translate: `0 ${(1 - a) * -60}px`,
                height: 250,
                padding: "26px 30px",
                borderRadius: 22,
                background: "rgba(255,255,255,0.035)",
                border: `1px ${m.soon ? "dashed" : "solid"} ${m.soon ? C.rule : "rgba(91,132,255,0.35)"}`,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 600, color: m.soon ? C.soft : C.ink }}>{m.nm}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 18, whiteSpace: "nowrap" }}>
                <span style={{ fontSize: m.pr.length > 5 ? 52 : 64, fontWeight: 600, letterSpacing: "-0.045em", lineHeight: 1, color: m.soon ? C.soft : C.cobalt }}>{m.pr}</span>
              </div>
              <div style={{ fontSize: 21, color: C.soft, marginTop: 8 }}>{m.unit}</div>
              <div style={{ fontSize: 19, color: C.dim, marginTop: 4 }}>{m.sub}</div>
              <div style={{ marginTop: "auto", fontSize: 19, color: C.soft }}>маржа <b style={{ color: C.ink, fontWeight: 600 }}>{m.gm}</b></div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          left: 140,
          top: 668,
          width: 1640,
          height: 190,
          borderRadius: 26,
          overflow: "hidden",
          background: "linear-gradient(160deg, #3D67FF 0%, #1C38C8 100%)",
          boxShadow: `0 0 ${110 * slab}px -20px rgba(76,118,255,0.6)`,
          opacity: slab,
          translate: `0 ${(1 - slab) * 50}px`,
          display: "grid",
          gridTemplateColumns: "440px repeat(3, 1fr)",
          alignItems: "center",
          padding: "0 40px",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(100deg, transparent ${sheen}%, rgba(255,255,255,0.10) ${sheen + 8}%, transparent ${sheen + 16}%)` }} />
        <div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em" }}>Ядро WikiAI</div>
          <div style={{ fontSize: 21, opacity: 0.82, marginTop: 6, lineHeight: 1.35 }}>Поиск с источниками и коннекторы, маржа 80–85%</div>
        </div>
        {CORE.map((t, k) => (
          <Up key={t.nm} at={34 + k * 8} dist={12} style={{ paddingLeft: 34, borderLeft: "1px solid rgba(255,255,255,0.22)" }}>
            <div style={{ fontSize: 22, opacity: 0.85 }}>{t.nm}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4, whiteSpace: "nowrap" }}>
              <span style={{ fontSize: 50, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1.05 }}><Num at={36 + k * 8} to={t.pr} dur={32} /></span>
              <span style={{ fontSize: 19, opacity: 0.75 }}>BYN/мес</span>
            </div>
            <div style={{ fontSize: 18, opacity: 0.78, marginTop: 4 }}>{t.sub}</div>
          </Up>
        ))}
      </div>

      <Up at={110} style={{ position: "absolute", left: 140, top: 900, width: 1640, fontSize: 24, color: C.soft, lineHeight: 1.45 }}>
        <b style={{ color: C.ink, fontWeight: 600 }}>Внедрение и свои интеграции:</b> «Стандарт» 2 900 BYN, «Колл-центр» 6 900 BYN, свой коннектор от 8 640 BYN (120 BYN за час). Маржа на услугах 44–55%.
      </Up>
      <Source at={130}>Без НДС. Минута стоит нам 0,042 BYN, оператор с подсказками 58 BYN. Листы «Тарифы» и «Внедрение».</Source>
    </Stage>
  );
}

/* ---------- 2:08 Unit economics by segment ---------- */

const SEG_ROWS: { k: string; v: [string, string, string]; strong?: boolean }[] = [
  { k: "Что покупает", v: ["Ядро «Команда» и ассистент", "Ядро, ассистент, подсказки 12 операторам", "Закрытый контур M"] },
  { k: "Выручка в месяц", v: ["$174", "$1 501", "$1 627"], strong: true },
  { k: "Валовая маржа", v: ["85%", "73%", "82%"] },
  { k: "Привлечение (CAC)", v: ["$400", "$4 000", "$13 300"] },
  { k: "Окупаемость CAC", v: ["2,7 мес", "3,7 мес", "10 мес"] },
  { k: "LTV / CAC за 3 года", v: ["8,2×", "8,4×", "3,5×"], strong: true },
];
const SEGS = ["Малый бизнес", "Колл-центр", "Корпорация"];

export function Unit() {
  const frame = useFrame();
  const live = useCurrentFrame();
  const glow = 0.55 + 0.45 * Math.sin(live / 34);
  const cols = "380px repeat(3, 1fr)";
  return (
    <Stage x={56} y={56}>
      <Chapter n={10}>Юнит-экономика</Chapter>
      <div style={{ position: "absolute", left: 140, top: 150 }}>
        <Line at={4} size={88}>Клиент окупается</Line>
        <Line at={11} size={88} color={C.soft}>за 4 месяца.</Line>
      </div>

      <div style={{ position: "absolute", left: 140, top: 380, width: 1640 }}>
        <div
          style={{
            position: "absolute",
            left: 380 + (1640 - 380) / 3,
            width: (1640 - 380) / 3,
            top: -14,
            height: 470,
            borderRadius: 22,
            background: "rgba(91,132,255,0.07)",
            border: "1px solid rgba(91,132,255,0.3)",
            boxShadow: `0 0 ${60 * glow}px -20px rgba(91,132,255,0.6)`,
            opacity: prog(frame, 30, 30),
          }}
        />
        <Up at={20} style={{ display: "grid", gridTemplateColumns: cols, fontSize: 30, fontWeight: 600, paddingBottom: 14 }}>
          <span />
          {SEGS.map((s) => <span key={s} style={{ paddingLeft: 28 }}>{s}</span>)}
        </Up>
        {SEG_ROWS.map((r, k) => (
          <Up key={r.k} at={30 + k * 10} dist={10} style={{ display: "grid", gridTemplateColumns: cols, alignItems: "center", minHeight: 66, borderTop: `1px solid ${C.rule}` }}>
            <span style={{ fontSize: 23, color: C.soft }}>{r.k}</span>
            {r.v.map((v, j) => (
              <span key={j} style={{ paddingLeft: 28, fontSize: r.strong ? 40 : k === 0 ? 22 : 32, fontWeight: r.strong ? 600 : k === 0 ? 400 : 500, color: k === 0 ? C.soft : C.ink, letterSpacing: r.strong ? "-0.03em" : 0, lineHeight: 1.25, fontVariantNumeric: "tabular-nums" }}>
                {v}
              </span>
            ))}
          </Up>
        ))}
      </div>

      <div style={{ position: "absolute", left: 140, right: 140, top: 878, paddingTop: 22, borderTop: `1px solid ${C.rule}`, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 40 }}>
        {[
          { n: <Num at={104} to={76} suffix="%" />, k: "валовая маржа смешанного клиента" },
          { n: <Num at={114} to={7.4} decimals={1} suffix="×" />, k: "LTV / CAC смешанного клиента" },
          { n: <Num at={124} to={99} suffix="%" />, k: "удержание выручки колл-центров" },
          { n: <Num at={134} to={0.042} decimals={3} />, k: "BYN стоит нам минута ассистента" },
        ].map((x, k) => (
          <Up key={x.k} at={100 + k * 10}>
            <div style={{ fontSize: 56, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1 }}>{x.n}</div>
            <div style={{ fontSize: 20, color: C.soft, marginTop: 8 }}>{x.k}</div>
          </Up>
        ))}
      </div>
      <Source at={150}>CAC, отток и рост чека: оценки. LTV: валовая прибыль за 3 года с учётом оттока, без роста чека. Лист «Юнит».</Source>
    </Stage>
  );
}

/* ---------- 2:22 Market ---------- */

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
      <Chapter n={11}>Рынок</Chapter>
      <div style={{ position: "absolute", left: 140, top: 150 }}>
        <Line at={4} size={88}>Беларусь, затем Россия и СНГ.</Line>
      </div>
      {[
        { d: 560, at: 18, border: `1.5px solid ${C.rule}`, bg: "transparent", n: "$2,41 млрд", k: "ИИ в контакт-центрах, мир, +21% в год", size: 38 },
        { d: 380, at: 32, border: `2px solid ${C.cobalt}`, bg: "rgba(91,132,255,0.06)", n: "$277 млн", k: "технологии для колл-центров России, Беларуси, Казахстана, Узбекистана", size: 34 },
        { d: 200, at: 46, border: "none", bg: "linear-gradient(160deg, #3D67FF, #1C38C8)", n: "$7,7 млн", k: "ARR в 2031: 2,8% рынка", size: 40 },
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
          <div style={{ fontSize: 18, color: r.d === 200 ? "rgba(255,255,255,0.8)" : C.soft, maxWidth: r.d * 0.66, marginTop: 6, lineHeight: 1.3 }}>{r.k}</div>
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
      <Source at={140}>TAM: Fortune Business Insights, 2025. SAM: 18–20 млрд ₽ в России (Naumen, TAdviser), остальные страны по ВВП. Лист «Рынок».</Source>
    </Stage>
  );
}

/* ---------- 2:55 Close ---------- */

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
          <b style={{ color: C.ink, fontWeight: 600 }}>Pre-seed $500 тыс.</b> и пилоты с колл-центрами.
        </Up>
        <Up at={58} style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 14, fontSize: 28, color: C.soft }}>
          <Pulse color={C.ok} />
          Открыты к предложениям.
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
