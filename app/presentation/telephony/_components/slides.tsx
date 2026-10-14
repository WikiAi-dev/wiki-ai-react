"use client";

import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  Bell,
  ChartColumn,
  Check,
  Clock,
  Cpu,
  FileText,
  Headset,
  Layers,
  MessageCircle,
  Mic,
  Moon,
  PenLine,
  Phone,
  Search,
  Send,
  Server,
  ShieldCheck,
  Signal,
  Smartphone,
  Sparkles,
  User,
  UserPlus,
  Volume2,
  Wallet,
} from "lucide-react";

export type Slide = {
  /** Where the slide sits in the 3-minute script. */
  time: string;
  /** What the speaker says; shown in the notes panel. */
  note: string;
  className?: string;
  body: ReactNode;
};

/** True while the slide around it is on screen, so its counters can replay. */
export const SlideActive = createContext(false);

/** Entrance order: elements with data-a rise in, each step 90ms after the last. */
const d = (n: number) => ({ "--d": n }) as CSSProperties;

/** Counts up from zero each time its slide opens; static for reduced motion. */
function CountUp({ to }: { to: number }) {
  const active = useContext(SlideActive);
  const [value, setValue] = useState<number | null>(null);

  useEffect(() => {
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 1100);
      setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [active, to]);

  return <>{active && value !== null ? value : to}</>;
}

/** The call recording's waveform on the call page mock-up. */
function Wave() {
  return (
    <span className="wave" aria-hidden="true">
      {Array.from({ length: 34 }, (_, k) => (
        <i key={k} style={{ height: 6 + Math.round(Math.abs(Math.sin(k * 1.7) * 18 + Math.cos(k * 0.6) * 4)) }} />
      ))}
    </span>
  );
}

/*
 * The pitch for hackathon track 1 (CJM1, Ivan the IT company owner). Each
 * stage slide tags features as "в проде", "в работе" or "предложение" to match
 * the telephony plan; every mock-up is marked "макет".
 */
