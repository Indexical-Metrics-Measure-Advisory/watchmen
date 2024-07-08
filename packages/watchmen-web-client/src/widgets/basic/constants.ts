// the most important thing is keep z-index always be correct
import {
	faAngleLeft,
	faAngleRight,
	faArrowAltCircleDown,
	faArrowDown,
	faArrowRightLong,
	faArrowsDownToLine,
	faArrowsToDot,
	faArrowsTurnRight,
	faArrowTrendDown,
	faArrowTrendUp,
	faArrowUp,
	faBan,
	faBusinessTime,
	faCalendarPlus,
	faCaretDown,
	faChalkboard,
	faChalkboardTeacher,
	faChartBar,
	faChartColumn,
	faChartLine,
	faChartPie,
	faCheck,
	faCheckDouble,
	faCheckSquare,
	faCity,
	faClock,
	faCloudDownloadAlt,
	faCode,
	faCodeCommit,
	faCodeMerge,
	faCog,
	faCoins,
	faCommentDots,
	faCompass,
	faCompress,
	faCompressAlt,
	faCompressArrowsAlt,
	faDatabase,
	faDiceD20,
	faDna,
	faDraftingCompass,
	faDrawPolygon,
	faEdit,
	faEthernet,
	faExpand,
	faExpandArrowsAlt,
	faExternalLinkAlt,
	faExternalLinkSquareAlt,
	faFeather,
	faFeatherPointed,
	faFileExport,
	faFileImport,
	faFilter,
	faGauge,
	faGlobe,
	faGripVertical,
	faHandSparkles,
	faHighlighter,
	faHome,
	faIgloo,
	faIndustry,
	faLaptopHouse,
	faLayerGroup,
	faLevelDownAlt,
	faLevelUpAlt,
	faLink,
	faLock,
	faLockOpen,
	faLongArrowLeft,
	faLongArrowRight,
	faMagnifyingGlassChart,
	faMicroscope,
	faObjectGroup,
	faPaintRoller,
	faPalette,
	faPaperPlane,
	faParagraph,
	faPaste,
	faPercentage,
	faPlay,
	faPlus,
	faPowerOff,
	faPrint,
	faPuzzlePiece,
	faQuestionCircle,
	faRandom,
	faRankingStar,
	faRobot,
	faRulerCombined,
	faSave,
	faSearch,
	faShapes,
	faShare,
	faSliders,
	faSortAmountDown,
	faSortAmountUpAlt,
	faSpinner,
	faSquareRss,
	faStar,
	faStarOfLife,
	faStickyNote,
	faStoreAlt,
	faStream,
	faSyncAlt,
	faTable,
	faTags,
	faTenge,
	faTerminal,
	faTh,
	faThumbtack,
	faTimes,
	faTimesCircle,
	faToolbox,
	faTools,
	faTowerObservation,
	faTrashAlt,
	faUndoAlt,
	faUpload,
	faUser,
	faUsers,
	faWandMagic,
	faWandMagicSparkles,
	faWarehouse,
	faWaveSquare,
	faWind,
	faWindowMaximize,
	faWindowMinimize,
	faWindowRestore
} from '@fortawesome/free-solid-svg-icons';

export const TOOLTIP_Z_INDEX = 10000;
export const DIALOG_Z_INDEX = 99989;
export const ALERT_Z_INDEX = 99999;
export const FAVORITE_Z_INDEX = 1500;
export const PIN_FAVORITE_Z_INDEX = 1499;
export const DROPDOWN_Z_INDEX = 999;
export const SIDE_MENU_RESIZE_HANDLE_Z_INDEX = 500;
export const CHART_DRAG_Z_INDEX = 1000;
export const CHART_SETTINGS_RESIZE_HANDLE_Z_INDEX = 500;
export const REMOTE_REQUEST_INDEX = 99999;
export const HELP_Z_INDEX = 99979;

export const BASE_MARGIN = 32;
export const BASE_HEIGHT = 28;
export const BASE_TALL_HEIGHT = 32;
export const INPUT_INDENT = 10;
export const BUTTON_INDENT = 16;
export const BUTTON_HEIGHT_IN_FORM = 22;
export const CHECKBOX_SIZE = 22;
export const TOGGLE_HEIGHT = 22;
export const BORDER_WIDTH = 1;
export const HEADER_HEIGHT = 40;
export const GRID_ROW_HEIGHT = 36;
export const GRID_TALL_ROW_HEIGHT = 40;
export const PARAM_HEIGHT = 22;

export const SIDE_MENU_MIN_WIDTH = 51;
export const SIDE_MENU_MAX_WIDTH = 321;
export const SIDE_MENU_RESIZE_HANDLE_WIDTH = 6;

