import type { en } from './en'

type TranslationSchema = {
  [S in keyof typeof en]: {
    [K in keyof (typeof en)[S]]: string
  } & {
    [K in keyof (typeof en)[S] as K extends
      | `${infer Base}_one`
      | `${infer Base}_other`
      ? `${Base}_few` | `${Base}_many`
      : never]?: string
  }
}

export const uk = {
  common: {
    cancel: 'Скасувати',
    delete: 'Видалити',
    remove: 'Прибрати',
    error: 'Помилка',
    optional: 'Необов\u0027язково',
    loading: 'Завантаження...',
    unknown: 'Невідомо',
    start: 'Старт',
    stop: 'Стоп',
    signIn: 'Увійти',
    signOut: 'Вийти',
    ok: 'OK',
    actions: 'Дії',
    close: 'Закрити',
    submit: 'Підтвердити',
    menu: 'Меню',
    language: 'Мова',
    create: 'Створити',
    continue: 'Продовжити'
  },

  tabs: {
    home: 'Головна',
    maintenance: 'Обслуговування',
    activity: 'Активність',
    members: 'Учасники'
  },

  drawer: {
    organization: 'Організація',
    createOrganization: 'Створити організацію',
    invitations: 'Запрошення',
    invitedBy: 'Запросив(ла) {{name}}',
    rename: 'Перейменувати',
    delete: 'Видалити',
    leave: 'Покинути',
    deviceLanguage: 'Мова пристрою',
    menuWithInvitations_one: 'Меню, 1 очікуване запрошення',
    menuWithInvitations_few: 'Меню, {{count}} очікуваних запрошення',
    menuWithInvitations_many: 'Меню, {{count}} очікуваних запрошень',
    menuWithInvitations_other: 'Меню, {{count}} очікуваних запрошень'
  },

  generatorStatus: {
    running: 'Працює',
    resting: 'Відпочиває',
    available: 'Доступний'
  },

  home: {
    noOrganizations: 'Немає організацій',
    noOrganizationsDesc:
      'Створіть організацію або прийміть запрошення, щоб почати.',
    goToMembers: 'До учасників',
    noGenerators: 'Немає генераторів',
    noGeneratorsAdminDesc: 'Додайте перший генератор, щоб почати відстеження.',
    noGeneratorsDesc: 'Вам ще не призначено жодного генератора.',
    addGenerator: 'Додати генератор',
    add: 'Додати',
    myActiveSession: 'Моя активна сесія',
    stopGenerator: 'Зупинити генератор'
  },

  activity: {
    noActivity: 'Немає активності',
    noActivityDesc:
      'Тут відображатиметься активність від запусків генераторів та обслуговування.',
    active: 'Активна',
    run: 'Запуск',
    maintenance: 'Обслуговування',
    inProgress: 'В процесі',
    noActivityRecorded: 'Активність не зафіксована',
    session: 'Сесія',
    viewAll: 'Переглянути все',
    recentActivity: 'Остання активність',
    unknownGenerator: 'Невідомий генератор',
    unknownTask: 'Невідоме завдання'
  },

  filters: {
    all: 'Усі',
    sessions: 'Запуски',
    maintenance: 'Обслуговування'
  },

  maintenanceTab: {
    noMaintenance: 'Немає обслуговування',
    noMaintenanceDesc:
      'Додайте шаблони обслуговування до генераторів для відстеження графіку сервісу.',
    overdue: 'Прострочено',
    dueSoon: 'Скоро',
    upcoming: 'Заплановано',
    record: 'Записати',
    unknownGenerator: 'Невідомий генератор'
  },

  members: {
    searchMembers: 'Пошук учасників',
    noResults: 'Немає результатів для "{{query}}"',
    members: 'Учасники',
    membersCount: 'Учасники ({{count}})',
    noMatchingMembers: 'Учасників не знайдено',
    noMembersYet: 'Ще немає учасників',
    admin: 'Адмін',
    you: 'Ви',
    pendingInvitations: 'Очікувані запрошення',
    removeMember: 'Прибрати учасника',
    removeMemberDesc:
      'Учасника буде прибрано, а його генератори перепризначено вам.'
  },

  generator: {
    newGenerator: 'Новий генератор',
    addDesc:
      'Додайте генератор, щоб почати відстеження його використання та обслуговування.',
    title: 'Назва',
    titlePlaceholder: 'напр. "Генератор на подвір\u0027ї"',
    model: 'Модель',
    modelPlaceholder: 'напр. "Honda EU2200i"',
    description: 'Опис',
    descriptionPlaceholder: 'Розташування, серійний номер, нотатки...',
    titleRequired: 'Назва обов\u0027язкова',
    modelRequired: 'Модель обов\u0027язкова',

    generatorDetails: 'Деталі генератора',
    back: 'Назад',
    configureDesc:
      '{{model}} \u2014 налаштуйте характеристики та графік обслуговування.',
    autoFillAI: 'Заповнити за допомогою ШІ',
    autoFillAIDesc:
      'Дослідити модель генератора та автоматично запропонувати характеристики й завдання обслуговування.',
    enterManually: 'Ввести вручну',
    enterManuallyDesc:
      'Самостійно налаштувати характеристики та завдання обслуговування.',
    researching: 'Досліджуємо {{model}}...',
    maxRunHours: 'Макс. годин роботи',
    restHours: 'Годин відпочинку',
    warningThresholdPct: 'Поріг попередження %',
    warningThresholdDesc:
      'Попередження з\u0027являється при цьому відсотку максимальних годин роботи',
    maintenanceTasks: 'Завдання обслуговування',
    addMaintenanceTask: 'Додати завдання',

    settings: 'Налаштування',
    generatorTitle: 'Назва генератора',
    generatorModel: 'Модель генератора',
    deleteGenerator: 'Видалити генератор',
    deleteGeneratorConfirm:
      'Ви впевнені, що хочете видалити "{{title}}"? Цю дію неможливо скасувати.',
    unassign: 'Скасувати призначення',
    unassignConfirm: 'Прибрати цього користувача з генератора?',

    lifetimeHours: '{{hours}} загальних годин',
    readyToRun: 'Натисніть, щоб запустити',
    tapToStop: 'Натисніть, щоб зупинити',
    startGenerator: 'Запустити генератор',
    stopGenerator: 'Зупинити генератор',
    elapsed: '{{hours}} минуло',
    max: '{{hours}} макс.',
    rested: '{{hours}} відпочив',
    required: '{{hours}} необхідно',
    remaining: '{{time}} залишилось',
    total: '{{hours}} всього',
    rests: 'відпочиває {{time}}',
    overdue: 'прострочено',

    deleteRun: 'Видалити запуск',
    deleteRunConfirm: 'Ви впевнені, що хочете видалити цей запуск?',
    deleteRecord: 'Видалити запис',
    deleteRecordConfirm:
      'Ви впевнені, що хочете видалити цей запис обслуговування?',

    generatorIsResting: 'Генератор відпочиває',
    restingStartWarning:
      'Рекомендовано дати генератору відпочити перед повторним запуском. Запуск зараз може скоротити термін служби.',
    startAnyway: 'Запустити все одно',

    logSessionDesc:
      'Ретроспективно записати запуск генератора, вказавши час початку та завершення.',
    startTime: 'Час початку',
    endTime: 'Час завершення'
  },

  maintenanceTemplate: {
    defineDesc:
      'Визначте періодичне завдання обслуговування для цього генератора.',
    taskName: 'Назва завдання',
    taskNamePlaceholder: 'напр. "Заміна масла", "Повітряний фільтр"',
    instructionsPlaceholder: 'Інструкції або нотатки...',
    triggerType: 'Тип тригера',
    byHours: 'За годинами',
    byCalendar: 'За календарем',
    whicheverFirst: 'Що раніше',
    hoursInterval: 'Інтервал годин',
    hoursIntervalPlaceholder: 'напр. 100',
    hoursIntervalDesc: 'Обслуговування після цієї кількості годин роботи',
    calendarDays: 'Календарні дні',
    calendarDaysPlaceholder: 'напр. 30',
    calendarDaysDesc: 'Обслуговування після цієї кількості днів',
    hours: 'Години',
    calendar: 'Календар',
    first: 'Раніше',
    runHoursBetween: 'Годин роботи між обслуговуванням',
    daysBetween: 'Днів між обслуговуванням',
    oneTimeTask: 'Одноразове завдання',
    noTemplates: 'Немає шаблонів обслуговування',
    neverPerformed: 'Ніколи не виконувалось',
    onceAtHours: 'Раз при {{hours}} год',
    onceAtDays: 'Раз при {{days}} дн.',
    onceAtBoth: 'Раз при {{hours}} год або {{days}} дн.',
    everyHours: 'Кожні {{hours}} год',
    everyDays: 'Кожні {{days}} дн.',
    everyBoth: '{{hours}} год або {{days}} дн.',
    last: 'Останнє: {{date}}',
    schedule: 'Розклад',
    nextDue: 'Наступне обслуговування',
    instructions: 'Інструкції',
    recordNow: 'Записати обслуговування',
    lastPerformed: 'Останнє виконання',
    completed: 'Виконано',
    deleteTask: 'Видалити завдання',
    deleteTaskConfirm:
      'Ви впевнені, що хочете видалити це завдання? Усі пов\u2019язані записи також будуть видалені.'
  },

  maintenanceRecord: {
    logDesc: 'Зафіксуйте, що це обслуговування було виконано.',
    notes: 'Нотатки',
    notesPlaceholder: 'Будь-які спостереження або деталі...'
  },

  aiSuggestions: {
    sources: 'Джерела',
    offline: 'Офлайн',
    offlineDesc: 'Для пропозицій ШІ потрібне підключення до інтернету.',
    failedToGet: 'Не вдалося отримати пропозиції',
    genericWarning:
      'Це загальний шаблон обслуговування. Перевірте значення відповідно до документації вашого генератора.',
    genericTitle: 'Конкретних даних не знайдено',
    genericPrompt:
      'Не вдалося знайти дані виробника для цієї моделі. Бажаєте використати загальний шаблон як основу?',
    useTemplate: 'Використати шаблон',
    noThanks: 'Ні, дякую',
    timeout: 'Час очікування вичерпано. Будь ласка, спробуйте ще раз.'
  },

  organization: {
    createDesc: 'Створіть організацію, щоб почати керувати генераторами.',
    organizationName: 'Назва організації',
    namePlaceholder: 'напр. Моя майстерня',
    renameDesc: 'Змініть назву вашої організації.',
    inviteDesc: 'Введіть email-адресу людини, яку ви хочете запросити.',
    emailAddress: 'Email-адреса',
    emailPlaceholder: 'працівник@example.com',
    inviteHint: 'Запрошення з\u0027явиться, коли вони увійдуть з цим email',
    deleteOrg: 'Видалити організацію',
    deleteOrgDesc:
      'Це назавжди видалить усі генератори, запуски, записи обслуговування та зв\u0027язки з учасниками. Цю дію неможливо скасувати.',
    typeToConfirm: 'Введіть \u201c{{name}}\u201d для підтвердження',
    nameDoesNotMatch: 'Назва не збігається',
    orgDeleted: '"{{name}}" видалено',
    leaveOrg: 'Покинути організацію',
    leaveOrgDesc:
      'Вас буде відкріплено від усіх генераторів у \u201c{{name}}\u201d. Щоб повернутися, адмін повинен запросити вас знову.',
    leftOrg: 'Ви покинули "{{name}}"',
    orgInvitation: 'Запрошення до організації',
    invitedToJoin: '{{inviter}} запросив(ла) вас до {{org}}',
    decline: 'Відхилити',
    accept: 'Прийняти'
  },

  auth: {
    welcome: 'Ласкаво просимо до Svitlo',
    welcomeDesc: 'Увійдіть за допомогою Apple ID, щоб почати.',
    privacyPolicy: 'Політика конфіденційності',
    agreeToPolicy: 'Продовжуючи, ви погоджуєтесь з',
    useEmailInstead: 'Використати email',
    createAccount: 'Створити акаунт',
    signInWithEmail: 'Увійти через email',
    name: 'Ім\u0027я',
    namePlaceholder: 'Ваше ім\u0027я',
    email: 'Email',
    emailPlaceholder: 'ви@example.com',
    password: 'Пароль',
    createPassword: 'Створіть пароль',
    enterPassword: 'Введіть ваш пароль',
    passwordHint: 'Мінімум 8 символів',
    confirmPassword: 'Підтвердження паролю',
    confirmPasswordPlaceholder: 'Підтвердіть ваш пароль',
    creatingAccount: 'Створення акаунту...',
    signingIn: 'Вхід...',
    signIn: 'Увійти',
    signUp: 'Зареєструватися',
    alreadyHaveAccount: 'Вже є акаунт? ',
    dontHaveAccount: 'Немає акаунту? ',
    somethingWentWrong: 'Щось пішло не так',
    sessionExpired: 'Сесія закінчилась',
    sessionExpiredDesc:
      'Увійдіть знову, щоб відновити синхронізацію даних. Ваші локальні дані в безпеці.',
    signedInWithEmail: 'Входили через email?',
    notNow: 'Не зараз',
    completeName: 'Як вас звати?',
    completeNameDesc: 'Введіть ваше ім\u0027я, щоб продовжити.',
    differentAccount: 'Виявлено інший акаунт',
    differentAccountDesc:
      'Ви увійшли з іншим акаунтом, ніж той, що збережений на цьому пристрої. Щоб змінити акаунт, спочатку вийдіть. Ваш поточний вхід скасовано.'
  },

  sync: {
    changesNotSynced_one: '1 зміну не вдалося синхронізувати',
    changesNotSynced_few: '{{count}} зміни не вдалося синхронізувати',
    changesNotSynced_many: '{{count}} змін не вдалося синхронізувати',
    changesNotSynced_other: '{{count}} змін не вдалося синхронізувати',
    syncError: 'Помилка синхронізації',
    syncingChanges: 'Синхронізація змін\u2026',
    sessionExpired: 'Сесія закінчилась',
    offline: 'Офлайн \u2014 зміни збережено локально',
    connecting: 'З\u0027єднання\u2026',
    allSynced: 'Усі зміни синхронізовано',
    expiredWithChanges_one:
      'Сесія закінчилась \u2014 1 зміна очікує синхронізації. Ваші дані в безпеці.',
    expiredWithChanges_few:
      'Сесія закінчилась \u2014 {{count}} зміни очікують синхронізації. Ваші дані в безпеці.',
    expiredWithChanges_many:
      'Сесія закінчилась \u2014 {{count}} змін очікує синхронізації. Ваші дані в безпеці.',
    expiredWithChanges_other:
      'Сесія закінчилась \u2014 {{count}} змін очікує синхронізації. Ваші дані в безпеці.',
    expiredNoChanges:
      'Сесія закінчилась \u2014 увійдіть для відновлення синхронізації.',
    dismiss: 'Закрити'
  },

  update: {
    available: 'Доступне оновлення',
    restartDesc: 'Перезапустіть, щоб отримати останню версію',
    restart: 'Перезапустити'
  },

  employees: {
    assignedEmployees: 'Призначені працівники',
    noEmployeesAssigned: 'Працівників не призначено'
  },

  scope: {
    filter: 'Фільтр',
    organization: 'Організація',
    myGenerators: 'Мої генератори',
    generator: 'Генератор'
  },

  edit: {
    startTime: 'Час початку',
    endTime: 'Час завершення',
    performedAt: 'Виконано',
    notes: 'Нотатки',
    optionalNotes: 'Необов\u0027язкові нотатки...'
  },

  validation: {
    enterEmail: 'Будь ласка, введіть ваш email',
    validEmail: 'Будь ласка, введіть дійсний email',
    enterPassword: 'Будь ласка, введіть ваш пароль',
    enterName: 'Будь ласка, введіть ваше ім\u0027я',
    passwordMinLength: 'Пароль повинен містити щонайменше 8 символів',
    passwordsDoNotMatch: 'Паролі не збігаються',
    mustBeValidEmail: 'Має бути дійсна email-адреса',
    minPercent: 'Має бути щонайменше 1%',
    maxPercent: 'Має бути не більше 100%',
    required: 'Обов\u0027язково для обраного типу тригера',
    atLeastOneField: 'Необхідно вказати хоча б одне поле',
    mustNotBeEmpty: 'Не може бути порожнім',
    mustBePositive: 'Має бути більше 0',
    mustBePositiveInt: 'Має бути додатнім цілим числом'
  },

  due: {
    overdueHours: '{{hours}} прострочено',
    overdueDays: '{{days}}дн. прострочено',
    overdue: 'прострочено',
    inHours: 'через {{hours}}',
    inDays: 'через {{days}}дн.'
  },

  screens: {
    logPastRun: 'Записати минулий запуск',
    newTask: 'Нове завдання',
    recordMaintenance: 'Запис обслуговування',
    editRun: 'Редагувати запуск',
    editMaintenance: 'Редагувати обслуговування',
    newOrganization: 'Нова організація',
    inviteMember: 'Запросити учасника',
    renameOrganization: 'Перейменувати організацію',
    taskDetails: 'Деталі завдання',
    editTask: 'Редагувати завдання'
  },

  invitations: {
    new_one: 'Нове запрошення',
    new_few: '{{count}} нових запрошення',
    new_many: '{{count}} нових запрошень',
    new_other: '{{count}} нових запрошень',
    pending_one: 'У вас є очікуване запрошення до організації',
    pending_few: 'У вас є {{count}} очікуваних запрошення до організацій',
    pending_many: 'У вас є {{count}} очікуваних запрошень до організацій',
    pending_other: 'У вас є {{count}} очікуваних запрошень до організацій',
    view: 'Переглянути'
  },

  signOut: {
    unsyncedChanges: 'Несинхронізовані зміни',
    unsyncedDesc_one:
      'У вас є 1 зміна, яка ще не синхронізована. Вихід назавжди видалить її. Спочатку увійдіть знову, щоб синхронізувати дані.',
    unsyncedDesc_few:
      'У вас є {{count}} зміни, які ще не синхронізовано. Вихід назавжди видалить їх. Спочатку увійдіть знову, щоб синхронізувати дані.',
    unsyncedDesc_many:
      'У вас є {{count}} змін, які ще не синхронізовано. Вихід назавжди видалить їх. Спочатку увійдіть знову, щоб синхронізувати дані.',
    unsyncedDesc_other:
      'У вас є {{count}} змін, які ще не синхронізовано. Вихід назавжди видалить їх. Спочатку увійдіть знову, щоб синхронізувати дані.',
    signOutAnyway: 'Все одно вийти'
  },

  errors: {
    generatorNotFound: 'Генератор не знайдено',
    sessionNotFound: 'Сесію не знайдено',
    memberNotFound: 'Учасника не знайдено',
    organizationNotFound: 'Організацію не знайдено',
    templateNotFound: 'Шаблон не знайдено',
    recordNotFound: 'Запис не знайдено',
    invitationNotFound: 'Запрошення не знайдено',
    maintenanceTemplateNotFound: 'Шаблон обслуговування не знайдено',

    notAuthorizedForGenerator: 'Немає доступу до цього генератора',
    onlyAdminCanRemoveMembers: 'Тільки адмін може видаляти учасників',
    onlyAdminCanCreateTemplates:
      'Тільки адмін може створювати шаблони обслуговування',
    onlyAdminCanUpdateTemplates:
      'Тільки адмін може оновлювати шаблони обслуговування',
    onlyAdminCanDeleteTemplates:
      'Тільки адмін може видаляти шаблони обслуговування',
    onlyAdminCanUpdateGenerators: 'Тільки адмін може оновлювати генератори',
    onlyAdminCanCreateGenerators: 'Тільки адмін може створювати генератори',
    onlyAdminCanDeleteGenerators: 'Тільки адмін може видаляти генератори',
    onlyAdminCanAssignUsers:
      'Тільки адмін може призначати користувачів до генераторів',
    onlyAdminCanUnassignUsers:
      'Тільки адмін може скасовувати призначення користувачів',
    onlyAdminCanInvite: 'Тільки адмін може запрошувати',
    onlyAdminCanCancelInvitations: 'Тільки адмін може скасовувати запрошення',
    onlyAdminCanRenameOrg: 'Тільки адмін може перейменовувати організацію',
    onlyAdminCanDeleteOrg: 'Тільки адмін може видаляти організацію',
    adminCannotLeave: 'Адмін не може покинути власну організацію',

    generatorAlreadyActive: 'Генератор вже має активну сесію',
    cannotDeleteActiveSession: 'Неможливо видалити активну сесію',
    sessionAlreadyStopped: 'Сесію вже зупинено',
    cannotEditActiveSession: 'Неможливо редагувати активну сесію',
    startBeforeEnd: 'Час початку має бути раніше часу завершення',
    endTimeInFuture: 'Час завершення не може бути в майбутньому',
    performedTimeInFuture: 'Час виконання не може бути в майбутньому',

    notMemberOfOrg: 'Не є учасником цієї організації',
    invitationAlreadySent: 'Запрошення на цей email вже надіслано',
    invitationNotForYou: 'Це запрошення не для вас',
    alreadyMember: 'Вже є учасником цієї організації',

    templateNotForGenerator: 'Шаблон не належить до цього генератора',
    hoursIntervalRequired:
      'Інтервал годин обов\u0027язковий для обраного типу тригера',
    calendarDaysRequired:
      'Календарні дні обов\u0027язкові для обраного типу тригера',
    userNotOrgMember: 'Користувач не є учасником цієї організації',
    userAlreadyAssigned: 'Користувача вже призначено до цього генератора',
    userNotAssigned: 'Користувача не призначено до цього генератора'
  },

  privacy: {
    title: 'Політика конфіденційності',
    subtitle: 'Svitlo \u2014 Відстеження та обслуговування генераторів',
    effectiveDate: 'Дата набуття чинності: {{date}}',
    intro:
      'Svitlo (\u201Cми\u201D, \u201Cнаш\u201D, \u201Cзастосунок\u201D) \u2014 це мобільний застосунок для відстеження використання та обслуговування електрогенераторів. Ця політика пояснює, які дані ми збираємо та як їх використовуємо.',
    whatWeCollectTitle: 'Що ми збираємо',
    whatWeCollectBody:
      'Коли ви входите через Apple, ми отримуємо ваше ім\u0027я та електронну адресу (або приватну адресу Apple, якщо ви вирішили приховати свою). Ми використовуємо цю інформацію виключно для створення та ідентифікації вашого облікового запису в застосунку.\n\nЗастосунок зберігає такі дані, які ви створюєте: організації, записи генераторів, журнали сесій (час початку/завершення), шаблони обслуговування та записи обслуговування. Ці дані зберігаються на вашому пристрої та синхронізуються з нашим сервером, щоб бути доступними на різних пристроях та для інших учасників вашої організації.',
    whatWeDoNotCollectTitle: 'Що ми НЕ збираємо',
    whatWeDoNotCollectBody:
      'Ми не збираємо аналітику, метрики використання, рекламні ідентифікатори, дані місцезнаходження чи будь-які дані датчиків пристрою. Ми не використовуємо сторонні аналітичні SDK або SDK відстеження. Ми не показуємо рекламу.',
    dataSharingTitle: 'Обмін даними',
    dataSharingBody:
      'Ми не продаємо, не здаємо в оренду та не передаємо ваші персональні дані третім особам. Дані генераторів та обслуговування доступні лише учасникам тієї ж організації в застосунку, як визначено адміністратором організації.',
    dataStorageTitle: 'Зберігання та безпека даних',
    dataStorageBody:
      'Ваші дані зберігаються локально на вашому пристрої за допомогою SQLite та синхронізуються з базою даних PostgreSQL, розміщеною на Neon (neon.tech). Дані під час передачі шифруються через HTTPS/TLS. Автентифікація здійснюється через сервіс Apple Sign in with Apple через наш сервер.',
    dataDeletionTitle: 'Видалення даних',
    dataDeletionBody:
      'Ви можете видалити свій обліковий запис та всі пов\u0027язані дані, зв\u0027язавшись з нами за адресою {{email}}. За запитом ми видалимо ваш обліковий запис та персональні дані з наших серверів протягом 30 днів.',
    childrenTitle: 'Конфіденційність дітей',
    childrenBody:
      'Svitlo не призначений для дітей віком до 13 років. Ми свідомо не збираємо дані від дітей.',
    changesTitle: 'Зміни до цієї політики',
    changesBody:
      'Ми можемо час від часу оновлювати цю політику. Оновлена версія буде розміщена за цією адресою з новою датою набуття чинності.',
    contactTitle: 'Контакти',
    contactBody:
      'Якщо у вас є запитання щодо цієї політики, зв\u0027яжіться з нами за адресою {{email}}.'
  },

  landing: {
    tagline:
      'Відстежуйте, обслуговуйте та керуйте вашими електрогенераторами \u2014 все в одному застосунку.',
    featuresTitle: 'Все, що потрібно',
    featuresSubtitle:
      'Від відстеження сесій до обслуговування на базі ШІ \u2014 все в одному місці.',
    feature1Title: 'Сесії в один дотик',
    feature1Desc:
      'Запускайте та зупиняйте сесії генераторів одним дотиком. Відстежуйте загальний час роботи автоматично.',
    feature2Title: 'Розумне обслуговування',
    feature2Desc:
      'Плануйте обслуговування за годинами роботи або календарними датами. Ніколи не пропускайте сервісний інтервал.',
    feature3Title: 'Пропозиції на базі ШІ',
    feature3Desc:
      'Отримуйте шаблони обслуговування, створені ШІ та адаптовані до типу та режиму використання вашого генератора.',
    feature4Title: 'Управління командою',
    feature4Desc:
      'Створюйте організації, запрошуйте учасників та контролюйте доступ за допомогою ролей.',
    feature5Title: 'Працює офлайн',
    feature5Desc:
      'Усі дані зберігаються локально та синхронізуються автоматично, коли ви знову онлайн.',
    feature6Title: 'Ліміти роботи та відпочинок',
    feature6Desc:
      'Встановлюйте максимальний час роботи та необхідні періоди відпочинку. Отримуйте попередження перед досягненням лімітів.',
    howItWorksTitle: 'Як це працює',
    step1Title: 'Додайте генератори',
    step1Desc:
      'Налаштуйте генератори з лімітами роботи, періодами відпочинку та графіками обслуговування.',
    step2Title: 'Відстежуйте сесії',
    step2Desc:
      'Запускайте та зупиняйте сесії для автоматичного обліку годин роботи.',
    step3Title: 'Дотримуйтесь графіку',
    step3Desc:
      'Отримуйте нагадування про обслуговування на основі годин або календарних інтервалів.',
    aiTitle: 'На базі ШІ',
    aiDesc:
      'Svitlo використовує ШІ для створення шаблонів обслуговування, адаптованих до марки, моделі та типу палива вашого генератора. Також допомагає швидше налаштовувати нові генератори, пропонуючи ліміти роботи та періоди відпочинку на основі рекомендацій виробника.',
    heroTitle: 'Тримайте енергію під контролем',
    learnMore: 'Дізнатися більше',
    stat1Label: 'Офлайн',
    stat1Desc: 'Працює без інтернету',
    stat2Label: 'ШІ',
    stat2Desc: 'Розумне обслуговування',
    stat3Label: 'Команда',
    stat3Desc: 'Багато користувачів',
    stat4Label: 'Реальний час',
    stat4Desc: 'Живе відстеження',
    useCasesTitle: 'Для будь-якого сценарію',
    useCasesSubtitle:
      'Від домашнього генератора до парку промислових установок.',
    useCase1Title: 'Будівельні майданчики',
    useCase1Desc:
      'Відстежуйте кілька генераторів на об\u0027єктах. Знайте, коли кожен потребує обслуговування.',
    useCase2Title: 'Сільське господарство',
    useCase2Desc:
      'Підтримуйте генератори для зрошення та фермерського обладнання в робочому стані.',
    useCase3Title: 'Дім та офіс',
    useCase3Desc:
      'Контролюйте резервне живлення та отримуйте нагадування до того, як знадобиться.',
    useCase4Title: 'Події та заходи',
    useCase4Desc:
      'Координуйте роботу генераторів на фестивалях, ринках та заходах під відкритим небом.',
    madeInUkraine: 'Зроблено в Україні',
    madeInUkraineDesc:
      'Народився з реального досвіду управління генераторами під час відключень електроенергії. Створений для надійності, коли це найважливіше.',
    free: 'Безкоштовно для початку.',
    copyright: '\u00A9 {{year}} Svitlo',
    ctaTitle: 'Готові почати?',
    ctaDesc:
      'Завантажте Svitlo та візьміть обслуговування генераторів під контроль вже сьогодні.',
    emailPlaceholder: 'Введіть вашу електронну пошту',
    notifyMe: 'Повідомити мене',
    waitlistSuccess:
      'Ви у списку! Ми надішлемо листа, коли Svitlo стане доступним.',
    waitlistErrorInvalid: 'Будь ласка, введіть дійсну електронну адресу.',
    waitlistErrorTooMany: 'Забагато спроб. Спробуйте пізніше.',
    waitlistErrorGeneric: 'Щось пішло не так. Спробуйте ще раз.',
    notifyMeSubmitting: 'Надсилаємо...',
    iosStatus: 'iOS — На розгляді в App Store',
    androidStatus: 'Android — Незабаром',
    screenshotHome: 'Головний екран додатку Svitlo з деталями генератора',
    screenshotRunning: 'Додаток Svitlo з активною сесією генератора',
    screenshotMembers: 'Додаток Svitlo з управлінням учасниками команди'
  },

  time: {
    h: 'год',
    m: 'хв'
  },

  formats: {
    dateTimeShort: 'd MMM, HH:mm'
  }
} as const satisfies TranslationSchema
