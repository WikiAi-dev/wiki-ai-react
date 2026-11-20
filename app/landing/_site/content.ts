/*
 * Landing copy, Russian first. Positioning (owner, 2026-11-19): WikiAI keeps
 * company knowledge as vectors; the page sells speed and integrability.
 * Audience and pains: Docs/WikiAI_economics_KP_CJM.xlsx (ЦА, Реестр болей,
 * CJM sheets). Prices: the pitch deck (video/pitch/scenes/business.tsx).
 * Style (owner, 2026-11-20): afanasieff.by's palettes and type with the
 * WikiAI blue, but its own elements, taken from the afanasieff.by moodboard
 * (Nothin', Keita Yamada, Lusion, Olha Lazarieva, Obys, Resend, Wodniack,
 * Rauno, Lando Norris) and webdad.by.
 * Speed: the owner's measurement at a client (median 860 ms, p95 1.2 s at
 * 220 parallel sessions). Demo dialogues are examples and are labelled so.
 * Typography rule: no em or en dashes in visible text; ranges use a hyphen.
 */

export type Locale = "ru" | "en";

export type Source = { system: string; doc: string };
export type Segment = {
  id: string;
  tab: string;
  who: string;
  does: string[];
  role: string;
  question: string;
  answer: string;
  sources: Source[];
};

