import type { TranslationKeys } from './en';

const zh: TranslationKeys = {
  portal: {
    title: 'Watchmen 数据平台',
    subtitle: '统一的数据治理与管理平台，赋能数据团队从采集、开发到分析的全链路协作',
    availableModules: '个可用模块',
    comingSoon: '即将上线',
    copyright: 'Watchmen 数据平台 v0.1.0',
    copyrightYear: '© {{year}} Watchmen 团队',
  },
  module: {
    enter: '进入',
    available: '可用',
    comingSoon: '即将上线',
    stayTuned: '敬请期待',
    lastAccessed: '上次访问 {{time}}',
    noModules: '当前角色暂无可用模块',
    noModulesHint: '请联系管理员申请权限',
  },
  health: {
    available: '正常',
    degraded: '响应缓慢',
    unavailable: '不可用',
    checking: '检测中...',
    unknown: '未知',
  },
  login: {
    title: '登录',
    dollHint: '使用 Watchmen 账号登录',
    ssoHint: '使用企业身份提供商登录',
    username: '用户名',
    password: '密码',
    submitting: '登录中…',
    submit: '登录',
    continueWith: '使用 {{method}} 登录',
    errorDefault: '用户名或密码错误',
    signOut: '退出登录',
  },
  common: {
    dataPlatform: '数据平台',
  },
};

export default zh;