export const TOOLTIP_MAX_WIDTH = 320;
export const TOOLTIP_CARET_OFFSET = 6;

export const PIN_FAVORITE_HEIGHT = 'calc(var(--height) * 1.2 + 1px)';

export const CHART_SETTINGS_MIN_WIDTH = 350;
export const CHART_SETTINGS_MAX_WIDTH = 500;
export const CHART_SETTINGS_RESIZE_HANDLE_WIDTH = 6;

export const PAGE_HEADER_HEIGHT = 57;

// business related
export const TUPLE_SEARCH_PAGE_SIZE = 9;

// icons
export const ICON_SWITCH_WORKBENCH = faIgloo;
export const ICON_CONSOLE = faChalkboard;
export const ICON_ADMIN = faTools;
export const ICON_DQC = faCoins;
export const ICON_IDW = faBusinessTime;
export const ICON_HOME = faHome;
export const ICON_INDUSTRY = faIndustry;
export const ICON_LOGOUT = faPowerOff;

export const ICON_USER_GROUP = faUsers;
export const ICON_USER = faUser;
export const ICON_TENANT = faCity;
export const ICON_DATA_SOURCE = faDatabase;
export const ICON_EXTERNAL_WRITERS = faExternalLinkSquareAlt;
export const ICON_PLUGINS = faPuzzlePiece;
export const ICON_SPACE = faGlobe;
export const ICON_CONNECTION = faLink;
export const ICON_CONNECTED_SPACE = faDiceD20;
export const ICON_SUBJECT = faTable;
export const ICON_TOPIC = faTags;
export const ICON_TOPIC_PROFILE = faChartLine;
export const ICON_FACTOR = faCodeCommit;
export const ICON_ENUM = faStream;
export const ICON_REPORT = faChartBar;
export const ICON_PARAGRAPH = faParagraph;
export const ICON_REPORT_INDICATOR = faTenge;
export const ICON_REPORT_DIMENSION = faRulerCombined;
export const ICON_FILTER = faFilter;
export const ICON_BAN = faBan;
export const ICON_AS_ADMIN_HOME = faLaptopHouse;
export const ICON_PIPELINE = faWaveSquare;
export const ICON_STAGE = faObjectGroup;
export const ICON_UNIT = faFeather;
export const ICON_INDICATOR_MEASURE_METHOD = faCodeMerge;
export const ICON_BUCKET = faSliders;

export const ICON_DASHBOARD = faGauge;
export const ICON_FAVORITE = faStar;
export const ICON_TEMPLATE = faPaste;
export const ICON_MONITOR_LOGS = faEthernet;
export const ICON_PIPELINE_DEBUG = faDraftingCompass;
export const ICON_TOOLBOX = faToolbox;

export const ICON_CONSANGUINITY = faDna;
export const ICON_CATALOG = faWarehouse;
export const ICON_RULE_DEFINE = faRobot;
export const ICON_STATISTICS = faCompass;
export const ICON_END_USER = faChalkboardTeacher;

export const ICON_BUCKETS = faShapes;
export const ICON_INDICATOR = faMagnifyingGlassChart;
export const ICON_INSPECTION = faMicroscope;
export const ICON_ACHIEVEMENT = faRankingStar;
export const ICON_TIME_GROUPING = faClock;
export const ICON_BUCKET_ON = faShapes;
export const ICON_CHART_BAR = faChartColumn;
export const ICON_CHART_LINE = faChartLine;
export const ICON_CHART_PIE = faChartPie;
export const ICON_CHART_GROWTH_OF_TIME_GROUPING = faArrowTrendUp;
export const ICON_OBJECTIVE_ANALYSIS = faTowerObservation;
export const ICON_OBJECTIVE = faTowerObservation;
export const ICON_OBJECTIVE_ANALYSIS_DESC = faArrowsDownToLine;
export const ICON_OBJECTIVE_ANALYSIS_PERSPECTIVE = faArrowsTurnRight;
export const ICON_DERIVED_OBJECTIVE = faTowerObservation;
export const ICON_CONVERGENCE = faArrowsToDot;

export const ICON_CREATED_AT = faCalendarPlus;
export const ICON_LAST_MODIFIED_AT = faHighlighter;

