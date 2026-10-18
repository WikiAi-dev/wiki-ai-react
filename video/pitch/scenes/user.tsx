import { useCurrentFrame } from "remotion";
import { Chapter, Line, Pulse, Stage, Up, Win, prog, useFrame } from "../primitives";
import { C, LIGHT } from "../theme";

/* ---------- 1:09 Persona: Ivan owns a company whose call centre answers the phone ---------- */

const PAINS = [
  ["Клиент ждёт, пока оператор ищет ответ", "в Bitrix24, 1С и папках с регламентами"],
  ["Новичок месяц учит продукт", "и часто уходит раньше, чем научится"],
  ["Менеджер теряется на возражениях", "холодный звонок срывается на первом вопросе"],
];

/* An illustrative day of Ivan's call centre; the window says it is an example. */
const DAY = [
  { k: "Ждали ответа на линии", v: "2:47", alarm: true },
  { k: "Сбросили, не дождавшись", v: "38", alarm: true },
  { k: "Новичок выходит на линию", v: "через 4 нед." },
  { k: "Холодных звонков до встречи", v: "3 из 100" },
];

export function Persona() {
  const live = useCurrentFrame();
  const queue = 6 + Math.round(2 * Math.sin(live / 37) + Math.sin(live / 13));
  return (
    <Stage light={LIGHT.soft} x={72} y={30}>
      <Chapter n={5}>Целевой пользователь</Chapter>
      <div style={{ position: "absolute", left: 140, top: 160, width: 880 }}>
        <Line at={4} size={110}>Иван Петров, 42</Line>
        <Up at={20} style={{ marginTop: 26, fontSize: 38, color: C.soft }}>Владелец IT‑интегратора с колл-центром</Up>
        <Up at={28} style={{ marginTop: 14, fontSize: 25, color: C.dim, maxWidth: 820, lineHeight: 1.45 }}>
          Минск. 15 операторов принимают 1 000+ звонков в день, ещё 6 менеджеров обзванивают базу. Знания в Bitrix24, 1С и регламентах.
        </Up>
        <Up at={60} style={{ marginTop: 50, fontSize: 21, color: C.dim }}>Что болит</Up>
        <div style={{ marginTop: 10 }}>
          {PAINS.map(([title, text], k) => (
            <Up key={title} at={66 + k * 12} style={{ padding: "20px 0", borderTop: `1px solid ${C.rule}` }}>
              <div style={{ fontSize: 36, fontWeight: 600, letterSpacing: "-0.025em" }}>{title}</div>
              <div style={{ fontSize: 23, color: C.soft, marginTop: 6 }}>{text}</div>
            </Up>
          ))}
        </div>
      </div>

      <Win at={30} title="Колл-центр Ивана, вчера" right="пример" width={600} style={{ right: 140, top: 220 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24 }}>
          <Pulse />
          Сейчас в очереди
          <b style={{ marginLeft: "auto", fontSize: 40, fontWeight: 600, color: C.alarm, fontVariantNumeric: "tabular-nums" }}>{queue}</b>
        </div>
        {DAY.map((d, k) => (
          <Up key={d.k} at={44 + k * 8} dist={10} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "16px 0", borderTop: `1px solid ${C.glassEdge}`, fontSize: 23, color: C.soft }}>
            {d.k}
            <b style={{ fontSize: 34, fontWeight: 600, color: d.alarm ? C.alarm : C.ink, fontVariantNumeric: "tabular-nums" }}>{d.v}</b>
          </Up>
        ))}
      </Win>
      <Up at={100} style={{ position: "absolute", right: 140, top: 840, width: 600, fontSize: 25, color: C.soft, lineHeight: 1.45 }}>
        <b style={{ color: C.ink, fontWeight: 600 }}>Ему нужно:</b> ответ клиенту за секунды и операторы, которые продают с первой недели.
      </Up>
    </Stage>
  );
}

/* ---------- 1:19 CJM: six steps along one line, pain above, WikiAI's answer below ---------- */

