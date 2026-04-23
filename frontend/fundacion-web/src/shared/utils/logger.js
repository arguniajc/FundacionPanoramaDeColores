const IS_DEV = import.meta.env.DEV;

const COLORS = {
  info:    '#2196F3',
  success: '#4CAF50',
  warn:    '#FF9800',
  error:   '#F44336',
  api:     '#9C27B0',
  react:   '#E91E63',
};

function print(level, color, label, ...args) {
  if (!IS_DEV && level !== 'error' && level !== 'warn') return;
  const style = `color:${color};font-weight:700`;
  console[level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'log'](
    `%c[${label}]`, style, ...args
  );
}

const logger = {
  info:    (...args) => print('info',    COLORS.info,    'INFO',    ...args),
  success: (...args) => print('info',    COLORS.success, 'OK',      ...args),
  warn:    (...args) => print('warn',    COLORS.warn,    'WARN',    ...args),
  error:   (...args) => print('error',   COLORS.error,   'ERROR',   ...args),

  api: {
    request(method, url, data) {
      if (!IS_DEV) return;
      console.groupCollapsed(`%c[API →] ${method.toUpperCase()} ${url}`, `color:${COLORS.api};font-weight:700`);
      if (data) console.log('body:', data);
      console.groupEnd();
    },
    response(method, url, status, data) {
      if (!IS_DEV) return;
      const ok = status < 400;
      const color = ok ? COLORS.success : COLORS.error;
      console.groupCollapsed(`%c[API ←] ${status} ${method.toUpperCase()} ${url}`, `color:${color};font-weight:700`);
      console.log('response:', data);
      console.groupEnd();
    },
    error(method, url, status, data, message) {
      const color = COLORS.error;
      console.group(`%c[API ✗] ${status ?? 'NET'} ${method?.toUpperCase()} ${url}`, `color:${color};font-weight:700`);
      console.error('message:', message);
      if (data) console.error('response:', data);
      console.groupEnd();
    },
  },

  react: {
    error(error, info) {
      console.group(`%c[REACT ERROR]`, `color:${COLORS.react};font-weight:700`);
      console.error(error);
      if (info?.componentStack) console.error('component stack:', info.componentStack);
      console.groupEnd();
    },
  },
};

export default logger;
