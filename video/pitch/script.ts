/*
 * The 3-minute script: one entry per scene, in order. Durations add up to
 * 180 seconds. The appendix follows it for questions after the pitch and is
 * not part of the film. Pure data, so the web deck can read it on the server;
 * the scene components live in scenes/index.ts.
 */

export type Cue = {
  id: string;
  /** Part of the pitch, shown in the presenter bar. */
  section: string;
  /** Where the scene sits in the script. */
  time: string;
  seconds: number;
  /** "main": slow down and land the point; "quick": one line and move on; "qa": appendix, opened on a question. */
  pace: "main" | "quick" | "qa";
  /**
   * Frame by which the scene's build is complete. Stepping back in the live
   * deck starts the scene here, already built; a clip for Keynote or
   * PowerPoint can end here. Live details keep moving after it.
   */
  built: number;
  /** What the speaker says; shown in the notes panel. */
  note: string;
};

export const SCRIPT: Cue[] = [
  { id: "title", section: "Начало", time: "0:00–0:08", seconds: 8, pace: "quick", built: 83,
    note: "Привет! Мы WikiAI: RAG-платформа, которая подключается к Bitrix24, Jira и документам и отвечает клиенту прямо в звонке. Уже в проде." },
  { id: "problem", section: "Проблема", time: "0:08–0:20", seconds: 12, pace: "main", built: 84,
    note: "Клиент звонит с простым вопросом, а оператор ищет ответ в пяти системах. Новичок не знает продукт, менеджер теряется на возражениях. Клиент ждёт три минуты и кладёт трубку." },
  { id: "evidence", section: "Подтверждение проблемы", time: "0:20–0:28", seconds: 8, pace: "quick", built: 44,
    note: "Это не единичный случай: четверть времени уходит на поиск ответов, а две трети звонящих не ждут дольше двух минут." },
  { id: "solution", section: "Решение", time: "0:28–0:43", seconds: 15, pace: "main", built: 89,
    note: "Решение: ядро WikiAI — поиск и коннекторы. Оно само забирает знания из Bitrix24, Jira и документов и отвечает со ссылкой на источник. Сверху модули: голосовой ассистент, подсказки оператору, API для агентов. Облако или закрытый контур." },
  { id: "proof", section: "Подтверждение решения", time: "0:43–0:53", seconds: 10, pace: "main", built: 42,
    note: "С 13 октября ассистент отвечает на реальные звонки, подсказка приходит за одну-две секунды, лиды сами попадают в Bitrix24. Два клиента подписали договоры." },
  { id: "awards", section: "Подтверждение решения", time: "0:53–0:57", seconds: 4, pace: "quick", built: 28,
    note: "Нас оценили Белагропромбанк, «Таланты XXI века», БГУИР и НАН." },
  { id: "persona", section: "Целевой пользователь", time: "0:57–1:06", seconds: 9, pace: "main", built: 45,
    note: "Наш клиент: Иван, IT-интегратор с колл-центром на 15 операторов. Клиенты ждут в очереди, новички месяц учат продукт, холодные звонки срываются." },
  { id: "cjm", section: "CJM", time: "1:06–1:18", seconds: 12, pace: "main", built: 118,
    note: "Путь Ивана: демо-звонок на живой номер, понятная цена, подключение за вечер, страница каждого звонка, подсказки оператору. Дальше — холодные звонки." },
  { id: "inbound", section: "Телефония", time: "1:18–1:28", seconds: 10, pace: "main", built: 88,
    note: "Ассистент берёт трубку, узнаёт клиента из CRM и отвечает по документам. Нет ответа в базе — не выдумывает, а переводит на человека." },
  { id: "operator", section: "Телефония", time: "1:28–1:38", seconds: 10, pace: "main", built: 82,
    note: "Если говорит человек, WikiAI подсказывает: бриф при переводе и ответ из базы за секунду-две, пока клиент ещё говорит." },
  { id: "aftercall", section: "Телефония", time: "1:38–1:42", seconds: 4, pace: "quick", built: 68,
    note: "После звонка CRM уже заполнена." },
  { id: "pricing", section: "Бизнес-модель", time: "1:42–1:56", seconds: 14, pace: "main", built: 54,
    note: "Бизнес-модель. Продаём ядро — поиск и коннекторы — от 290 рублей в месяц. Зарабатываем на модулях сверху: минута ассистента 20 копеек, подсказки 149 рублей на оператора. Внедрение и свои коннекторы — отдельно, с маржой 44–55%." },
  { id: "client", section: "Экономика клиента", time: "1:56–2:08", seconds: 12, pace: "main", built: 54,
    note: "Иван платит 8,9 тысячи в месяц. Ассистент закрывает 40% звонков, и освобождается время восьми операторов — 23 тысячи, в 2,6 раза больше счёта. Чистая выгода 14 тысяч в месяц, внедрение окупается за две недели." },
  { id: "unit", section: "Юнит-экономика", time: "2:08–2:22", seconds: 14, pace: "main", built: 60,
    note: "Колл-центр приносит полторы тысячи долларов в месяц при марже 73%. Привлечение стоит около четырёх тысяч и окупается меньше чем за 4 месяца. LTV к CAC больше 7, и это за три года, без роста чека." },
  { id: "market", section: "Рынок", time: "2:22–2:31", seconds: 9, pace: "quick", built: 55,
    note: "ИИ для контакт-центров — 2,4 миллиарда долларов и плюс 21% в год. Наш рынок в России, Беларуси и СНГ — 277 миллионов, к 2031 году берём меньше процента." },
  { id: "plan", section: "План", time: "2:31–2:43", seconds: 12, pace: "main", built: 54,
    note: "Я один, поэтому растём на выручке: Беларусь, с 2029-го Россия, с 2031-го Казахстан и Узбекистан. В плюсе с конца 2027-го, ARR 2,2 миллиона долларов к 2031 году, нанимаем по мере выручки." },
  { id: "round", section: "Раунд", time: "2:43–2:55", seconds: 12, pace: "main", built: 50,
    note: "Привлекаем 20 тысяч долларов за 8%. Деньги идут на продукт — коннекторы 1С и amoCRM, подсказки в продажах — и на новых клиентов: реклама, демо-линия, менеджер на полставки. С октября 2027-го в плюсе, к концу года 13 клиентов." },
  { id: "close", section: "Финал", time: "2:55–3:00", seconds: 5, pace: "quick", built: 38,
    note: "Клиент не ждёт, оператор не ищет. Спасибо!" },
];

