export const en = {
  common: {
    cancel: 'Cancel',
    delete: 'Delete',
    remove: 'Remove',
    error: 'Error',
    optional: 'Optional',
    loading: 'Loading...',
    unknown: 'Unknown',
    start: 'Start',
    stop: 'Stop',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    ok: 'OK',
    actions: 'Actions',
    close: 'Close',
    submit: 'Submit',
    menu: 'Menu',
    language: 'Language'
  },

  tabs: {
    home: 'Home',
    maintenance: 'Maintenance',
    activity: 'Activity',
    members: 'Members'
  },

  drawer: {
    organization: 'Organization',
    createOrganization: 'Create Organization',
    invitations: 'Invitations',
    invitedBy: 'Invited by {{name}}',
    rename: 'Rename',
    delete: 'Delete',
    leave: 'Leave',
    deviceLanguage: 'Device Language',
    menuWithInvitations_one: 'Menu, 1 pending invitation',
    menuWithInvitations_other: 'Menu, {{count}} pending invitations'
  },

  generatorStatus: {
    running: 'Running',
    resting: 'Resting',
    available: 'Available'
  },

  home: {
    noOrganizations: 'No Organizations',
    noOrganizationsDesc:
      'Create an organization or accept an invitation to get started.',
    goToMembers: 'Go to Members',
    noGenerators: 'No Generators',
    noGeneratorsAdminDesc: 'Add your first generator to start tracking.',
    noGeneratorsDesc: 'No generators assigned to you yet.',
    addGenerator: 'Add Generator',
    add: 'Add',
    myActiveSession: 'My Active Session',
    stopGenerator: 'Stop Generator'
  },

  activity: {
    noActivity: 'No Activity',
    noActivityDesc:
      'Activity from generator runs and maintenance will appear here.',
    active: 'Active',
    run: 'Run',
    maintenance: 'Maintenance',
    inProgress: 'In progress',
    noActivityRecorded: 'No activity recorded',
    session: 'Session',
    viewAll: 'View All',
    recentActivity: 'Recent Activity',
    unknownGenerator: 'Unknown generator',
    unknownTask: 'Unknown task'
  },

  filters: {
    all: 'All',
    sessions: 'Runs',
    maintenance: 'Maintenance'
  },

  maintenanceTab: {
    noMaintenance: 'No Maintenance',
    noMaintenanceDesc:
      'Add maintenance templates to your generators to track service schedules.',
    overdue: 'Overdue',
    dueSoon: 'Due Soon',
    upcoming: 'Upcoming',
    record: 'Record',
    unknownGenerator: 'Unknown generator'
  },

  members: {
    searchMembers: 'Search members',
    noResults: 'No results for "{{query}}"',
    members: 'Members',
    membersCount: 'Members ({{count}})',
    noMatchingMembers: 'No matching members',
    noMembersYet: 'No members yet',
    admin: 'Admin',
    you: 'You',
    pendingInvitations: 'Pending Invitations',
    removeMember: 'Remove Member',
    removeMemberDesc:
      'This will remove the member and reassign their generators to you.'
  },

  generator: {
    newGenerator: 'New Generator',
    addDesc: 'Add a generator to start tracking its usage and maintenance.',
    title: 'Title',
    titlePlaceholder: 'e.g. "Back Yard Generator"',
    model: 'Model',
    modelPlaceholder: 'e.g. "Honda EU2200i"',
    description: 'Description',
    descriptionPlaceholder: 'Location, serial number, notes...',
    titleRequired: 'Title is required',
    modelRequired: 'Model is required',

    generatorDetails: 'Generator Details',
    back: 'Back',
    configureDesc: '{{model}} \u2014 configure specs and maintenance schedule.',
    autoFillAI: 'Auto-fill with AI',
    autoFillAIDesc:
      'Research your generator model and suggest specs and maintenance tasks automatically.',
    enterManually: 'Enter manually',
    enterManuallyDesc: 'Set up generator specs and maintenance tasks yourself.',
    researching: 'Researching {{model}}...',
    maxRunHours: 'Max Run Hours',
    restHours: 'Rest Hours',
    warningThresholdPct: 'Warning Threshold %',
    warningThresholdDesc: 'Warning appears at this percentage of max run hours',
    maintenanceTasks: 'Maintenance Tasks',
    addMaintenanceTask: 'Add Maintenance Task',

    settings: 'Settings',
    generatorTitle: 'Generator title',
    generatorModel: 'Generator model',
    deleteGenerator: 'Delete Generator',
    deleteGeneratorConfirm:
      'Are you sure you want to delete "{{title}}"? This cannot be undone.',
    unassign: 'Unassign',
    unassignConfirm: 'Remove this user from this generator?',

    lifetimeHours: '{{hours}} lifetime hours',
    readyToRun: 'Tap to start',
    startGenerator: 'Start Generator',
    stopGenerator: 'Stop Generator',
    elapsed: '{{hours}} elapsed',
    max: '{{hours}} max',
    rested: '{{hours}} rested',
    required: '{{hours}} required',
    remaining: '{{time}} remaining',
    total: '{{hours}} total',
    rests: 'rests {{time}}',
    overdue: 'overdue',

    deleteRun: 'Delete Run',
    deleteRunConfirm: 'Are you sure you want to delete this run?',
    deleteRecord: 'Delete Record',
    deleteRecordConfirm:
      'Are you sure you want to delete this maintenance record?',

    generatorIsResting: 'Generator is Resting',
    restingStartWarning:
      "It's recommended to let the generator rest before starting again. Starting now may reduce its lifespan.",
    startAnyway: 'Start Anyway',

    logSessionDesc:
      'Retroactively record a generator run by specifying the start and end times.',
    startTime: 'Start Time',
    endTime: 'End Time'
  },

  maintenanceTemplate: {
    defineDesc: 'Define a recurring maintenance task for this generator.',
    taskName: 'Task Name',
    taskNamePlaceholder: 'e.g. "Oil Change", "Air Filter"',
    instructionsPlaceholder: 'Instructions or notes...',
    triggerType: 'Trigger Type',
    byHours: 'By Hours',
    byCalendar: 'By Calendar',
    whicheverFirst: 'Whichever First',
    hoursInterval: 'Hours Interval',
    hoursIntervalPlaceholder: 'e.g. 100',
    hoursIntervalDesc: 'Maintenance due after this many run hours',
    calendarDays: 'Calendar Days',
    calendarDaysPlaceholder: 'e.g. 30',
    calendarDaysDesc: 'Maintenance due after this many days',
    hours: 'Hours',
    calendar: 'Calendar',
    first: 'First',
    runHoursBetween: 'Run hours between maintenance',
    daysBetween: 'Days between maintenance',
    oneTimeTask: 'One-time task',
    noTemplates: 'No maintenance templates',
    neverPerformed: 'Never performed',
    onceAtHours: 'Once at {{hours}}h',
    onceAtDays: 'Once at {{days}} days',
    onceAtBoth: 'Once at {{hours}}h or {{days}} days',
    everyHours: 'Every {{hours}}h',
    everyDays: 'Every {{days}} days',
    everyBoth: '{{hours}}h or {{days}} days',
    last: 'Last: {{date}}'
  },

  maintenanceRecord: {
    logDesc: 'Log that this maintenance work has been completed.',
    notes: 'Notes',
    notesPlaceholder: 'Any observations or details...'
  },

  aiSuggestions: {
    sources: 'Sources',
    offline: 'Offline',
    offlineDesc: 'Internet connection is required for AI suggestions.',
    failedToGet: 'Failed to get suggestions',
    genericWarning:
      "This is a generic maintenance template. Verify the values against your generator's documentation."
  },

  organization: {
    createDesc: 'Create an organization to start managing generators.',
    organizationName: 'Organization Name',
    namePlaceholder: 'e.g. My Workshop',
    renameDesc: 'Change the name of your organization.',
    inviteDesc: 'Enter the email address of the person you want to invite.',
    emailAddress: 'Email Address',
    emailPlaceholder: 'employee@example.com',
    inviteHint: 'The invitation will appear when they sign in with this email',
    deleteOrg: 'Delete Organization',
    deleteOrgDesc:
      'This will permanently delete all generators, runs, maintenance records, and member associations. This action cannot be undone.',
    typeToConfirm: 'Type \u201c{{name}}\u201d to confirm',
    nameDoesNotMatch: 'Name does not match',
    orgDeleted: '"{{name}}" deleted',
    leaveOrg: 'Leave Organization',
    leaveOrgDesc:
      'You will be unassigned from all generators in \u201c{{name}}\u201d. To rejoin, an admin will need to invite you again.',
    leftOrg: 'Left "{{name}}"',
    orgInvitation: 'Organization Invitation',
    invitedToJoin: '{{inviter}} invited you to join {{org}}',
    decline: 'Decline',
    accept: 'Accept'
  },

  auth: {
    welcome: 'Welcome to Svitlo',
    welcomeDesc: 'Sign in with your Apple ID to get started.',
    privacyPolicy: 'Privacy Policy',
    agreeToPolicy: 'By continuing, you agree to the',
    useEmailInstead: 'Use email instead',
    createAccount: 'Create account',
    signInWithEmail: 'Sign in with email',
    name: 'Name',
    namePlaceholder: 'Your name',
    email: 'Email',
    emailPlaceholder: 'you@example.com',
    password: 'Password',
    createPassword: 'Create a password',
    enterPassword: 'Enter your password',
    passwordHint: 'At least 8 characters',
    confirmPassword: 'Confirm Password',
    confirmPasswordPlaceholder: 'Confirm your password',
    creatingAccount: 'Creating account...',
    signingIn: 'Signing in...',
    signIn: 'Sign in',
    signUp: 'Sign up',
    alreadyHaveAccount: 'Already have an account? ',
    dontHaveAccount: "Don't have an account? ",
    somethingWentWrong: 'Something went wrong',
    sessionExpired: 'Session expired',
    sessionExpiredDesc:
      'Sign in again to resume syncing your data. Your local data is safe and will not be lost.',
    signedInWithEmail: 'Signed in with email?',
    notNow: 'Not now',
    differentAccount: 'Different account detected',
    differentAccountDesc:
      'You signed in with a different account than the one stored on this device. To switch accounts, please sign out first. Your current sign-in has been cancelled.'
  },

  sync: {
    changesNotSynced_one: '1 change could not be synced',
    changesNotSynced_other: '{{count}} changes could not be synced',
    syncError: 'Sync error',
    syncingChanges: 'Syncing changes\u2026',
    sessionExpired: 'Session expired',
    offline: 'Offline \u2014 changes saved locally',
    connecting: 'Connecting\u2026',
    allSynced: 'All changes synced',
    expiredWithChanges_one:
      'Session expired \u2014 1 change waiting to sync. Your data is safe.',
    expiredWithChanges_other:
      'Session expired \u2014 {{count}} changes waiting to sync. Your data is safe.',
    expiredNoChanges: 'Session expired \u2014 sign in to resume syncing.',
    dismiss: 'Dismiss'
  },

  update: {
    available: 'Update Available',
    restartDesc: 'Restart to get the latest version',
    restart: 'Restart'
  },

  employees: {
    assignedEmployees: 'Assigned Employees',
    noEmployeesAssigned: 'No employees assigned'
  },

  scope: {
    filter: 'Filter',
    organization: 'Organization',
    myGenerators: 'My Generators',
    generator: 'Generator'
  },

  edit: {
    startTime: 'Start Time',
    endTime: 'End Time',
    performedAt: 'Performed At',
    notes: 'Notes',
    optionalNotes: 'Optional notes...'
  },

  validation: {
    enterEmail: 'Please enter your email',
    validEmail: 'Please enter a valid email',
    enterPassword: 'Please enter your password',
    enterName: 'Please enter your name',
    passwordMinLength: 'Password must be at least 8 characters',
    passwordsDoNotMatch: 'Passwords do not match',
    mustBeValidEmail: 'Must be a valid email address',
    minPercent: 'Must be at least 1%',
    maxPercent: 'Must be at most 100%',
    required: 'Required for the selected trigger type',
    atLeastOneField: 'At least one field must be provided',
    mustNotBeEmpty: 'Must not be empty',
    mustBePositive: 'Must be greater than 0',
    mustBePositiveInt: 'Must be a positive integer'
  },

  due: {
    overdueHours: '{{hours}} overdue',
    overdueDays: '{{days}}d overdue',
    overdue: 'overdue',
    inHours: 'in {{hours}}',
    inDays: 'in {{days}}d'
  },

  screens: {
    logPastRun: 'Log Past Run',
    newTask: 'New Task',
    recordMaintenance: 'Record Maintenance',
    editRun: 'Edit Run',
    editMaintenance: 'Edit Maintenance',
    newOrganization: 'New Organization',
    inviteMember: 'Invite Member',
    renameOrganization: 'Rename Organization'
  },

  invitations: {
    new_one: 'New Invitation',
    new_other: '{{count}} New Invitations',
    pending_one: 'You have a pending organization invitation',
    pending_other: 'You have {{count}} pending organization invitations',
    view: 'View'
  },

  signOut: {
    unsyncedChanges: 'Unsynced changes',
    unsyncedDesc_one:
      "You have 1 change that hasn't been synced yet. Signing out will permanently delete it. Sign in again first to sync your data.",
    unsyncedDesc_other:
      "You have {{count}} changes that haven't been synced yet. Signing out will permanently delete them. Sign in again first to sync your data.",
    signOutAnyway: 'Sign out anyway'
  },

  errors: {
    generatorNotFound: 'Generator not found',
    sessionNotFound: 'Session not found',
    memberNotFound: 'Member not found',
    organizationNotFound: 'Organization not found',
    templateNotFound: 'Template not found',
    recordNotFound: 'Record not found',
    invitationNotFound: 'Invitation not found',
    maintenanceTemplateNotFound: 'Maintenance template not found',

    notAuthorizedForGenerator: 'Not authorized for this generator',
    onlyAdminCanRemoveMembers: 'Only admin can remove members',
    onlyAdminCanCreateTemplates: 'Only admin can create maintenance templates',
    onlyAdminCanUpdateTemplates: 'Only admin can update maintenance templates',
    onlyAdminCanDeleteTemplates: 'Only admin can delete maintenance templates',
    onlyAdminCanUpdateGenerators: 'Only admin can update generators',
    onlyAdminCanCreateGenerators: 'Only admin can create generators',
    onlyAdminCanDeleteGenerators: 'Only admin can delete generators',
    onlyAdminCanAssignUsers: 'Only admin can assign users to generators',
    onlyAdminCanUnassignUsers: 'Only admin can unassign users from generators',
    onlyAdminCanInvite: 'Only admin can invite',
    onlyAdminCanCancelInvitations: 'Only admin can cancel invitations',
    onlyAdminCanRenameOrg: 'Only admin can rename organization',
    onlyAdminCanDeleteOrg: 'Only admin can delete organization',
    adminCannotLeave: 'Admin cannot leave their own organization',

    generatorAlreadyActive: 'Generator already has an active session',
    cannotDeleteActiveSession: 'Cannot delete an in-progress session',
    sessionAlreadyStopped: 'Session is already stopped',
    cannotEditActiveSession: 'Cannot edit an in-progress session',
    startBeforeEnd: 'Start time must be before end time',
    endTimeInFuture: 'End time cannot be in the future',
    performedTimeInFuture: 'Performed time cannot be in the future',

    notMemberOfOrg: 'Not a member of this organization',
    invitationAlreadySent: 'Invitation already sent to this email',
    invitationNotForYou: 'This invitation is not for you',
    alreadyMember: 'Already a member of this organization',

    templateNotForGenerator: 'Template does not belong to this generator',
    hoursIntervalRequired: 'Hours interval required for this trigger type',
    calendarDaysRequired: 'Calendar days required for this trigger type',
    userNotOrgMember: 'User is not a member of this organization',
    userAlreadyAssigned: 'User is already assigned to this generator',
    userNotAssigned: 'User is not assigned to this generator'
  },

  privacy: {
    title: 'Privacy Policy',
    subtitle: 'Svitlo \u2014 Generator Tracking & Maintenance',
    effectiveDate: 'Effective date: {{date}}',
    intro:
      'Svitlo (\u201Cwe\u201D, \u201Cour\u201D, \u201Cthe app\u201D) is a mobile application for tracking power generator usage and maintenance. This policy explains what data we collect and how we use it.',
    whatWeCollectTitle: 'What We Collect',
    whatWeCollectBody:
      'When you sign in with Apple, we receive your name and email address (or Apple\u2019s private relay email if you choose to hide your address). We use this information solely to create and identify your account within the app.\n\nThe app stores the following data that you create: organizations, generator records, session logs (start/stop times), maintenance templates, and maintenance records. This data is stored on your device and synchronized to our server so it is available across devices and to other members of your organization.',
    whatWeDoNotCollectTitle: 'What We Do NOT Collect',
    whatWeDoNotCollectBody:
      'We do not collect analytics, usage metrics, advertising identifiers, location data, or any device sensor data. We do not use any third-party analytics or tracking SDKs. We do not display advertisements.',
    dataSharingTitle: 'Data Sharing',
    dataSharingBody:
      'We do not sell, rent, or share your personal data with any third party. Your generator and maintenance data is visible only to members of the same organization within the app, as determined by the organization administrator.',
    dataStorageTitle: 'Data Storage & Security',
    dataStorageBody:
      'Your data is stored locally on your device using SQLite and synchronized to a PostgreSQL database hosted by Neon (neon.tech). Data in transit is encrypted via HTTPS/TLS. Authentication is handled through Apple\u2019s Sign in with Apple service via our server.',
    dataDeletionTitle: 'Data Deletion',
    dataDeletionBody:
      'You may delete your account and all associated data by contacting us at {{email}}. Upon request, we will delete your account and personal data from our servers within 30 days.',
    childrenTitle: "Children's Privacy",
    childrenBody:
      'Svitlo is not directed at children under 13. We do not knowingly collect data from children.',
    changesTitle: 'Changes to This Policy',
    changesBody:
      'We may update this policy from time to time. The updated version will be posted at this URL with a new effective date.',
    contactTitle: 'Contact',
    contactBody:
      'If you have questions about this policy, contact us at {{email}}.'
  },

  landing: {
    tagline:
      'Track, maintain, and manage your power generators \u2014 all from one app.',
    featuresTitle: 'Everything You Need',
    featuresSubtitle:
      'From session tracking to AI-powered maintenance \u2014 all in one place.',
    feature1Title: 'One-Tap Sessions',
    feature1Desc:
      'Start and stop generator sessions with one tap. Track total runtime automatically.',
    feature2Title: 'Smart Maintenance',
    feature2Desc:
      'Schedule maintenance by runtime hours or calendar dates. Never miss a service interval.',
    feature3Title: 'AI-Powered Suggestions',
    feature3Desc:
      'Get AI-generated maintenance templates tailored to your generator type and usage patterns.',
    feature4Title: 'Team Management',
    feature4Desc:
      'Create organizations, invite team members, and control access with role-based permissions.',
    feature5Title: 'Works Offline',
    feature5Desc:
      'All data is stored locally and syncs automatically when you\u2019re back online.',
    feature6Title: 'Run Limits & Rest',
    feature6Desc:
      'Set maximum run times and required rest periods. Get warned before limits are reached.',
    howItWorksTitle: 'How It Works',
    step1Title: 'Add Your Generators',
    step1Desc:
      'Set up generators with run limits, rest periods, and maintenance schedules.',
    step2Title: 'Track Sessions',
    step2Desc: 'Start and stop sessions to log runtime hours automatically.',
    step3Title: 'Stay on Schedule',
    step3Desc:
      'Get maintenance reminders based on hours or calendar intervals.',
    aiTitle: 'Powered by AI',
    aiDesc:
      'Svitlo uses AI to generate maintenance templates tailored to your generator\u2019s make, model, and fuel type. It also helps you set up new generators faster by suggesting run limits and rest periods based on manufacturer recommendations.',
    heroTitle: 'Keep the Power Running',
    learnMore: 'Learn More',
    stat1Label: 'Offline-First',
    stat1Desc: 'Works without internet',
    stat2Label: 'AI-Powered',
    stat2Desc: 'Smart maintenance',
    stat3Label: 'Team Ready',
    stat3Desc: 'Multi-user access',
    stat4Label: 'Real-Time',
    stat4Desc: 'Live session tracking',
    useCasesTitle: 'Built for Every Scenario',
    useCasesSubtitle:
      'From a single home backup to a fleet of industrial generators.',
    useCase1Title: 'Construction Sites',
    useCase1Desc:
      'Track multiple generators across job sites. Know exactly when each unit needs service.',
    useCase2Title: 'Agriculture & Farms',
    useCase2Desc:
      'Keep irrigation and farm equipment generators running reliably through every season.',
    useCase3Title: 'Homes & Offices',
    useCase3Desc:
      'Monitor your backup power and get maintenance alerts before outages strike.',
    useCase4Title: 'Events & Venues',
    useCase4Desc:
      'Coordinate generator operations for festivals, markets, and outdoor events.',
    madeInUkraine: 'Made in Ukraine',
    madeInUkraineDesc:
      'Born from real experience managing generators during power outages. Built for reliability when it matters most.',
    free: 'Free to get started.',
    copyright: '\u00A9 {{year}} Svitlo',
    ctaTitle: 'Ready to Get Started?',
    ctaDesc:
      'Download Svitlo and take control of your generator maintenance today.',
    emailPlaceholder: 'Enter your email',
    notifyMe: 'Notify Me',
    waitlistSuccess:
      "You're on the list! We'll email you when Svitlo is available.",
    waitlistErrorInvalid: 'Please enter a valid email address.',
    waitlistErrorTooMany: 'Too many attempts. Please try again later.',
    waitlistErrorGeneric: 'Something went wrong. Please try again.',
    notifyMeSubmitting: 'Sending...',
    iosStatus: 'iOS — In App Review',
    androidStatus: 'Android — Coming Soon'
  },

  time: {
    h: 'h',
    m: 'm'
  },

  formats: {
    dateTimeShort: 'MMM d, HH:mm'
  }
} as const
