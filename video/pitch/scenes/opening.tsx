import { BookOpen, PhoneOff, Search } from "lucide-react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { Bar, Chapter, Clock, Doc, Line, MockNote, Msg, Num, Pulse, Stage, Typed, Up, Win, clamp, mmss, prog, useFrame } from "../primitives";
import { C, LIGHT } from "../theme";

/** 0:00 Title: the promise, and a call that is answered from the company's data. */
export function Title() {
  const frame = useFrame();
  return (
    <Stage x={76} y={40}>
      <div
        style={{
          position: "absolute",
          left: 140,
          top: 262,
          height: 2,
          width: 620 * prog(frame, 0, 34),
          background: `linear-gradient(90deg, ${C.cobalt}, rgba(91,132,255,0))`,
          boxShadow: `0 0 18px ${C.cobalt}`,
        }}
      />
      <Up at={4} style={{ position: "absolute", left: 140, top: 192 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em" }}>
          <span style={{ width: 42, height: 42, borderRadius: 12, background: C.cobaltDeep, display: "grid", placeItems: "center" }}>
            <BookOpen size={22} color="#fff" />
          </span>
          WikiAI
        </div>
      </Up>
      <div style={{ position: "absolute", left: 140, top: 310, width: 860 }}>
        <Line at={10} size={120}>Ответ клиенту</Line>
        <Line at={17} size={120}>за секунды.</Line>
        <Up at={40} style={{ marginTop: 36 }}>
          <div style={{ fontSize: 36, lineHeight: 1.38, color: C.soft, maxWidth: 700 }}>
            Из знаний вашей компании: Bitrix24, Jira и документов. Прямо в звонке, у оператора и в CRM.
          </div>
        </Up>
        <Up at={58} style={{ display: "flex", gap: 64, marginTop: 64, paddingTop: 26, borderTop: `1px solid ${C.rule}`, fontSize: 26 }}>
          <div><div style={{ color: C.dim, fontSize: 20, marginBottom: 6 }}>Статус</div>В проде с октября 2026</div>
          <div><div style={{ color: C.dim, fontSize: 20, marginBottom: 6 }}>Где работает</div>Облако или закрытый контур</div>
        </Up>
      </div>
      <Win at={62} title="Входящий звонок" live right={<Clock from={12} />} width={700} style={{ right: 130, top: 200 }}>
        <Msg at={92} who="Клиент">Сколько стоит внедрить Bitrix24 на десять человек?</Msg>
        <Up at={120} dist={10} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", fontSize: 19, color: C.soft }}>
          Нашёл в базе:
          <Doc>Прайс 2026.pdf</Doc>
          <Doc>Сделка «ТехноСтрой»</Doc>
          <Doc>Регламент внедрения</Doc>
        </Up>
        <Msg at={150} who="WikiAI" mine>
          <Typed at={156} every={1.8} text="Для десяти пользователей внедрение стоит 2 400 BYN и занимает две недели. Соединить с менеджером, чтобы назначить старт?" />
        </Msg>
        <Up at={92} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, alignItems: "center", fontSize: 19, color: C.soft, paddingTop: 16, borderTop: `1px solid ${C.glassEdge}` }}>
          <span>Ответ голосом</span>
          <Bar at={112} pct={100} color={C.cobalt} height={6} dur={45} />
          <span>цель <b style={{ color: C.ink, fontWeight: 600 }}>1,5 с</b></span>
        </Up>
      </Win>
      <MockNote at={210} style={{ right: 130, top: 900 }} />
    </Stage>
  );
}

const PAINS = [
  ["Пять систем на один вопрос.", "Bitrix24, 1С, Jira, регламенты и чаты отдела."],
  ["Месяц на обучение новичка.", "Уходя, сотрудник уносит знания с собой."],
  ["Холодный звонок срывается", "на первом сложном вопросе клиента."],
  ["Эксперты повторяют одно и то же", "вместо своей работы."],
];

const SOURCES = ["Bitrix24", "1С", "Jira", "Регламенты", "Чат отдела"];