const ru = {
  meta: {
    title: "WikiAI | Ответ из всех систем компании за секунду",
    description:
      "WikiAI подключается к Битрикс24, amoCRM, 1С и документам и отвечает сотрудникам, клиентам и звонящим по вашим данным со ссылкой на источник. Голосовой ответ: медиана 860 мс.",
  },
  nav: {
    links: [
      { href: "#how", label: "Как это работает" },
      { href: "#integrations", label: "Интеграции" },
      { href: "#segments", label: "Для кого" },
      { href: "#pricing", label: "Тарифы" },
      { href: "#faq", label: "Вопросы" },
    ],
    signIn: "Войти",
    cta: "Обсудить пилот",
    menu: "Меню",
    close: "Закрыть меню",
    toLight: "Светлая тема",
    toDark: "Тёмная тема",
    language: "English",
    languageShort: "EN",
    home: "WikiAI, на главную",
  },
  hero: {
    title: "Ответ из всех систем компании за секунду",
    lead: "WikiAI подключается к Битрикс24, amoCRM и 1С, хранит знания в векторном виде и отвечает сотрудникам, клиентам и звонящим со ссылкой на источник.",
    secondary: "Как это работает",
    ring: "Как это работает · Как это работает · ",
    cornerTop: "Векторная база знаний для контакт-центров и МСП",
    cornerBottom: "Медиана ответа голосом 860 мс",
  },
  manifesto: {
    label: "Зачем",
    text: "Знания компании разбросаны по CRM, учёту, документам и головам сотрудников. WikiAI собирает их в одно место и отвечает за секунду.",
  },
  swap: {
    title: "Пять дел, которые с понедельника делает не человек",
    lead: "Не «оптимизация процессов», а конкретные минуты, которые сейчас уходят у конкретных людей.",
    before: "Было руками",
    after: "Что происходит вместо",
    note: "Никто не уходит. Уходит поиск, переспрашивание и ручной ввод.",
    rows: [
      { who: "Оператор-новичок", before: "Ищет ответ в пяти окнах, пока клиент слушает «минутку, подождите»", after: "Видит подсказку во время звонка", detail: "за 1-2 секунды, со ссылкой на регламент" },
      { who: "Руководитель КЦ", before: "Месяцами выводит новичков на норму: 2-6 месяцев, наставники заняты", after: "Новичок спрашивает базу, а не наставника", detail: "ответы одинаковые у всей линии" },
      { who: "Владелец", before: "Сам отвечает на вопросы про цены и перезванивает на пропущенные вечером", after: "Ассистент принимает звонки круглосуточно", detail: "сложное переводит на человека" },
      { who: "Данные между системами", before: "Цену поменяли в 1С, а клиентам отвечают по старой", after: "Изменение попадает в базу за секунды", detail: "вебхуки, без ручного переноса" },
      { who: "После звонка", before: "Оператор вручную пишет резюме и заводит лид", after: "Резюме и лид появляются в CRM сами", detail: "Битрикс24 и amoCRM" },
    ],
  },
  how: {
    title: "Как это работает",
    items: [
      { title: "Подключаете системы", text: "Битрикс24, amoCRM и Jira по вебхуку за минуты. 1С, Confluence, Google Drive, OpenCart и телефонию подключаем мы." },
      { title: "Знания ложатся по смыслу", text: "Каждая запись становится вектором. Вопрос «можно сдать товар?» находит «возврат в течение 14 дней», даже без общих слов." },
      { title: "Ответ за секунду", text: "В веб-приложении, подсказкой оператору во время звонка, в чате и голосом. Всегда со ссылкой на источник." },
    ],
  },
  speed: {
    title: "Быстрее, чем клиент успевает заскучать",
    lead: "Голосовой ассистент отвечает меньше чем за секунду, даже когда разговоров сотни.",
    metrics: [
      { value: "860", unit: "мс", label: "медиана задержки ответа голосом" },
      { value: "1,2", unit: "с", label: "95-й перцентиль задержки" },
      { value: "220", unit: "", label: "параллельных разговоров при замере" },
    ],
    note: "Замер у клиента, ноябрь 2026. От конца фразы клиента до начала ответа.",
  },
  integrations: {
    title: "Встраивается в то, что у вас уже есть",
    lead: "WikiAI не заменяет CRM, учёт и телефонию. Он забирает из них данные, отвечает и записывает результат обратно.",
    self: "Подключаете сами",
    setup: "Подключаем при настройке",
    custom: "Под заказ",
    items: [
      { name: "Битрикс24", what: "Сделки, контакты, задачи. Пишем обратно звонки и лиды", how: "self" },
      { name: "amoCRM", what: "Сделки и контакты. Пишем обратно лиды", how: "self" },
      { name: "Jira", what: "Задачи, решения и типовые заявки", how: "self" },
      { name: "1С", what: "Товары, цены, остатки и заказы", how: "setup" },
      { name: "Confluence", what: "Страницы, регламенты и инструкции", how: "setup" },
      { name: "Google Drive", what: "Документы, прайсы и скрипты", how: "setup" },
      { name: "OpenCart", what: "Каталог, цены и остатки магазина", how: "setup" },
      { name: "Телефония", what: "Ваша АТС по SIP-транку или сотовый номер через GSM-шлюз", how: "setup" },
      { name: "Ваши системы", what: "Любой REST API или push-загрузка", how: "custom" },
    ],
    twoWayTitle: "Читает и пишет обратно",
    twoWay: [
      "Перед ответом на звонок находит звонящего в CRM",
      "После звонка записывает резюме и создаёт лид в Битрикс24 или amoCRM",
      "Отдаёт ответы с источниками вашим сервисам и ИИ-агентам через API",
    ],
    logTitle: "Вебхуки за последний час",
    feedStatus: "Принимаем",
    feed: [
      { system: "1С", text: "Изменены цены на кофемашины" },
      { system: "Битрикс24", text: "Добавлен новый скрипт продаж" },
      { system: "amoCRM", text: "Обновлены статусы сделок" },
      { system: "Google Drive", text: "Добавлен новый прайс-лист" },
      { system: "Confluence", text: "Изменены условия доставки в регионы" },
      { system: "Jira", text: "Закрыта типовая заявка на выезд" },
      { system: "1С", text: "Обновлены остатки на складе в Минске" },
    ],
    feedTimes: ["только что", "4 мин назад", "11 мин назад", "26 мин назад", "43 мин назад", "58 мин назад"],
    feedCaption: "Пример журнала вебхуков.",
  },
  segments: {
    title: "Для компаний, которые работают с клиентами",
    tabsLabel: "Сегмент",
    prev: "Назад",
    next: "Дальше",
    doesTitle: "Что меняется",
    assistant: "Ассистент WikiAI",
    columns: { system: "Источник", doc: "Документ" },
    caption: "Пример: вопросы и данные условные.",
    items: [
      {
        id: "cc",
        tab: "Контакт-центр",
        who: "Руководитель КЦ, супервайзеры, операторы",
        does: [
          "Новичок получает подсказку во время звонка за 1-2 секунды, а не ищет ответ при клиенте",
          "Голосовой ассистент берёт ночь и перелив, сложные звонки переводит на оператора",
          "Резюме звонка и лид появляются в CRM без ручного ввода",
        ],
        role: "Оператор поддержки",
        question: "Покупатель хочет вернуть пылесос через 10 дней после покупки. Можно?",
        answer: "Да. Возврат возможен в течение 14 дней, если сохранены упаковка и чек. Оформляется в пункте выдачи.",
        sources: [{ system: "Документы", doc: "Регламент возвратов, п. 3" }],
      },
      {
        id: "smb",
        tab: "Продажи и сервис",
        who: "Владелец и отдел продаж на Битрикс24 или amoCRM",
        does: [
          "Сотрудники спрашивают цены, сроки и гарантию у WikiAI, а не у владельца",
          "Ассистент отвечает на звонки вечером и в выходные",
          "Лид с резюме разговора создаётся в CRM сам",
        ],
        role: "Менеджер по продажам",
        question: "Какую скидку можно дать оптовому клиенту на кофемашины?",
        answer: "От 10 штук скидка 7%, от 30 штук 12%. На складе 46 кофемашин, отгрузить можно завтра.",
        sources: [
          { system: "1С", doc: "Цены и остатки" },
          { system: "Битрикс24", doc: "Условия для оптовиков" },
        ],
      },
      {
        id: "retail",
        tab: "Сети и розница",
        who: "Директор сети, руководитель обучения, новички у стойки",
        does: [
          "Регламенты и акции в одном месте, ответ за секунды",
          "Цены и остатки из 1С прямо в ответе",
          "Новичок не ждёт наставника, когда у стойки очередь",
        ],
        role: "Продавец-консультант",
        question: "На каком складе больше всего роботов-пылесосов R7?",
        answer: "В Гомеле 12 шт., в Минске 4 шт., в Бресте 2 шт. Следующая поставка во вторник.",
        sources: [
          { system: "1С", doc: "Остатки на складах" },
          { system: "1С", doc: "График поставок" },
        ],
      },
      {
        id: "support",
        tab: "Техподдержка",
        who: "Провайдеры, ИТ-поддержка, сервисные компании",
        does: [
          "Ответ по инструкциям, базе решений и задачам Jira",
          "Одинаковый ответ у всей линии, без расхождений между сменами",
          "При переводе инженер видит, о чём уже говорили с клиентом",
        ],
        role: "Инженер первой линии",
        question: "После смены тарифа у клиента роутер мигает красным. Что делать?",
        answer: "Попросите перезагрузить роутер и проверить кабель в порту WAN. Если не помогло, создайте заявку на выезд, срок 1 рабочий день.",
        sources: [
          { system: "Confluence", doc: "Диагностика роутера, шаг 4" },
          { system: "Jira", doc: "Типовая заявка на выезд" },
        ],
      },
    ] as Segment[],
  },
  client: {
    eyebrow: "Клиенты",
    name: "Belinnovation.by",
    sector: "Медтех",
    text: "Система на основе WikiAI отвечает клиентам на вопросы по телефону и в чате и помогает в онбординге новых сотрудников.",
    tags: ["Телефон", "Чат", "Онбординг"],
    link: "belinnovation.by",
  },
  pilot: {
    title: "Бесплатный пилот на ваших данных",
    lead: "От двух до четырёх недель на одной линии или в одном отделе. До старта фиксируем показатели, после сравниваем.",
    steps: [
      { when: "Первые дни", title: "Подключаем", text: "CRM, телефонию и регламенты. От вас доступ к системам и документы." },
      { when: "2-4 недели", title: "Работаете и меряем", text: "Время поиска ответа, выход новичков на норму, долю звонков, закрытых ассистентом." },
      { when: "После пилота", title: "Решаете по цифрам", text: "Не будет эффекта, потеряете две недели, а не бюджет." },
    ],
  },
  pricing: {
    title: "Тарифы",
    lead: "Ядро платформы плюс модули по мере роста. Цены в BYN без НДС.",
    coreName: "Ядро: поиск, чат и коннекторы",
    coreNote: "Сверх пакета 9 BYN за сотрудника в месяц.",
    perMonth: "BYN в месяц",
    plans: [
      { name: "Команда", price: "290", includes: "до 25 сотрудников, 3 коннектора" },
      { name: "Компания", price: "890", includes: "до 100 сотрудников, 10 коннекторов" },
      { name: "Корпорация", price: "2 490", includes: "до 400 сотрудников, 25 коннекторов" },
    ],
    modulesTitle: "Модули",
    modules: [
      { name: "Телефония", price: "49", unit: "BYN за линию в месяц", note: "и 0,12 BYN за минуту ассистента, свыше 20 000 минут 0,09 BYN" },
      { name: "Подсказки оператору", price: "49", unit: "BYN за оператора в месяц", note: "для новичков и тех, кому они нужны" },
      { name: "Платформа для ИИ-агентов", price: "15", unit: "BYN за 1 000 ответов", note: "сверх пакета ядра, через API" },
      { name: "Закрытый контур", price: "от 2 900", unit: "BYN в месяц", note: "на вашем сервере, модули включены" },
    ],
    setupTitle: "Внедрение разово",
    setup: "«Стандарт» 2 900 BYN, «Колл-центр» 6 900 BYN, свой коннектор 8 640 BYN. Малый бизнес запускается сам по инструкции.",
  },
  data: {
    title: "Данные остаются под вашим контролем",
    items: [
      { title: "Облако или ваш сервер", text: "Работаем в облаке или разворачиваемся в закрытом контуре компании." },
      { title: "Отдельно и по ролям", text: "Данные каждой компании хранятся отдельно, сотрудник видит только то, что ему открыто." },
      { title: "Шифрование", text: "Записи звонков и ключи подключений к вашим системам хранятся зашифрованными." },
      { title: "Без догадок", text: "WikiAI отвечает по вашим данным. Если надёжного ответа нет, он так и скажет." },
    ],
  },
  faq: {
    title: "Частые вопросы",
    items: [
      {
        q: "Чем WikiAI отличается от базы знаний и CoPilot в Битрикс24?",
        a: "WikiAI отвечает сразу по всем подключённым системам: CRM, 1С, документам и Jira, и показывает источник. Ещё он принимает входящие звонки и отвечает голосом по вашей базе, а в Битрикс24 такого ассистента нет.",
      },
      {
        q: "Нужен ли программист?",
        a: "Нет. Битрикс24, amoCRM и Jira подключаются по вебхуку или токену за минуты. 1С, Confluence, Google Drive, OpenCart и телефонию мы подключаем сами при настройке.",
      },
      {
        q: "Как быстро обновляются данные?",
        a: "Изменения из систем с вебхуками приходят за секунды. Остальные системы синхронизируются по расписанию.",
      },
      {
        q: "Насколько быстро отвечает голосовой ассистент?",
        a: "По замеру у клиента медиана задержки 860 мс, 95-й перцентиль 1,2 с при 220 параллельных разговорах.",
      },
      {
        q: "Нужна ли новая АТС?",
        a: "Нет. WikiAI подключается к вашей АТС по SIP-транку, а к сотовому номеру через GSM-шлюз. Номера и маршрутизация остаются прежними.",
      },
      {
        q: "Можно ли перевести звонок на человека?",
        a: "Да. Когда нужен человек, ассистент переводит звонок на оператора, и тот видит, о чём уже говорили.",
      },
      {
        q: "Что если WikiAI ответит неверно?",
        a: "WikiAI отвечает только по вашим данным и показывает источник каждого ответа, поэтому его легко проверить. Если надёжного ответа нет, WikiAI так и скажет.",
      },
      {
        q: "Сколько стоит пилот?",
        a: "Пилот бесплатный и длится 2-4 недели. От вас доступ к CRM и регламенты; показатели фиксируем до старта и сравниваем после.",
      },
    ],
  },
  contact: {
    title: "Обсудим пилот для вашей компании",
    lead: "Расскажем, как WikiAI подключится к вашей CRM, телефонии и документам, и договоримся о старте.",
    person: "Афанасьев Иван",
    role: "Пилот, демо и подключение",
    telegram: "Написать в Telegram",
    phone: "Позвонить",
    all: "Все контакты",
    direct: "Напрямую",
    copy: "Скопировать",
    copied: "Скопировано",
    top: "Наверх",
  },
  contactPage: {
    meta: {
      title: "WikiAI | Контакты",
      description: "Свяжитесь с WikiAI в Telegram, по почте или телефону, чтобы обсудить бесплатный пилот для вашей компании.",
    },
    label: "Контакты",
    title: "Обсудим пилот для вашей компании",
    lead: "Напишите или позвоните. Расскажем, как WikiAI подключится к вашей CRM, телефонии и документам, и договоримся о старте.",
    stepsTitle: "Что будет дальше",
    steps: [
      { title: "Созваниваемся", text: "Обсуждаем ваши системы, данные и задачи команды." },
      { title: "Подключаем", text: "Подключаем CRM, телефонию и регламенты к WikiAI." },
      { title: "Запускаем пилот", text: "От двух до четырёх недель на ваших данных. Решение за вами." },
    ],
    email: "Почта",
    phone: "Телефон",
    save: "Сохранить контакт",
    back: "На главную",
  },
  footer: {
    tagline: "Хранит знания компании в векторном виде и отвечает за секунду по данным из Битрикс24, amoCRM, 1С и документов.",
    product: "Продукт",
    company: "Компания",
    projects: "Проекты",
    contacts: "Контакты",
    signIn: "Вход",
    graph: "Графы знаний и системы решений",
    author: "Иван Афанасьев, CTO",
    rights: "Все права защищены.",
  },
};

