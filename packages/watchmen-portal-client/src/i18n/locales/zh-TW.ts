import type { TranslationKeys } from './en';

const zhTW: TranslationKeys = {
  portal: {
    title: 'Watchmen 資料平台',
    subtitle: '統一的資料治理與管理平台，賦能資料團隊從擷取、開發到分析的全鏈路協作',
    availableModules: '個可用模組',
    comingSoon: '即將上線',
    copyright: 'Watchmen 資料平台 v0.1.0',
    copyrightYear: '© {{year}} Watchmen 團隊',
  },
  module: {
    enter: '進入',
    available: '可用',
    comingSoon: '即將上線',
    stayTuned: '敬請期待',
    lastAccessed: '上次存取 {{time}}',
    noModules: '目前角色暫無可用模組',
    noModulesHint: '請聯絡管理員申請權限',
  },
  health: {
    available: '正常',
    degraded: '回應緩慢',
    unavailable: '不可用',
    checking: '偵測中...',
    unknown: '未知',
  },
  login: {
    title: '登入',
    dollHint: '使用 Watchmen 帳號登入',
    ssoHint: '使用企業身分提供者登入',
    username: '使用者名稱',
    password: '密碼',
    submitting: '登入中…',
    submit: '登入',
    continueWith: '使用 {{method}} 登入',
    errorDefault: '使用者名稱或密碼錯誤',
    signOut: '登出',
  },
  common: {
    dataPlatform: '資料平台',
    selectLanguage: '選擇語言',
  },
  lastAccessed: {
    justNow: '剛剛',
    minutesAgo: '{{count}}分鐘前',
    hoursAgo: '{{count}}小時前',
    daysAgo: '{{count}}天前',
  },
  modules: {
    admin: {
      title: '資料開發',
      subtitle: 'Web Client',
      description: '面向資料開發者 - 建構並管理資料管道、資料模型與資料資產',
    },
    ingest: {
      title: '資料擷取',
      subtitle: 'Ingest Client',
      description: '設定資料來源，管理擷取任務與資料存取流程',
    },
    analysis: {
      title: '資料分析',
      subtitle: 'Analysis Client',
      description: '探索資料，建構指標體系，建立視覺化分析',
    },
    ops: {
      title: '資料維運',
      subtitle: 'Monitor Client',
      description: '監控平台健康狀態，管理告警並實現維運自動化',
    },
  },
};

export default zhTW;