export const SLIDES: Slide[] = [
  {
    time: "0:00–0:10",
    note: "Привет! Мы команда WikiAI. WikiAI Телефония: ИИ-ассистент, который берёт входящие звонки и отвечает по знаниям вашей компании. И это уже работает в проде.",
    body: (
      <>
        <div className="hero">
          <div>
            <span className="chip" data-a="" style={d(0)}><span className="dot live live-dot"></span>Трек 1 · ИИ-агент для входящих звонков</span>
            <h1 data-a="" style={d(1)}>WikiAI <span>Телефония</span></h1>
            <p className="lede" data-a="" style={d(2)}>ИИ-ассистент берёт входящие звонки и отвечает по знаниям вашей компании. Уже в проде.</p>
            <div className="hero-meta" data-a="" style={d(3)}>
              <span className="chip">SIP-транк от вашей АТС</span>
              <span className="chip">Bitrix24 · amoCRM</span>
              <span className="chip">Всё on-prem</span>
            </div>
          </div>
          <div data-a="" style={d(2)}>
            <div className="flow">
              <div className="caller" aria-label="Входящий звонок"><Phone /></div>
              <div className="pipe">
                <div className="panel pipe-step"><span className="ico"><Mic /></span><div><b>Речь → текст</b><small>распознавание на лету</small></div><i className="beam" style={d(0)}></i></div>
                <div className="panel pipe-step core"><span className="ico"><Search /></span><div><b>Поиск WikiAI</b><small>документы и CRM компании</small></div><i className="beam" style={d(1)}></i></div>
                <div className="panel pipe-step"><span className="ico"><Sparkles /></span><div><b>LLM-агент</b><small>отвечает, записывает, переводит</small></div><i className="beam" style={d(2)}></i></div>
                <div className="panel pipe-step"><span className="ico"><Volume2 /></span><div><b>Голос</b><small>ответ звонящему</small></div><i className="beam" style={d(3)}></i></div>
              </div>
            </div>
            <div className="outs">
              <span className="chip"><span className="dot"></span>Резюме звонка</span>
              <span className="chip"><span className="dot"></span>Лид в Bitrix24</span>
              <span className="chip"><span className="dot live"></span>Нужен оператор</span>
            </div>
          </div>
        </div>
      </>
    ),
  },
  {
    time: "0:10–0:30",
    note: "Иван, 42 года, владелец IT-компании. Весь день совещания и разъезды. Незнакомые номера он не берёт, но каждый раз думает: а вдруг это был клиент? Ему нужны три вещи: не пропускать важное, не тратить время на разбор звонков и звучать профессионально с каждым.",
    body: (
      <>
        <span className="eyebrow" data-a="" style={d(0)}><b>{"//"}</b> Персонаж</span>
        <h2 className="title" data-a="" style={d(1)}>«Может, это был клиент?»</h2>
        <div className="two">
          <div className="panel persona" data-a="" style={d(2)}>
            <div className="avatar">ИП</div>
            <div><h3>Иван Петров, 42</h3><p className="muted">Владелец небольшой IT-компании. Весь день совещания и разъезды</p></div>
            <div className="missed">
              <div><span>+375 29 •••-••-17</span><span className="mono">пропущен · 10:42</span></div>
              <div><span>+375 33 •••-••-08</span><span className="mono">пропущен · 12:15</span></div>
              <div><span>+375 44 •••-••-91</span><span className="mono">пропущен · 15:03</span></div>
            </div>
          </div>
          <div className="goals">
            <span className="lbl" data-a="" style={d(2)}>Цели трека</span>
            <div className="goal" data-a="" style={d(3)}><span className="ico"><Bell /></span><div><h3>Не пропускать важные обращения</h3><p>Клиенты и партнёры звонят с незнакомых номеров</p></div></div>
            <div className="goal" data-a="" style={d(4)}><span className="ico"><Clock /></span><div><h3>Сэкономить время на разбор звонков</h3><p>Вместо часа перезвонов вслепую вечером</p></div></div>
            <div className="goal" data-a="" style={d(5)}><span className="ico"><MessageCircle /></span><div><h3>Профессионально с каждым</h3><p>А не автоответчик и «я перезвоню»</p></div></div>
          </div>
        </div>
      </>
    ),
  },
  {
    time: "0:30–0:45",
    note: "Мы прошли весь путь Ивана по CJM. На каждом этапе своя боль: нет времени на внедрение, страх сложной настройки, недоверие к ИИ, страх упустить важное. Зелёным дальше отмечено то, что уже работает в проде.",
    body: (
      <>
        <span className="eyebrow" data-a="" style={d(0)}><b>{"//"}</b> CJM · путь Ивана</span>
        <h2 className="title" data-a="" style={d(1)}>Боль на каждом этапе — ответ WikiAI</h2>
        <div className="cjm">
          <div className="rail"><i className="draw"></i></div>
          <div></div>
          <div className="stage-h" data-a="" style={d(2)}><span className="n">01</span><b>Осознание</b></div>
          <div className="stage-h" data-a="" style={d(3)}><span className="n">02</span><b>Поиск</b></div>
          <div className="stage-h" data-a="" style={d(4)}><span className="n">03</span><b>Подключение</b></div>
          <div className="stage-h" data-a="" style={d(5)}><span className="n">04</span><b>Первый звонок</b></div>
          <div className="stage-h" data-a="" style={d(6)}><span className="n">05</span><b>Каждый день</b></div>
          <div className="stage-h" data-a="" style={d(7)}><span className="n">06</span><b>Результат</b></div>
  
          <div className="rowlbl" data-a="" style={d(3)}>Боль</div>
          <div className="cell pain" data-a="" style={d(3)}>Нет времени на новые сервисы</div>
          <div className="cell pain" data-a="" style={d(4)}>Непонятно, есть ли польза</div>
          <div className="cell pain" data-a="" style={d(5)}>Страх сложной настройки</div>
          <div className="cell pain" data-a="" style={d(6)}>Понял ли ИИ суть?</div>
          <div className="cell pain" data-a="" style={d(7)}>Вдруг ИИ упустит важное</div>
          <div className="cell pain" data-a="" style={d(8)}>Хочется большего</div>
  
          <div className="rowlbl" data-a="" style={d(5)}>WikiAI</div>
          <div className="cell ans" data-a="" style={d(5)}>Кейсы: 2 пилота WikiAI</div>
          <div className="cell ans" data-a="" style={d(6)}>Тест-чат с ассистентом до запуска</div>
          <div className="cell ans hl" data-a="" style={d(7)}>Шаблон + свои документы</div>
          <div className="cell ans hl" data-a="" style={d(8)}>Резюме, запись, расшифровка</div>
          <div className="cell ans hl" data-a="" style={d(9)}>Перевод на человека, CRM-карточка</div>
          <div className="cell ans hl" data-a="" style={d(10)}>Лиды в Bitrix24, аналитика</div>
        </div>
        <div className="legend" data-a="" style={d(10)}><span className="pill live">в проде</span><span className="pill soon">в работе</span><span className="pill mts">совместно с МТС</span><span>— статус каждой функции на следующих слайдах</span></div>
      </>
    ),
  },
  {
    time: "0:45–1:05",
    note: "Подключение. Номера и АТС остаются прежними: звонки приходят к ассистенту по SIP-транку. Иван выбирает документы компании, и ассистент сам ищет в них ответы во время разговора. Писать FAQ вручную не нужно. А шаблон «Приёмная компании» с проверкой готовности мы сейчас доделываем.",
    body: (
      <>
        <span className="bignum" aria-hidden="true">03</span>
        <span className="eyebrow" data-a="" style={d(0)}><b>{"//"}</b> 03 · Подключение</span>
        <h2 className="title" data-a="" style={d(1)}>Шаблон, свои документы — и в бой</h2>
        <div className="split">
          <div>
            <div className="quote" data-a="" style={d(2)}><q>Надеюсь, настройка не займёт много времени</q><p>Боль: сложная настройка, безопасность данных</p></div>
            <div className="answers">
              <span className="lbl" data-a="" style={d(3)}>Ответ WikiAI Телефонии</span>
              <div className="ans-row" data-a="" style={d(4)}><span className="ico"><FileText /></span><div><h3>Выберите документы <span className="pill live">в проде</span></h3><p>Ассистент сам ищет по ним ответы во время звонка</p></div></div>
              <div className="ans-row" data-a="" style={d(5)}><span className="ico"><Phone /></span><div><h3>Номера и АТС прежние <span className="pill live">в проде</span></h3><p>Звонки приходят по SIP-транку</p></div></div>
              <div className="ans-row" data-a="" style={d(6)}><span className="ico"><Layers /></span><div><h3>Шаблон «Приёмная» <span className="pill soon">в работе</span></h3><p>Мастер и проверка готовности за минуты</p></div></div>
            </div>
          </div>
          <div className="panel mock" data-a="" style={d(4)}>
            <span className="mock-tag">макет</span>
            <h4>Ассистент «Приёмная»</h4>
            <div className="tabs"><span>Основное</span><span>Сценарий</span><span className="on">Знания</span><span>Проверка</span></div>
            <div className="src">
              <div className="g"><span>Загруженные файлы</span><span>3 / 4</span></div>
              <div className="chk"><i><Check strokeWidth={3} /></i>О компании.md</div>
              <div className="chk"><i><Check strokeWidth={3} /></i>Порядок работы с заказами клиентов.md</div>
              <div className="chk"><i><Check strokeWidth={3} /></i>Гарантии, возвраты и претензии.md</div>
              <div className="chk off"><i></i>Реквизиты компании и доверенности.md</div>
            </div>
            <div className="src">
              <div className="g"><span>Bitrix24 · portal</span><span>все записи</span></div>
              <div className="chk"><i><Check strokeWidth={3} /></i>Контакты, Компании, Сделки</div>
            </div>
            <div className="readiness" title="Компания → Шаблон → Знания → Проверка → Номер"><span></span><span></span><span></span><span className="off"></span><span className="off"></span></div>
          </div>
        </div>
      </>
    ),
  },
  {
    time: "1:05–1:25",
    note: "Первый звонок. У каждого звонка есть страница: резюме, запись, расшифровка и ссылки в CRM. Ассистент не выдумывает: если ответа нет в документах, он говорит «уточню» и записывает вопрос. Следующий шаг: сводка в Telegram после каждого звонка.",
    body: (
      <>
        <span className="bignum" aria-hidden="true">04</span>
        <span className="eyebrow" data-a="" style={d(0)}><b>{"//"}</b> 04 · Первый звонок</span>
        <h2 className="title" data-a="" style={d(1)}>Видно, о чём был звонок</h2>
        <div className="split">
          <div>
            <div className="quote" data-a="" style={d(2)}><q>О, сработало! И понятно, о чём был звонок</q><p>Боль: сомнения в точности ИИ</p></div>
            <div className="answers">
              <span className="lbl" data-a="" style={d(3)}>Ответ WikiAI Телефонии</span>
              <div className="ans-row" data-a="" style={d(4)}><span className="ico"><FileText /></span><div><h3>Страница звонка <span className="pill live">в проде</span></h3><p>Резюме, запись, расшифровка, ссылки в CRM</p></div></div>
              <div className="ans-row" data-a="" style={d(5)}><span className="ico"><ShieldCheck /></span><div><h3>Не выдумывает <span className="pill live">в проде</span></h3><p>Нет в документах — «уточню» и записывает вопрос</p></div></div>
              <div className="ans-row" data-a="" style={d(6)}><span className="ico"><Send /></span><div><h3>Сводка в приложении МТС <span className="pill mts">Вместе с МТС</span></h3><p>После каждого звонка, с кнопками</p></div></div>
              <div className="ans-row" data-a="" style={d(7)}><span className="ico"><MessageCircle /></span><div><h3>Уведомления через СМС <span className="pill mts">Вместе с МТС</span></h3><p>После важных звонков, с ссылкой в приложение</p></div></div>
            </div>
          </div>
          <div className="panel mock" data-a="" style={d(4)}>
            <span className="mock-tag">макет</span>
            <h4><Send size={16} style={{ color: "var(--primary)" }} /> WikiAI Телефония · бот</h4>
            <div className="tg">
              <div className="hd"><span className="dot live"></span>Важный звонок · новый клиент</div>
              <div className="muted">Сергей, «ТехноСтрой» · +375 29 •••-45-67 · 1 мин 48 с · ассистент</div>
              <div>Интересуется внедрением Битрикс24 для отдела из 10 человек. Просит перезвонить сегодня после 15:00.</div>
              <div style={{ color: "var(--primary)" }}>Лид создан в Bitrix24 ↗</div>
              <div className="btns"><span>Открыть</span><span>Перезвонил</span><span>Спам</span></div>
            </div>
            <div className="callpage">
              <div className="row"><span>Запись</span><Wave /></div>
              <div className="row"><span>Вопрос без ответа</span><span className="muted">«Есть ли скидка для НКО?» → уточню</span></div>
            </div>
          </div>
        </div>
      </>
    ),
  },
  {
    time: "1:25–1:50",
    note: "Каждый день. Ассистент узнаёт клиента из Bitrix24 ещё до первого слова: имя, компания, открытые сделки. Если звонящий просит соединить с менеджером, в WikiAI загорается красная карточка «Нужен оператор», и любой сотрудник отвечает прямо из браузера. Для Ивана на совещании делаем режим «Не беспокоить»: важное сразу, остальное сводкой.",
    body: (
      <>
        <span className="bignum" aria-hidden="true">05</span>
        <span className="eyebrow" data-a="" style={d(0)}><b>{"//"}</b> 05 · Каждый день</span>
        <h2 className="title" data-a="" style={d(1)}>Важное не теряется</h2>
        <div className="split">
          <div>
            <div className="quote" data-a="" style={d(2)}><q>Наконец-то я не привязан к телефону</q><p>Боль: страх, что ИИ упустит важное</p></div>
            <div className="answers">
              <span className="lbl" data-a="" style={d(3)}>Ответ WikiAI Телефонии</span>
              <div className="ans-row" data-a="" style={d(4)}><span className="ico"><User /></span><div><h3>Узнаёт клиента из Bitrix24 <span className="pill live">в проде</span></h3><p>Имя, компания, сделки — до первого слова</p></div></div>
              <div className="ans-row" data-a="" style={d(5)}><span className="ico"><Headset /></span><div><h3>«Соедините с менеджером» <span className="pill live">в проде</span></h3><p>Карточка «Нужен оператор», ответ из браузера</p></div></div>
              <div className="ans-row" data-a="" style={d(6)}><span className="ico"><Moon /></span><div><h3>Режим «Не беспокоить» <span className="pill soon">в работе</span></h3><p>Важное — сразу, остальное — сводкой</p></div></div>
            </div>
          </div>
          <div className="panel mock" data-a="" style={d(4)}>
            <span className="mock-tag">макет</span>
            <h4>Звонки · линия «Приёмная»</h4>
            <div className="alert"><span className="dot live live-dot"></span><div><b>Нужен оператор</b><span className="muted" style={{ fontSize: "13px" }}>Просит соединить с менеджером</span></div><span className="go">Ответить</span></div>
            <div className="crm">
              <span className="k">Звонящий · Bitrix24</span>
              <div><b>Анна Ковалёва</b>, «СтройИнвест»</div>
              <div className="muted" style={{ fontSize: "13px" }}>Сделка «Внедрение CRM» · этап: КП отправлено</div>
            </div>
            <div className="transcript">
              <div className="a">Здравствуйте, Анна! Чем могу помочь?</div>
              <div className="c">Хочу обсудить КП с менеджером</div>
              <div className="a">Соединяю с ответственным менеджером</div>
            </div>
          </div>
        </div>
      </>
    ),
  },
  {
    time: "1:50–2:05",
    note: "Результат. Новый клиент сам попадает в Bitrix24 как контакт и лид, а знакомый дополняется. Дальше: аналитика с сэкономленным временем и вопросы без ответа, которые в один клик становятся FAQ.",
    body: (
      <>
        <span className="bignum" aria-hidden="true">06</span>
        <span className="eyebrow" data-a="" style={d(0)}><b>{"//"}</b> 06 · Результат</span>
        <h2 className="title" data-a="" style={d(1)}>Иван видит эффект</h2>
        <div className="split">
          <div>
            <div className="quote" data-a="" style={d(2)}><q>Это реально работает. Может, подключить ещё что-то?</q><p>Боль: нужно масштабирование</p></div>
            <div className="answers">
              <span className="lbl" data-a="" style={d(3)}>Ответ WikiAI Телефонии</span>
              <div className="ans-row" data-a="" style={d(4)}><span className="ico"><UserPlus /></span><div><h3>Лиды в Bitrix24 сами <span className="pill live">в проде</span></h3><p>Новый контакт или дополненная карточка</p></div></div>
              <div className="ans-row" data-a="" style={d(5)}><span className="ico"><ChartColumn /></span><div><h3>Аналитика <span className="pill soon">в работе</span></h3><p>Сэкономленное время, важные звонки</p></div></div>
              <div className="ans-row" data-a="" style={d(6)}><span className="ico"><PenLine /></span><div><h3>Вопросы без ответа <span className="pill soon">в работе</span></h3><p>В FAQ в один клик — ассистент учится</p></div></div>
            </div>
          </div>
          <div className="panel mock" data-a="" style={d(4)}>
            <span className="mock-tag">макет · данные-пример</span>
            <h4>Аналитика · неделя</h4>
            <div className="tiles">
              <div className="tile"><div className="v"><CountUp to={142} /></div><div className="k">звонков</div></div>
              <div className="tile"><div className="v"><CountUp to={96} /></div><div className="k">закрыл ассистент</div></div>
              <div className="tile"><div className="v"><span><CountUp to={7} /></span> ч</div><div className="k">сэкономлено</div></div>
            </div>
            <div className="qlist">
              <span className="muted mono" style={{ fontSize: "12px" }}>Частые вопросы</span>
              <div className="qrow"><span>Сроки внедрения</span><span className="bar"><i style={{ width: "92%" }}></i></span><span className="mono">31</span></div>
              <div className="qrow"><span>Стоимость лицензий</span><span className="bar"><i style={{ width: "70%" }}></i></span><span className="mono">24</span></div>
              <div className="qrow"><span>Гарантия и возврат</span><span className="bar"><i style={{ width: "44%" }}></i></span><span className="mono">15</span></div>
              <div className="qrow"><span>Скидка для НКО <span className="pill soon" style={{ marginLeft: "4px" }}>без ответа</span></span><span className="bar"><i style={{ width: "18%" }}></i></span><span className="mono">6</span></div>
            </div>
          </div>
        </div>
      </>
    ),
  },
  {
    time: "2:05–2:20",
    note: "Под капотом WikiAI, наша RAG-платформа знаний. Год назад она прошла два пилота, а сегодня работает поиском внутри телефонии. Распознавание речи, языковая модель и синтез работают локально, без внешних API.",
    body: (
      <>
        <span className="eyebrow" data-a="" style={d(0)}><b>{"//"}</b> Под капотом</span>
        <h2 className="title" data-a="" style={d(1)}>Ядро — WikiAI, проверенный RAG</h2>
        <div className="stats">
          <div className="stat" data-a="" style={d(2)}><div className="v">2 пилота</div><p>WikiAI прошла два пилота год назад</p></div>
          <div className="stat" data-a="" style={d(3)}><div className="v">В проде</div><p>Сегодня WikiAI — поиск внутри телефонии</p></div>
          <div className="stat" data-a="" style={d(4)}><div className="v">100%</div><p>Локальные модели, без внешних API</p></div>
        </div>
        <div className="chain" data-a="" style={d(5)}>
          <div className="track"><i></i></div>
          <div className="panel node"><span className="ico"><Mic /></span><b>Речь → текст</b><small>T-one, потоково</small></div>
          <div className="panel node core"><span className="ico"><Search /></span><b>Поиск WikiAI</b><small>только выбранные документы</small></div>
          <div className="panel node"><span className="ico"><Sparkles /></span><b>LLM-агент</b><small>локальная модель, инструменты</small></div>
          <div className="panel node"><span className="ico"><Volume2 /></span><b>Синтез речи</b><small>Silero, 8 кГц</small></div>
        </div>
        <div className="latency" data-a="" style={d(6)}><span className="pill soon">цель</span>Голос → голос: p50 ≤ 2 с, p95 ≤ 3 с при 5 одновременных звонках</div>
      </>
    ),
  },
  {
    time: "2:20–2:35",
    note: "Поэтому продукт ложится на инфраструктуру МТС. Голос подключается SIP-транком к платформе оператора. Все модели работают on-prem в ЦОД, персональные данные не уходят наружу. Целевая задержка ответа около двух секунд. Оплату с баланса абонента и сводки по SMS и в приложении МТС делаем совместно с МТС: это следующий шаг интеграции после запуска.",
    body: (
      <>
        <span className="eyebrow" data-a="" style={d(0)}><b>{"//"}</b> Запуск у оператора</span>
        <h2 className="title" data-a="" style={d(1)}>Встраивается в инфраструктуру МТС</h2>
        <div className="ops">
          <div className="panel op" data-a="" style={d(2)}><div className="top"><span className="ico"><Phone /></span><span className="pill live">в проде</span></div><h3>Голосовой стек</h3><p>SIP-транк от АТС, номера прежние</p></div>
          <div className="panel op" data-a="" style={d(3)}><div className="top"><span className="ico"><Wallet /></span><span className="pill mts">совместно с МТС</span></div><h3>Биллинг и CRM/BSS</h3><p>Подписка с баланса абонента</p></div>
          <div className="panel op" data-a="" style={d(4)}><div className="top"><span className="ico"><Smartphone /></span><span className="pill mts">совместно с МТС</span></div><h3>App-экосистема</h3><p>Сводки по SMS и в приложении МТС</p></div>
          <div className="panel op" data-a="" style={d(5)}><div className="top"><span className="ico"><Server /></span><span className="pill live">в проде</span></div><h3>ИИ-мощности</h3><p>Речь, LLM и поиск — on-prem, в ЦОД</p></div>
          <div className="panel op" data-a="" style={d(6)}><div className="top"><span className="ico"><Signal /></span><span className="pill soon">в работе</span></div><h3>Качество связи</h3><p>G.711, ответ голосом за ~2 с</p></div>
        </div>
      </>
    ),
  },
  {
    time: "2:35–2:48",
    note: "Юнитка. Модели работают на H100 в МТС Cloud: одна карта держит 50 разговоров одновременно, это около 320 тысяч минут в месяц. Звонок в две с половиной минуты стоит нам 9 копеек. МТС мы отдаём минуту за 8 копеек. Абонент на «Бизнесе» платит 129 рублей в месяц: 97 остаются МТС, ещё 13 возвращаются в МТС Cloud за видеокарты — итого 85% выручки остаётся в группе МТС. Внутреннее: валовая маржа WikiAI 55%. Для клиента это в 21 раз дешевле секретаря, и ассистент работает круглосуточно. Для оффера: карта H100 80 ГБ на рынке ≈ $26–31k, мировая медиана аренды ≈ $3,1/ч, в РФ ≈ 350 ₽/ч — наша оценка 345 ₽/ч с запасом. Если МТС Cloud даст цену ниже, наша маржа растит.",
    body: (
      <>
        <span className="eyebrow" data-a="" style={d(0)}><b>{"//"}</b> Юнит-экономика</span>
        <h2 className="title" data-a="" style={d(1)}>Звонок обходится в 9 копеек</h2>
        <div className="ue">
          <div className="panel ue-card" data-a="" style={d(2)}>
            <span className="k">Себестоимость звонка · 2,5 мин</span>
            <div className="ue-big">0,09<small>BYN</small></div>
            <div className="stack" role="img" aria-label="H100 0,084 BYN, серверы 0,005 BYN, запись 0,002 BYN">
              <i style={{ flex: 84 }}></i>
              <i style={{ flex: 5 }}></i>
              <i style={{ flex: 2 }}></i>
            </div>
            <div className="parts">
              <span><i></i>GPU H100 <b>0,084</b></span>
              <span><i></i>Серверы <b>0,005</b></span>
              <span><i></i>Запись 90 дней <b>0,002</b></span>
            </div>
            <div className="hw">
              <span className="ico"><Cpu /></span>
              <div><b>1 × H100 в МТС Cloud</b><small>50 звонков одновременно · ≈ 320 тыс. минут в месяц</small></div>
            </div>
          </div>
          <div className="panel ue-card" data-a="" style={d(3)}>
            <span className="k">Абонент на тарифе «Бизнес» · в месяц</span>
            <div className="wf">
              <div className="r"><span>Платит абонент</span><span className="bar"><i style={{ width: "100%" }}></i></span><b>129 BYN</b></div>
              <div className="r"><span>Остаётся МТС</span><span className="bar"><i style={{ width: "75%" }}></i></span><b>97</b></div>
              <div className="r wikiai"><span>WikiAI · 400 мин × 0,08</span><span className="bar"><i style={{ width: "25%" }}></i></span><b>32</b></div>
              <div className="r sub"><span>из них H100 → МТС Cloud</span><span className="bar"><i style={{ width: "10%" }}></i></span><b>13</b></div>
            </div>
            <div className="ue-total"><b>85%</b>выручки остаётся в группе МТС</div>
          </div>
        </div>
        <div className="tariffs" data-a="" style={d(4)}>
          <div className="tariff"><b>Старт</b><span className="p">49 BYN</span><small>200 мин · 1 линия</small></div>
          <div className="tariff on"><b>Бизнес</b><span className="p">129 BYN</span><small>800 мин · 3 линии · CRM</small></div>
          <div className="tariff"><b>Про</b><span className="p">349 BYN</span><small>3 000 мин · 10 линий · операторы</small></div>
          <div className="tariff vs"><b>Секретарь</b><span className="p">≈ 2 700 BYN</span><small>8 ч × 5 дней, без CRM</small></div>
        </div>
        <p className="fine" data-a="" style={d(5)}>Оценка: H100 по рынку РФ ≈ 350 ₽/ч, карта 80 ГБ ≈ $26–31k · 50 звонков на карту, нагрузочный тест в работе · использовано 50% пакета · сверх пакета 0,20 BYN/мин · цены без НДС</p>
      </>
    ),
  },
  {
    time: "2:48–2:56",
    note: "Право. Слева — что закрыли сами: лицензию синтеза речи (Silero выходил под CC BY-NC, для платного продукта не подходит — уходим на MIT-модель или другой TTS, T-one и llama.cpp чисты), канал сводок (Telegram отменён как основной — сводки в приложении МТС, по SMS и в вебе), оператор данных — компания-абонент, мы с МТС уполномоченные лица, предупреждение о записи и ИИ в начале звонка и хранение 90 дней, голос не биометрия, GPU берём в аренду — закупка не нужна. Справа — что решаем вместе с МТС: договор поручения по 99-З, аттестацию по приказу 66, тайну связи в оферте, страну облачных CRM по перечню НЦЗПД и биллинг с баланса абонента. Не юрзаключение, финальную схему проверит юрист. Если МТС не спрашивает — слайд пропускаем.",
    body: (
      <>
        <span className="eyebrow" data-a="" style={d(0)}><b>{"//"}</b> Право · 99-З и ОАЦ</span>
        <h2 className="title" data-a="" style={d(1)}>Право: что закрыто, что — с МТС</h2>
        <div className="legal">
          <div className="panel legal-col" data-a="" style={d(2)}>
            <h3><span className="pill live">решили</span>Снимаем сами</h3>
            <div className="legal-item"><h4>Синтез речи <span className="pill live">лицензия</span></h4><p>Silero v5 — CC BY-NC, для платного продукта не подходит. Уходим на MIT-модель или другой TTS. T-one — Apache 2.0.</p></div>
            <div className="legal-item"><h4>Канал сводок</h4><p>Telegram отменён как основной канал. Сводки — в приложении МТС, по SMS и в вебе.</p></div>
            <div className="legal-item"><h4>Оператор данных</h4><p>Оператор — компания-абонент. МТС и WikiAI — уполномоченные лица по договору поручения (ст. 7).</p></div>
            <div className="legal-item"><h4>Запись и хранение</h4><p>В начале звонка предупреждаем о записи и что отвечает ИИ. Храним записи 90 дней.</p></div>
            <div className="legal-item"><h4>Голос ≠ биометрия</h4><p>Пока не узнаём человека по голосу, спецрегулирование не включается.</p></div>
            <div className="legal-item"><h4>GPU без закупки</h4><p>Экспортные ограничения снимает аренда H100 у МТС Cloud.</p></div>
          </div>
          <div className="panel legal-col" data-a="" style={d(3)}>
            <h3><span className="pill mts">совместно с МТС</span>Решаем с МТС</h3>
            <div className="legal-item"><h4>Договор поручения <span className="pill mts">ст. 7 99-З</span></h4><p>Цели обработки, перечень действий и меры защиты — с юристами МТС.</p></div>
            <div className="legal-item"><h4>Аттестация ОАЦ <span className="pill mts">приказ № 66</span></h4><p>Класс ИС подтвердит аттестующая организация. Инфраструктура МТС Cloud требования уже подтвердила — приложение аттестуем отдельно.</p></div>
            <div className="legal-item"><h4>Тайна связи</h4><p>Обработку по поручению вызываемой стороны прописываем в оферте МТС.</p></div>
            <div className="legal-item"><h4>Облачные CRM</h4><p>Bitrix24 и amoCRM: страна провайдера должна быть в перечне НЦЗПД.</p></div>
            <div className="legal-item"><h4>Биллинг с баланса абонента</h4><p>Схема списаний и сверка — совместно с МТС.</p></div>
          </div>
        </div>
        <p className="fine" data-a="" style={d(5)}>Не юридическое заключение — финальную схему проверит юрист · подробности и источники — /presentation/legal · октябрь 2026</p>
      </>
    ),
  },
  {
    time: "2:56–3:00",
    note: "Итог: Иван на совещании, а ни один важный звонок не потерян. Спасибо! Готовы показать живой звонок.",
    className: "close",
    body: (
      <>
        <span className="eyebrow" data-a="" style={d(0)}><b>{"//"}</b> WikiAI Телефония</span>
        <h2 data-a="" style={d(1)}>Иван на совещании.<br /><span>Ни один важный звонок не потерян.</span></h2>
        <div className="checks" data-a="" style={d(2)}>
          <span className="chip"><Check strokeWidth={3} />Важное не пропущено</span>
          <span className="chip"><Check strokeWidth={3} />Разбор по готовому резюме</span>
          <span className="chip"><Check strokeWidth={3} />Профессионально с каждым</span>
        </div>
        <div className="cta" data-a="" style={d(3)}><span className="btn"><Phone size={18} />Покажем живой звонок</span><span className="hint">Спасибо!</span></div>
      </>
    ),
  },
];