export type Dict = typeof ru;

const en: Dict = {
  meta: {
    title: "WikiAI | Answers from every company system in a second",
    description:
      "WikiAI connects to Bitrix24, amoCRM, 1C and your documents and answers employees, customers and callers from your data with a link to the source. Voice reply: 860 ms median.",
  },
  nav: {
    links: [
      { href: "#how", label: "How it works" },
      { href: "#integrations", label: "Integrations" },
      { href: "#segments", label: "Who it's for" },
      { href: "#pricing", label: "Pricing" },
      { href: "#faq", label: "FAQ" },
    ],
    signIn: "Sign in",
    cta: "Discuss a pilot",
    menu: "Menu",
    close: "Close menu",
    toLight: "Light theme",
    toDark: "Dark theme",
    language: "Русский",
    languageShort: "RU",
    home: "WikiAI home",
  },
  hero: {
    title: "Answers from every company system in a second",
    lead: "WikiAI connects to Bitrix24, amoCRM and 1C, keeps knowledge as vectors and answers employees, customers and callers with a link to the source.",
    secondary: "How it works",
    ring: "How it works · How it works · How it works · ",
    cornerTop: "A vector knowledge base for contact centres and SMBs",
    cornerBottom: "Median voice reply 860 ms",
  },
  manifesto: {
    label: "Why",
    text: "Company knowledge is scattered across the CRM, accounting, documents and people's heads. WikiAI gathers it in one place and answers in a second.",
  },
  swap: {
    title: "Five jobs a person stops doing on Monday",
    lead: "Not “process optimisation”, but specific minutes that specific people lose today.",
    before: "Done by hand",
    after: "What happens instead",
    note: "Nobody leaves. Searching, asking around and manual entry do.",
    rows: [
      { who: "New operator", before: "Searches five windows while the customer hears “one moment, please”", after: "Sees a prompt during the call", detail: "in 1-2 seconds, with a link to the policy" },
      { who: "Contact-centre head", before: "Spends months bringing newcomers up to speed: 2-6 months, mentors are busy", after: "Newcomers ask the base, not a mentor", detail: "the whole line gives the same answer" },
      { who: "Owner", before: "Answers price questions personally and calls back missed calls in the evening", after: "The assistant takes calls around the clock", detail: "hard ones go to a person" },
      { who: "Data between systems", before: "A price changed in 1C, and customers still get the old one", after: "The change reaches the base in seconds", detail: "webhooks, no manual transfer" },
      { who: "After a call", before: "The operator writes the summary and creates the lead by hand", after: "The summary and lead appear in the CRM", detail: "Bitrix24 and amoCRM" },
    ],
  },
  how: {
    title: "How it works",
    items: [
      { title: "Connect your systems", text: "Bitrix24, amoCRM and Jira with a webhook in minutes. We connect 1C, Confluence, Google Drive, OpenCart and telephony." },
      { title: "Knowledge settles by meaning", text: "Every record becomes a vector. “Can I bring it back?” finds “returns within 14 days”, even with no words in common." },
      { title: "An answer in a second", text: "In the web app, as a prompt to an operator during a call, in chat and by voice. Always with a link to the source." },
    ],
  },
  speed: {
    title: "Faster than the customer gets bored",
    lead: "The voice assistant replies in under a second, even with hundreds of conversations at once.",
    metrics: [
      { value: "860", unit: "ms", label: "median voice reply latency" },
      { value: "1.2", unit: "s", label: "95th percentile latency" },
      { value: "220", unit: "", label: "parallel conversations during the test" },
    ],
    note: "Measured at a client, November 2026. From the end of the caller's phrase to the start of the reply.",
  },
  integrations: {
    title: "Fits into what you already have",
    lead: "WikiAI does not replace your CRM, accounting or telephony. It takes data from them, answers, and writes the result back.",
    self: "You connect it",
    setup: "We connect it during setup",
    custom: "Built to order",
    items: [
      { name: "Bitrix24", what: "Deals, contacts, tasks. Calls and leads are written back", how: "self" },
      { name: "amoCRM", what: "Deals and contacts. Leads are written back", how: "self" },
      { name: "Jira", what: "Issues, solutions and standard requests", how: "self" },
      { name: "1C", what: "Products, prices, stock and orders", how: "setup" },
      { name: "Confluence", what: "Pages, policies and manuals", how: "setup" },
      { name: "Google Drive", what: "Documents, price lists and scripts", how: "setup" },
      { name: "OpenCart", what: "Store catalogue, prices and stock", how: "setup" },
      { name: "Telephony", what: "Your PBX over a SIP trunk, or a mobile number through a GSM gateway", how: "setup" },
      { name: "Your systems", what: "Any REST API or push upload", how: "custom" },
    ],
    twoWayTitle: "Reads and writes back",
    twoWay: [
      "Finds the caller in the CRM before answering",
      "After a call, writes the summary and creates a lead in Bitrix24 or amoCRM",
      "Gives answers with sources to your services and AI agents through the API",
    ],
    logTitle: "Webhooks in the last hour",
    feedStatus: "Receiving",
    feed: [
      { system: "1C", text: "Coffee machine prices changed" },
      { system: "Bitrix24", text: "New sales script added" },
      { system: "amoCRM", text: "Deal statuses updated" },
      { system: "Google Drive", text: "New price list added" },
      { system: "Confluence", text: "Regional delivery terms changed" },
      { system: "Jira", text: "Standard on-site request closed" },
      { system: "1C", text: "Minsk warehouse stock updated" },
    ],
    feedTimes: ["just now", "4 min ago", "11 min ago", "26 min ago", "43 min ago", "58 min ago"],
    feedCaption: "Example webhook log.",
  },
  segments: {
    title: "For companies that work with customers",
    tabsLabel: "Segment",
    prev: "Previous",
    next: "Next",
    doesTitle: "What changes",
    assistant: "WikiAI assistant",
    columns: { system: "Source", doc: "Document" },
    caption: "Example: questions and data are illustrative.",
    items: [
      {
        id: "cc",
        tab: "Contact centre",
        who: "Contact-centre head, supervisors, operators",
        does: [
          "A newcomer gets a prompt during the call in 1-2 seconds instead of searching while the customer waits",
          "The voice assistant takes nights and overflow and transfers hard calls to an operator",
          "The call summary and the lead appear in the CRM with no manual entry",
        ],
        role: "Support agent",
        question: "A customer wants to return a vacuum cleaner 10 days after purchase. Is that allowed?",
        answer: "Yes. Returns are accepted within 14 days if the packaging and receipt are kept. Processed at the pickup point.",
        sources: [{ system: "Documents", doc: "Returns policy, item 3" }],
      },
      {
        id: "smb",
        tab: "Sales and service",
        who: "The owner and a sales team on Bitrix24 or amoCRM",
        does: [
          "Staff ask WikiAI about prices, lead times and warranty instead of the owner",
          "The assistant answers calls in the evening and at weekends",
          "A lead with the conversation summary is created in the CRM automatically",
        ],
        role: "Sales manager",
        question: "What discount can I give a wholesale customer on coffee machines?",
        answer: "7% from 10 units, 12% from 30 units. 46 coffee machines are in stock, ready to ship tomorrow.",
        sources: [
          { system: "1C", doc: "Prices and stock" },
          { system: "Bitrix24", doc: "Wholesale terms" },
        ],
      },
      {
        id: "retail",
        tab: "Chains and retail",
        who: "Chain director, training lead, newcomers at the counter",
        does: [
          "Policies and promotions in one place, answered in seconds",
          "Prices and stock from 1C right in the answer",
          "A newcomer does not wait for a mentor while a queue builds",
        ],
        role: "Sales assistant",
        question: "Which warehouse has the most R7 robot vacuums?",
        answer: "Gomel has 12, Minsk 4, Brest 2. The next delivery arrives on Tuesday.",
        sources: [
          { system: "1C", doc: "Warehouse stock" },
          { system: "1C", doc: "Delivery schedule" },
        ],
      },
      {
        id: "support",
        tab: "Tech support",
        who: "Internet providers, IT support, service companies",
        does: [
          "Answers from manuals, the solutions base and Jira issues",
          "The same answer across the whole line, with no drift between shifts",
          "On transfer, the engineer sees what was already discussed",
        ],
        role: "First-line engineer",
        question: "After a tariff change the customer's router blinks red. What should I do?",
        answer: "Ask them to restart the router and check the cable in the WAN port. If that does not help, create an on-site request; it takes 1 working day.",
        sources: [
          { system: "Confluence", doc: "Router diagnostics, step 4" },
          { system: "Jira", doc: "Standard on-site request" },
        ],
      },
    ],
  },
  client: {
    eyebrow: "Customers",
    name: "Belinnovation.by",
    sector: "MedTech",
    text: "A system built on WikiAI answers customer questions by phone and in chat and helps onboard new employees.",
    tags: ["Phone", "Chat", "Onboarding"],
    link: "belinnovation.by",
  },
  pilot: {
    title: "A free pilot on your own data",
    lead: "Two to four weeks on one line or in one team. We record the baseline before the start and compare after.",
    steps: [
      { when: "First days", title: "We connect", text: "The CRM, telephony and your policies. From you: access to the systems and the documents." },
      { when: "2-4 weeks", title: "You work, we measure", text: "Time to find an answer, newcomer ramp-up, the share of calls the assistant closes." },
      { when: "After the pilot", title: "You decide on numbers", text: "No effect means you lose two weeks, not a budget." },
    ],
  },
  pricing: {
    title: "Pricing",
    lead: "The platform core plus modules as you grow. Prices in BYN, VAT excluded.",
    coreName: "Core: search, chat and connectors",
    coreNote: "Above the plan, 9 BYN per employee a month.",
    perMonth: "BYN a month",
    plans: [
      { name: "Team", price: "290", includes: "up to 25 employees, 3 connectors" },
      { name: "Company", price: "890", includes: "up to 100 employees, 10 connectors" },
      { name: "Corporation", price: "2,490", includes: "up to 400 employees, 25 connectors" },
    ],
    modulesTitle: "Modules",
    modules: [
      { name: "Telephony", price: "49", unit: "BYN per line a month", note: "plus 0.12 BYN per assistant minute, 0.09 BYN above 20,000 minutes" },
      { name: "Operator prompts", price: "49", unit: "BYN per operator a month", note: "for newcomers and whoever needs them" },
      { name: "Platform for AI agents", price: "15", unit: "BYN per 1,000 answers", note: "above the core plan, through the API" },
      { name: "Closed circuit", price: "from 2,900", unit: "BYN a month", note: "on your server, modules included" },
    ],
    setupTitle: "One-off setup",
    setup: "“Standard” 2,900 BYN, “Contact centre” 6,900 BYN, a custom connector 8,640 BYN. Small businesses start on their own with a guide.",
  },
  data: {
    title: "Your data stays under your control",
    items: [
      { title: "Cloud or your server", text: "We run in the cloud or deploy in your company's closed circuit." },
      { title: "Separate and by role", text: "Each company's data is stored separately; an employee sees only what is open to them." },
      { title: "Encryption", text: "Call recordings and the keys to your systems are stored encrypted." },
      { title: "No guessing", text: "WikiAI answers from your data. If there is no reliable answer, it says so." },
    ],
  },
  faq: {
    title: "Frequently asked questions",
    items: [
      {
        q: "How is WikiAI different from the Bitrix24 knowledge base and CoPilot?",
        a: "WikiAI answers from all connected systems at once (CRM, 1C, documents and Jira) and shows the source. It also takes inbound calls and answers by voice from your base; Bitrix24 has no such assistant.",
      },
      {
        q: "Do we need a developer?",
        a: "No. Bitrix24, amoCRM and Jira connect with a webhook or token in minutes. We connect 1C, Confluence, Google Drive, OpenCart and telephony ourselves during setup.",
      },
      {
        q: "How quickly is the data updated?",
        a: "Changes from systems with webhooks arrive within seconds. Other systems sync on a schedule.",
      },
      {
        q: "How fast does the voice assistant reply?",
        a: "Measured at a client: 860 ms median latency, 1.2 s at the 95th percentile, with 220 parallel conversations.",
      },
      {
        q: "Do we need a new PBX?",
        a: "No. WikiAI connects to your PBX over a SIP trunk, or to a mobile number through a GSM gateway. Numbers and routing stay the same.",
      },
      {
        q: "Can a call be transferred to a person?",
        a: "Yes. When a person is needed, the assistant transfers the call to an operator, who sees what was already said.",
      },
      {
        q: "What if WikiAI answers incorrectly?",
        a: "WikiAI answers only from your data and shows the source of every answer, so it is easy to check. If there is no reliable answer, it says so.",
      },
      {
        q: "How much does the pilot cost?",
        a: "The pilot is free and lasts 2-4 weeks. From you: CRM access and your policies; we record the baseline before the start and compare after.",
      },
    ],
  },
  contact: {
    title: "Let's discuss a pilot for your company",
    lead: "We'll show how WikiAI connects to your CRM, telephony and documents, and agree on a start date.",
    person: "Ivan Afanasieff",
    role: "Pilot, demo and onboarding",
    telegram: "Message on Telegram",
    phone: "Call",
    all: "All contacts",
    direct: "Direct",
    copy: "Copy",
    copied: "Copied",
    top: "Back to top",
  },
  contactPage: {
    meta: {
      title: "WikiAI | Contacts",
      description: "Reach WikiAI on Telegram, by email or by phone to discuss a free pilot for your company.",
    },
    label: "Contacts",
    title: "Let's discuss a pilot for your company",
    lead: "Write or call. We'll show how WikiAI connects to your CRM, telephony and documents, and agree on a start date.",
    stepsTitle: "What happens next",
    steps: [
      { title: "We talk", text: "We go over your systems, data and your team's goals." },
      { title: "We connect", text: "We connect your CRM, telephony and policies to WikiAI." },
      { title: "The pilot starts", text: "Two to four weeks on your own data. The decision is yours." },
    ],
    email: "Email",
    phone: "Phone",
    save: "Save contact",
    back: "Home",
  },
  footer: {
    tagline: "Keeps company knowledge as vectors and answers in a second from Bitrix24, amoCRM, 1C and your documents.",
    product: "Product",
    company: "Company",
    projects: "Projects",
    contacts: "Contacts",
    signIn: "Sign in",
    graph: "Knowledge graphs and decision systems",
    author: "Ivan Afanasieff, CTO",
    rights: "All rights reserved.",
  },
};

export const dictionaries: Record<Locale, Dict> = { ru, en };

/** Public contacts, the same as on /contact. */
export const CONTACT = {
  telegram: { display: "@iafanasieff", href: "https://t.me/iafanasieff" },
  email: { display: "afanasieffivan@gmail.com", href: "mailto:afanasieffivan@gmail.com" },
  phone: { display: "+375 44 508-85-75", href: "tel:+375445088575", plain: "+375445088575" },
};