/** Detail for questions after the pitch, in the order investors usually ask. */
export const APPENDIX: Cue[] = [
  { id: "cost", section: "Приложение: себестоимость", time: "вопросы", seconds: 20, pace: "qa", built: 54,
    note: "Минута ассистента стоит 4 копейки, две трети — синтез речи. Себестоимость каждого модуля и его маржа: от 61% у подсказок до 80–85% у ядра." },
  { id: "onboarding", section: "Приложение: внедрение", time: "вопросы", seconds: 20, pace: "qa", built: 46,
    note: "Внедрение колл-центра — 114 часов команды, 3,9 тысячи рублей себестоимости при цене 6,9. Свой коннектор — 72 часа, маржа 55%. Один специалист ведёт 1,2 внедрения в месяц." },
  { id: "pnl", section: "Приложение: план", time: "вопросы", seconds: 20, pace: "qa", built: 40,
    note: "План по годам в тысячах долларов: выручка, маржа, расходы, EBITDA, ARR, команда и деньги на счёте. Минус только в 2027-м, 8 тысяч, его закрывает раунд." },
  { id: "sensitivity", section: "Приложение: чувствительность", time: "вопросы", seconds: 20, pace: "qa", built: 44,
    note: "Если голос подорожает вчетверо, маржа колл-центра всё ещё 58%. Если отток вырастет вчетверо, LTV к CAC всё ещё 5. Первым проверяем CAC и отток." },
  { id: "rivals", section: "Приложение: конкуренты", time: "вопросы", seconds: 20, pace: "qa", built: 44,
    note: "Собрать то же из Vapi, Minerva и Genesys — в 1,5 раза дороже. Минута, поиск и интеграции дешевле рынка; подсказки дороже Genesys, но втрое дешевле Google." },
  { id: "onprem", section: "Приложение: закрытый контур", time: "вопросы", seconds: 20, pace: "qa", built: 40,
    note: "Сервер покупает клиент, от 7,5 тысячи долларов. Мы продаём лицензию от 2 900 рублей в месяц с маржой около 80% и внедрение." },
];

/** The whole deck: the pitch, then the appendix. */
export const DECK: Cue[] = [...SCRIPT, ...APPENDIX];

/** Cross-fade between scenes in the film, in frames at 30 fps. */
export const FADE = 12;