// icons for doing something
export const ICON_ADD = faPlus;
export const ICON_EDIT = faEdit;
export const ICON_DISCARD = faBan;
export const ICON_DELETE = faTimes;
export const ICON_CONFIRM = faCheck;
export const ICON_THROW_AWAY = faTrashAlt;
export const ICON_IMPORT = faFileImport;
export const ICON_EXPORT = faFileExport;
export const ICON_SETTINGS = faCog;
export const ICON_SEARCH = faSearch;
export const ICON_SELECTED = faCheck;
export const ICON_LOADING = faSpinner;
export const ICON_PIN = faThumbtack;
export const ICON_SORT = faSortAmountDown;
export const ICON_DROPDOWN = faCaretDown;
export const ICON_COLLAPSE_PANEL = faCompress;
export const ICON_EXPAND_PANEL = faExpand;
export const ICON_SHARE = faShare;
export const ICON_SWITCH = faRandom;
export const ICON_PRINT = faPrint;
export const ICON_PAGE_SIZE = faStickyNote;
export const ICON_CONNECTED_SPACE_CATALOG = faDrawPolygon;
export const ICON_SUBJECT_DEF = faLayerGroup;
export const ICON_SUBJECT_DATA = faTh;
export const ICON_SUBJECT_REPORT = faChartPie;
export const ICON_REPORT_DATA = faTh;
export const ICON_PALETTE = faPalette;
export const ICON_UPLOAD = faUpload;
export const ICON_ROW_PREPEND_ON_RIGHT = faLevelUpAlt;
export const ICON_CLOSE = faTimes;
export const ICON_DOWNLOAD_PAGE = faArrowAltCircleDown;
export const ICON_DOWNLOAD = faCloudDownloadAlt;
export const ICON_PIPELINES_CATALOG = faWaveSquare;
export const ICON_COLLAPSE_CONTENT = faCompressArrowsAlt;
export const ICON_EXPAND_CONTENT = faExpandArrowsAlt;
export const ICON_PREVIOUS_PAGE = faAngleLeft;
export const ICON_NEXT_PAGE = faAngleRight;
export const ICON_COMPRESS_COLUMNS = faCompressAlt;
export const ICON_FIX_COLUMN = faLock;
export const ICON_UNFIX_COLUMN = faLockOpen;
export const ICON_SORT_ASC = faSortAmountUpAlt;
export const ICON_SORT_DESC = faSortAmountDown;
export const ICON_SAVE = faSave;
export const ICON_DISABLE = faTimesCircle;
export const ICON_ENABLE = faCheckSquare;
export const ICON_MOVE_DOWN = faArrowDown;
export const ICON_MOVE_UP = faArrowUp;
export const ICON_DSL = faCode;
export const ICON_PREPEND = faLevelUpAlt;
export const ICON_APPEND = faLevelDownAlt;
export const ICON_DRAG_HANDLE = faGripVertical;
export const ICON_CHECK = faCheck;
export const ICON_CHECK_ALL = faCheckDouble;
export const ICON_UNCHECK = faTimes;
export const ICON_BACK = faShare;
export const ICON_REFRESH = faSyncAlt;
export const ICON_AUTO_REFRESH = faClock;
export const ICON_FREE_WALK = faWind;
export const ICON_LOOP = faUndoAlt;
export const ICON_PLAY = faPlay;
export const ICON_SEND = faPaperPlane;
export const ICON_HELP = faQuestionCircle;
export const ICON_CLEAR_SCREEN = faHandSparkles;
export const ICON_MINIMIZE_PANEL = faWindowMinimize;
export const ICON_MAXIMIZE_PANEL = faWindowMaximize;
export const ICON_RESTORE_PANEL = faWindowRestore;
export const ICON_WAIT_INPUT = faFeatherPointed;
export const ICON_LIST_ICON_ASTERISK = faStarOfLife;
export const ICON_USE_INDICATOR = faHighlighter;
export const ICON_EXPAND_NODES = faPlus;
export const ICON_EXTERNAL_LINK = faExternalLinkAlt;
export const ICON_RENDERER = faPaintRoller;
export const ICON_SUBSCRIBE = faSquareRss;
export const ICON_COPY_TO_LEFT = faLongArrowLeft;
export const ICON_COPY_TO_RIGHT = faLongArrowRight;

export const ICON_COMMENTS = faCommentDots;
export const ICON_CMD_PROMPT = faTerminal;
export const ICON_LOCK = faLockOpen;
export const ICON_UNLOCK = faLock;
export const ICON_PERCENTAGE = faPercentage;
export const ICON_QUESTION_MARK = faQuestionCircle;

export const ICON_VOLUME_INCREASE = faArrowTrendUp;
export const ICON_VOLUME_DECREASE = faArrowTrendDown;
export const ICON_VOLUME_NO_CHANGE = faArrowRightLong;
export const ICON_VARIABLES = faSliders;

// mock data
export const MOCK_ACCOUNT_NAME = 'Dr. X';
export const ICON_SHORE = faStoreAlt;
export const ICON_MAGIC = faWandMagic;
export const ICON_MAGIC_SPARKLES = faWandMagicSparkles;