const STEPS = [
  { h: "Осознание", pain: "Клиент ждал 3 минуты и бросил трубку", ans: "Демо-звонок на живой номер" },
  { h: "Выбор", pain: "Окупится ли? Сколько стоит?", ans: "Тарифы от 149 BYN и расчёт экономии", plain: true },
  { h: "Подключение", pain: "Не хочу неделю настраивать", ans: "Bitrix24, Jira и документы за вечер" },
  { h: "Первый звонок", pain: "Понял ли ИИ суть?", ans: "Резюме, запись, ссылки в CRM" },
  { h: "Каждый день", pain: "Оператор не знает ответа", ans: "Подсказка за 1–2 секунды" },
  { h: "Рост", pain: "Хочу так же в продажах", ans: "Подсказки в холодных звонках", soon: true },
];

const LINE_Y = 590;
const colX = (i: number) => 140 + i * 280;

export function Cjm() {
  const frame = useFrame();
  const drawn = prog(frame, 30, 270);
  return (
    <Stage x={50} y={60}>
      <Chapter n={6}>CJM</Chapter>
      <div style={{ position: "absolute", left: 140, top: 150 }}>
        <Line at={4} size={96}>Путь Ивана.</Line>
        <Up at={16} style={{ marginTop: 14, fontSize: 34, color: C.soft }}>На каждом шаге своя боль и ответ WikiAI.</Up>
      </div>

      <div style={{ position: "absolute", left: 140, top: LINE_Y - 1, width: 1640, height: 2, background: C.rule }} />
      <div style={{ position: "absolute", left: 140, top: LINE_Y - 1, width: 1640, height: 2, background: C.cobalt, boxShadow: `0 0 14px ${C.cobalt}`, scale: `${drawn} 1`, transformOrigin: "left" }} />

      {STEPS.map((s, i) => {
        const on = 40 + i * 44;
        const lit = prog(frame, on, 16);
        const answered = prog(frame, on + 14, 20);
        return (
          <div key={s.h} style={{ position: "absolute", left: colX(i), top: 0, width: 240, height: 1080 }}>
            <div style={{ position: "absolute", bottom: 1080 - LINE_Y + 34, width: 240, fontSize: 25, lineHeight: 1.38, color: C.soft, opacity: lit, translate: `0 ${(1 - lit) * 14}px` }}>
              «{s.pain}»
            </div>
            <div
              style={{
                position: "absolute",
                top: LINE_Y - 13,
                width: 26,
                height: 26,
                borderRadius: 13,
                border: `2px solid ${s.soon ? C.soft : C.cobalt}`,
                background: lit > 0.5 && !s.soon ? C.cobalt : C.bg,
                boxShadow: lit > 0.5 && !s.soon ? `0 0 ${20 * lit}px ${C.cobalt}` : "none",
              }}
            />
            <div style={{ position: "absolute", top: LINE_Y + 34, fontSize: 21, color: C.dim, opacity: lit, fontVariantNumeric: "tabular-nums" }}>
              {String(i + 1).padStart(2, "0")}
            </div>
            <div style={{ position: "absolute", top: LINE_Y + 62, fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em", opacity: lit }}>{s.h}</div>
            <div
              style={{
                position: "absolute",
                top: LINE_Y + 128,
                width: 240,
                paddingTop: 18,
                borderTop: `2px ${s.soon ? "dashed" : "solid"} ${s.plain || s.soon ? C.rule : C.cobalt}`,
                fontSize: 27,
                lineHeight: 1.32,
                fontWeight: s.plain ? 400 : 600,
                color: s.soon ? C.soft : C.ink,
                opacity: answered,
                translate: `0 ${(1 - answered) * 16}px`,
              }}
            >
              {s.ans}
              {s.soon && <div style={{ fontSize: 19, fontWeight: 400, color: C.dim, marginTop: 8 }}>в работе</div>}
            </div>
          </div>
        );
      })}

      <Up at={320} style={{ position: "absolute", left: 140, top: 1000, fontSize: 22, color: C.dim }}>
        Главный фокус: быстрый ответ клиенту на входящих и в холодных звонках.
      </Up>
    </Stage>
  );
}
