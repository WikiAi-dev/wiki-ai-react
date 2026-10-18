import type { ReactNode } from "react";
import { CircleCheck, PhoneOutgoing, Sparkles } from "lucide-react";
import { interpolate, useCurrentFrame } from "remotion";
import { Chapter, Clock, Doc, Line, MockNote, Msg, Num, Point, Stage, Typed, Up, Win, clamp, prog, useFrame } from "../primitives";
import { C } from "../theme";

/**
 * Speech on the line. During the scripted exchange the bars follow who is
 * talking; afterwards the call goes on, so the line keeps moving softly.
 */
function Voice({ spans }: { spans: [number, number][] }) {
  const frame = useFrame();
  const live = useCurrentFrame();
  const scripted = spans.reduce((v, [a, b]) => Math.max(v, interpolate(frame, [a, a + 6, b - 6, b], [0, 1, 1, 0], clamp)), 0);
  const after = interpolate(frame, [spans[spans.length - 1][1], spans[spans.length - 1][1] + 20], [0, 1], clamp);
  const talking = Math.max(scripted, after * (0.35 + 0.3 * Math.abs(Math.sin(live / 45))));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, height: 44 }}>
      {Array.from({ length: 56 }, (_, k) => (
        <span
          key={k}
          style={{
            width: 5,
            borderRadius: 3,
            background: talking > 0.2 ? C.cobalt : C.dim,
            height: 6 + talking * 34 * Math.abs(Math.sin(live / 3.1 + k * 0.9) * Math.cos(live / 7 + k * 0.37)),
          }}
        />
      ))}
    </div>
  );
}

function Left({ children }: { children: ReactNode }) {
  return <div style={{ position: "absolute", left: 140, top: 150, width: 860 }}>{children}</div>;
}

/* ---------- 1:36 Inbound: the assistant picks up and answers from the knowledge base ---------- */

