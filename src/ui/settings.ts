// 設定（音效、震動）跟存檔分開放，清掉進度也不會被重設。

const KEY = 'zizhen.settings.v1';

export interface Settings {
  sound: boolean;
  vibrate: boolean;
}

const DEFAULTS: Settings = { sound: true, vibrate: true };

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // 存不了就算了
  }
}
