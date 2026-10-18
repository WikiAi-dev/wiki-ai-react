/*
 * The 3-minute script: one entry per scene, in order. Durations add up to
 * 180 seconds. Pure data, so the web deck can read it on the server; the
 * scene components live in scenes/index.ts.
 */

export type Cue = {
  id: string;
  /** Part of the pitch, shown in the presenter bar. */
  section: string;
  /** Where the scene sits in the script. */
  time: string;
  seconds: number;
  /** "main": slow down and land the point; "quick": one line and move on. */
  pace: "main" | "quick";
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
  { id: "title", section: "Начало", time: "0:00–0:10", seconds: 10, pace: "quick", built: 83,
    note: "Привет! Мы WikiAI. Это RAG-платформа: она подключается к Bitrix24, Jira и документам компании и отвечает клиенту прямо в звонке. И это уже работает в проде." },
  { id: "problem", section: "Проблема", time: "0:10–0:24", seconds: 14, pace: "main", built: 84,
    note: "Проблема. Клиент звонит с простым вопросом, а оператор ищет ответ в пяти системах. Новичок не знает продукт, менеджер на холодном звонке теряется на первом сложном вопросе. Клиент ждёт почти три минуты и кладёт трубку." },
  { id: "evidence", section: "Подтверждение проблемы", time: "0:24–0:34", seconds: 10, pace: "quick", built: 44,
    note: "Это не единичный случай. Четверть времени уходит на поиск ответов, две трети звонящих не ждут дольше двух минут, а продавцы 70% времени заняты не продажами." },
  { id: "solution", section: "Решение", time: "0:34–0:52", seconds: 18, pace: "main", built: 89,
    note: "Решение: одна база знаний для всех. WikiAI сама забирает данные из Bitrix24, Jira и документов, хранит ссылку на источник и отвечает там, где идёт разговор: голосом на линии, подсказкой оператору, в чате сотрудника. Работает в облаке или в закрытом контуре." },
  { id: "proof", section: "Подтверждение решения", time: "0:52–1:04", seconds: 12, pace: "main", built: 42,
    note: "Это уже работает. С 13 октября ассистент отвечает на реальные звонки, подсказка оператору приходит за одну-две секунды, лиды сами попадают в Bitrix24. Два клиента подписали договоры на внедрение." },
  { id: "awards", section: "Подтверждение решения", time: "1:04–1:09", seconds: 5, pace: "quick", built: 28,
    note: "Проект оценили эксперты: Белагропромбанк, «Таланты XXI века», БГУИР и НАН Беларуси." },
  { id: "persona", section: "Целевой пользователь", time: "1:09–1:19", seconds: 10, pace: "main", built: 45,
    note: "Наш клиент: Иван, владелец IT-интегратора с колл-центром на 15 операторов. Клиенты ждут, пока операторы ищут ответ, новички месяц учат продукт, а холодные звонки срываются на возражениях." },
  { id: "cjm", section: "CJM", time: "1:19–1:36", seconds: 17, pace: "main", built: 118,
    note: "Путь Ивана. На каждом шаге своя боль, и на каждую у нас есть ответ: демо-звонок на живой номер, понятные тарифы, подключение за вечер, страница каждого звонка, подсказки оператору. Следующий шаг: подсказки в холодных звонках." },
  { id: "inbound", section: "Телефония", time: "1:36–1:50", seconds: 14, pace: "main", built: 88,
    note: "Телефония. Ассистент берёт трубку, узнаёт клиента из CRM до первого слова и отвечает по документам компании. Если ответа нет, он не выдумывает, а переводит на человека. Сейчас ускоряем ответ голосом до полутора секунд." },
  { id: "operator", section: "Телефония", time: "1:50–2:04", seconds: 14, pace: "main", built: 82,
    note: "Когда разговор ведёт человек, WikiAI подсказывает. Оператор получает бриф при переводе и ответ из базы за секунду-две, пока клиент ещё говорит. В холодных звонках менеджер получит ответы на возражения: это в работе." },
  { id: "aftercall", section: "Телефония", time: "2:04–2:12", seconds: 8, pace: "quick", built: 68,
    note: "После звонка CRM уже заполнена: контакт, потребность, следующий шаг. Вопросы без ответа в один клик пополняют базу." },
  { id: "economics", section: "Юнит-экономика", time: "2:12–2:30", seconds: 18, pace: "main", built: 106,
    note: "Экономика. Минута ассистента стоит нам 4 копейки, звонок около 10, и две трети этого приходится на синтез речи. Клиент на «Бизнесе» платит 449 рублей, себестоимость 93, валовая маржа 80%. LTV к CAC около 13, привлечение окупается за 4 месяца. Расчёт в Excel." },
  { id: "pricing", section: "Тарифы", time: "2:30–2:42", seconds: 12, pace: "main", built: 74,
    note: "Тарифы считали от себестоимости и цен конкурентов. «Бизнес» вдвое дешевле базы знаний и голосового агента по отдельности. Для банков и госсектора: закрытый контур." },
  { id: "market", section: "Рынок", time: "2:42–2:52", seconds: 10, pace: "quick", built: 55,
    note: "Рынок: 20 миллиардов долларов, около 13 миллионов в Беларуси. Конкуренты закрывают либо базу знаний, либо голос, а мы соединяем их." },
  { id: "close", section: "Финал", time: "2:52–3:00", seconds: 8, pace: "quick", built: 38,
    note: "Клиент не ждёт, оператор не ищет. Мы открыты к предложениям. Спасибо!" },
];

/** Cross-fade between scenes in the film, in frames at 30 fps. */
export const FADE = 12;
