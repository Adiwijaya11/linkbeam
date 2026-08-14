export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface DeviceInfo {
  id: string;
  name: string;
  type: DeviceType;
  joinedAt: number;
  lastSeen: number;
}

/** Generate or retrieve a stable unique ID for this browser session */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('linkbeam_device_id');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('linkbeam_device_id', id);
  }
  return id;
}

/** Detect device type from user agent */
export function getDeviceType(): DeviceType {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) return 'mobile';
  return 'desktop';
}

/** Build a human-readable device name */
export function getDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Unknown Device';
  const ua = navigator.userAgent;

  // OS
  let os = 'Unknown OS';
  if (/windows nt/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'Mac';
  else if (/iphone/i.test(ua)) os = 'iPhone';
  else if (/ipad/i.test(ua)) os = 'iPad';
  else if (/android/i.test(ua)) {
    const match = ua.match(/android\s[\d.]+;\s([^)]+)\)/i);
    os = match ? match[1].trim() : 'Android';
  } else if (/linux/i.test(ua)) os = 'Linux';

  // Browser
  let browser = 'Browser';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/chrome/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua)) browser = 'Safari';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/opr\//i.test(ua)) browser = 'Opera';

  return `${os} · ${browser}`;
}