export function Inbound() {
  return (
    <Stage x={74} y={40}>
      <Chapter n={7}>Телефония</Chapter>
      <Left>
        <Line at={4} size={76}>Ассистент берёт трубку</Line>
        <Line at={11} size={76} color={C.soft}>и отвечает по базе.</Line>
        <div style={{ marginTop: 52 }}>
          <Point at={40} title="Узнаёт клиента из CRM" text="Имя, компания и сделка до первого слова" />
          <Point at={52} title="Отвечает по документам" text="Нет ответа в базе: «уточню» и вопрос в отчёт" />
          <Point at={64} title="Переводит на человека" text="«Нужен оператор», ответ прямо из браузера" />
          <Point at={80} title="Голосом за 1,5 с, в работе" text="Распознавание, ответ и синтез идут потоком" soon />
        </div>
      </Left>
      <Win at={18} title="Линия «Приёмная»" live right={<Clock from={41} />} width={760} style={{ right: 130, top: 160 }}>
        <Up at={30}><Voice spans={[[70, 112], [128, 212]]} /></Up>
        <Up at={36} style={{ border: `1px solid ${C.glassEdge}`, borderRadius: 16, padding: "16px 20px" }}>
          <div style={{ fontSize: 18, color: C.soft }}>Звонящий найден в Bitrix24 до первого слова</div>
          <div style={{ fontSize: 27, marginTop: 6 }}><b style={{ fontWeight: 600 }}>Анна Ковалёва</b>, «СтройИнвест»</div>
          <div style={{ fontSize: 20, color: C.soft, marginTop: 4 }}>Сделка «Внедрение CRM», этап: КП отправлено</div>
        </Up>
        <Msg at={70} who="Анна"><Typed at={72} every={2.6} text="Сколько займёт перенос данных из старой системы?" /></Msg>
        <Msg at={124} who="WikiAI" mine>
          <Typed at={128} every={2.4} text="По регламенту перенос занимает до пяти рабочих дней. Соединить с менеджером, чтобы назначить старт?" />
        </Msg>
        <Up at={214} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", border: `1px solid ${C.glassEdge}`, borderRadius: 14 }}>
          {[["Распознавание", "0,6 с"], ["Ответ модели", "1,1 с"], ["Синтез голоса", "0,6 с"]].map(([k, v], i) => (
            <div key={k} style={{ padding: "12px 16px", borderLeft: i ? `1px solid ${C.glassEdge}` : "none" }}>
              <div style={{ fontSize: 17, color: C.soft }}>{k}</div>
              <div style={{ fontSize: 26, fontWeight: 600, marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </Up>
        <Up at={226} style={{ fontSize: 18, color: C.soft }}>Замеры шагов, 17.10.2026. Цель: голос → голос за 1,5 с.</Up>
      </Win>
      <MockNote at={240} style={{ right: 130, top: 1010 }} />
    </Stage>
  );
}

/* ---------- 1:50 Operator: the answer arrives while the client is still talking ---------- */

export function Operator() {
  const frame = useFrame();
  const live = useCurrentFrame();
  // The hint flashes when it arrives, then keeps a quiet breathing glow.
  const flare = Math.max(interpolate(frame, [128, 146, 200], [0, 1, 0], clamp), interpolate(frame, [180, 200], [0, 1], clamp) * (0.3 + 0.12 * Math.sin(live / 22)));
  return (
    <Stage x={74} y={44}>
      <Chapter n={7}>Телефония</Chapter>
      <Left>
        <Line at={4} size={76}>Оператору не нужно</Line>
        <Line at={11} size={76} color={C.soft}>искать ответ.</Line>
        <div style={{ marginTop: 52 }}>
          <Point at={40} title="Подсказка за 1–2 секунды" text="Пока клиент ещё договаривает вопрос" />
          <Point at={52} title="Бриф при переводе" text="Кто звонит, что уже обсудили, что ему нужно" />
          <Point at={70} title="Холодные звонки, в работе" text="Ответы на возражения и кейсы под рукой" soon />
        </div>
      </Left>
      <Win at={18} title="Рабочее место оператора" live right="Анна Ковалёва" width={760} style={{ right: 130, top: 170 }}>
        <Up at={30} style={{ borderRadius: 16, padding: "16px 20px", background: "rgba(91,132,255,0.10)" }}>
          <div style={{ fontSize: 18, color: C.cobalt, fontWeight: 600 }}>Бриф при переводе</div>
          <div style={{ fontSize: 24, marginTop: 6, lineHeight: 1.4 }}>Обсуждает КП на внедрение CRM для 25 сотрудников, просит менеджера.</div>
        </Up>
        <Up at={58} style={{ display: "grid", gridTemplateColumns: "92px 1fr", gap: 12, fontSize: 26, lineHeight: 1.4 }}>
          <span style={{ fontSize: 19, color: C.soft, paddingTop: 4 }}>Клиент</span>
          <span><Typed at={62} every={3} text="А если через год добавим ещё десять человек, цена изменится?" /></span>
        </Up>
        <div style={{ perspective: 1600 }}>
          <div
            style={{
              opacity: prog(frame, 128, 18),
              translate: `${(1 - prog(frame, 128, 22)) * 40}px 0`,
              borderRadius: 18,
              padding: "18px 22px",
              border: `2px solid ${C.cobalt}`,
              background: "rgba(91,132,255,0.08)",
              boxShadow: `0 0 ${70 * flare}px ${8 * flare}px rgba(91,132,255,0.45)`,
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 19, fontWeight: 600, color: C.cobalt }}>
              <Sparkles size={20} />
              Подсказка из базы
              <span style={{ marginLeft: "auto" }}><Num at={110} to={1.2} dur={36} decimals={1} suffix=" с" /></span>
            </div>
            <div style={{ fontSize: 27, lineHeight: 1.4 }}>Расширение по прайсу 2026: 80 BYN за пользователя в год, повторное внедрение не нужно.</div>
            <div><Doc>Прайс 2026.pdf, раздел 4</Doc></div>
          </div>
        </div>
        <Up at={196} style={{ borderRadius: 18, padding: "16px 22px", border: `1.5px dashed ${C.rule}`, color: C.soft }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 18, fontWeight: 600 }}>
            <PhoneOutgoing size={18} />
            Холодный звонок, скоро
          </div>
          <div style={{ fontSize: 23, marginTop: 6, lineHeight: 1.4 }}>Возражение «у нас уже есть CRM»: ответ из скрипта продаж и кейс похожего клиента.</div>
        </Up>
      </Win>
      <MockNote at={230} style={{ right: 130, top: 1010 }} />
    </Stage>
  );
}

/* ---------- 2:04 After the call: the CRM card fills itself ---------- */

const FIELDS = [
  ["Контакт", "Сергей Лебедев, +375 29 •••-45-67"],
  ["Компания", "«ТехноСтрой»"],
  ["Потребность", "Bitrix24 для отдела из 10 человек"],
  ["Следующий шаг", "Перезвонить сегодня после 15:00"],
];

export function AfterCall() {
  return (
    <Stage x={74} y={40}>
      <Chapter n={7}>Телефония</Chapter>
      <Left>
        <Line at={4} size={76}>После звонка</Line>
        <Line at={11} size={76} color={C.soft}>CRM уже заполнена.</Line>
        <div style={{ marginTop: 52 }}>
          <Point at={30} title="Резюме, запись, расшифровка" text="Страница звонка вместо часа перезвонов" />
          <Point at={42} title="Контакт и сделка в Bitrix24" text="Новый клиент или дополненная карточка" />
          <Point at={54} title="Вопросы без ответа пополняют базу" text="В один клик, и ассистент отвечает дальше сам" />
        </div>
      </Left>
      <Win at={10} title="Bitrix24: новая сделка" right="после звонка" width={760} style={{ right: 130, top: 260 }}>
        <div style={{ border: `1px solid ${C.glassEdge}`, borderRadius: 16 }}>
          {FIELDS.map(([k, v], i) => (
            <div key={k} style={{ display: "grid", gridTemplateColumns: "190px 1fr", gap: 12, padding: "16px 20px", borderTop: i ? `1px solid ${C.glassEdge}` : "none", alignItems: "baseline" }}>
              <span style={{ fontSize: 19, color: C.soft }}>{k}</span>
              <span style={{ fontSize: 26 }}><Typed at={26 + i * 22} every={1.8} text={v} /></span>
            </div>
          ))}
        </div>
        <Up at={136} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 24, fontWeight: 600, color: C.ok }}>
          <CircleCheck size={26} />
          Контакт и сделка созданы, резюме и запись приложены
        </Up>
        <Up at={160} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 23, padding: "16px 20px", borderRadius: 14, background: "rgba(255,255,255,0.05)" }}>
          <span style={{ color: C.soft }}>Без ответа:</span>
          «Есть ли скидка для НКО?»
          <span style={{ marginLeft: "auto", color: C.cobalt, fontWeight: 600 }}>Добавить в базу</span>
        </Up>
      </Win>
      <MockNote at={180} style={{ right: 130, top: 860 }} />
    </Stage>
  );
}