/** 0:10 Problem: the client waits on hold while the operator searches, then hangs up. */
export function Problem() {
  const frame = useFrame();
  const live = useCurrentFrame();
  const waited = interpolate(frame, [26, 150], [0, 167], { ...clamp, easing: Easing.bezier(0.33, 0, 0.67, 1) });
  const hop = frame >= 34 && frame < 150 ? Math.floor((frame - 34) / 9) % SOURCES.length : -1;
  const lost = prog(frame, 158, 20);
  return (
    <Stage light={LIGHT.red} x={76} y={44}>
      <Chapter n={1}>Проблема</Chapter>
      <div style={{ position: "absolute", left: 140, top: 170, width: 820 }}>
        <Line at={4} size={104}>Клиент ждёт.</Line>
        <Line at={12} size={104} color={C.soft}>Оператор ищет.</Line>
        <div style={{ marginTop: 64, width: 760 }}>
          {PAINS.map(([lead, rest], k) => (
            <Up key={lead} at={178 + k * 12} style={{ padding: "18px 0", borderTop: `1px solid ${C.rule}`, fontSize: 27, lineHeight: 1.4, color: C.soft }}>
              <b style={{ color: C.ink, fontWeight: 600 }}>{lead}</b> {rest}
            </Up>
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", left: 1060, top: 200, width: 720 }}>
        <Up at={18} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, color: C.soft }}>
          <Pulse />
          Клиент на удержании
        </Up>
        <Up at={22}>
          <div style={{ fontSize: 230, fontWeight: 600, letterSpacing: "-0.05em", lineHeight: 1, marginTop: 10, color: C.alarm, fontVariantNumeric: "tabular-nums" }}>
            {mmss(waited)}
          </div>
        </Up>
        <Up at={30} style={{ display: "flex", gap: 10, marginTop: 26 }}>
          {SOURCES.map((s, k) => (
            <span key={s} style={{ fontSize: 22, padding: "10px 16px", borderRadius: 12, border: `1.5px solid ${hop === k ? C.ink : C.rule}`, color: hop === k ? C.ink : C.soft }}>
              {s}
            </span>
          ))}
        </Up>
        <Up at={36} style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 14, padding: "18px 22px", borderRadius: 14, background: "rgba(255,255,255,0.05)", fontSize: 26 }}>
          <Search size={24} color={C.soft} />
          гарантия на внедрение
          <span style={{ width: 2, height: 28, background: C.ink, opacity: Math.floor(live / 15) % 2 }} />
        </Up>
        <Up at={60} style={{ marginTop: 14, fontSize: 21, color: C.dim }}>Найдено 37 документов, нужного нет</Up>
        <div style={{ marginTop: 44, opacity: lost, translate: `0 ${(1 - lost) * 16}px` }}>
          <div style={{ height: 2, width: `${lost * 100}%`, background: C.alarm, boxShadow: `0 0 16px ${C.alarm}` }} />
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 24 }}>
            <PhoneOff size={36} color={C.alarm} />
            <div>
              <div style={{ fontSize: 42, fontWeight: 600, letterSpacing: "-0.02em", color: C.alarm }}>Клиент положил трубку.</div>
              <div style={{ fontSize: 24, color: C.soft, marginTop: 4 }}>Ответ так и не нашли. Лид потерян.</div>
            </div>
          </div>
        </div>
      </div>
    </Stage>
  );
}

/** 0:24 Evidence: four sourced numbers, counted up in a row. */
export function Evidence() {
  const frame = useFrame();
  const stats = [
    { n: <Num at={34} to={25} suffix="%" />, text: "рабочего времени команды тратят на поиск ответов", src: "Atlassian, State of Teams 2025" },
    { n: <Num at={48} to={47} suffix="%" />, text: "сотрудников с трудом находят информацию для работы", src: "Gartner, Digital Worker Survey 2023" },
    { n: <>2<span style={{ fontSize: "0.5em", fontWeight: 500, color: C.soft, margin: "0 0.35em", letterSpacing: 0 }}>из</span>3</>, text: "звонящих готовы ждать на линии не дольше двух минут", src: "Arise, по данным ICMI" },
    { n: <Num at={76} to={70} suffix="%" />, text: "времени продавцы тратят не на продажи", src: "Salesforce, State of Sales 2024" },
  ];
  return (
    <Stage light={LIGHT.soft} x={50} y={24}>
      <Chapter n={2}>Подтверждение проблемы</Chapter>
      <div style={{ position: "absolute", left: 140, top: 170 }}>
        <Line at={4} size={96}>Время уходит на поиск.</Line>
        <Line at={12} size={96} color={C.soft}>Клиент не ждёт.</Line>
      </div>
      <div style={{ position: "absolute", left: 140, right: 140, top: 560, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 56 }}>
        {stats.map((s, k) => (
          <div key={s.src}>
            <div style={{ height: 2, background: k === 0 ? C.cobalt : C.ink, scale: `${prog(frame, 24 + k * 14, 26)} 1`, transformOrigin: "left" }} />
            <Up at={28 + k * 14}>
              <div style={{ fontSize: 124, fontWeight: 600, letterSpacing: "-0.05em", lineHeight: 1, marginTop: 30, color: k === 0 ? C.cobalt : C.ink }}>{s.n}</div>
              <div style={{ fontSize: 28, lineHeight: 1.35, marginTop: 22 }}>{s.text}</div>
              <div style={{ fontSize: 19, color: C.dim, marginTop: 14 }}>{s.src}</div>
            </Up>
          </div>
        ))}
      </div>
    </Stage>
  );
}
