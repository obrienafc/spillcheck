// Every icon in the app comes from Lucide, drawn at one stroke weight.
import {
  Activity,
  AppWindow,
  Ban,
  ChartColumn,
  ChartPie,
  CircleAlert,
  CircleHelp,
  Clock,
  Cookie,
  CreditCard,
  FileCode,
  Globe,
  Hourglass,
  Link2,
  Lock,
  type LucideIcon,
  Megaphone,
  MessageCircle,
  Repeat,
  Server,
  Share2,
  ShieldCheck,
  Tags,
  TriangleAlert,
  Type,
  Video,
  WifiOff,
} from 'lucide-react';
import type { Category } from '@/lib/categories';
import type { ErrorCode } from '@/lib/safe-fetch';

export const STROKE = 1.75;

export const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  risk: TriangleAlert,
  advertising: Megaphone,
  'session-replay': Video,
  analytics: ChartColumn,
  'private-analytics': ChartPie,
  'tag-manager': Tags,
  social: Share2,
  embeds: AppWindow,
  fonts: Type,
  'private-fonts': Type,
  support: MessageCircle,
  consent: Cookie,
  security: ShieldCheck,
  monitoring: Activity,
  payments: CreditCard,
  cdn: Globe,
  hosting: Server,
  related: Link2,
  unknown: CircleHelp,
};

export type ClientErrorCode = ErrorCode | 'offline';

export const ERRORS: Record<
  ClientErrorCode,
  { icon: LucideIcon; title: string; hint: string; retry: boolean }
> = {
  invalid: {
    icon: CircleAlert,
    title: 'That address doesn’t look right',
    hint: 'Check the spelling. A plain domain like example.com works.',
    retry: false,
  },
  private: {
    icon: Lock,
    title: 'Private addresses can’t be scanned',
    hint: 'Spillcheck only scans public websites. Localhost and internal networks are off limits.',
    retry: false,
  },
  timeout: {
    icon: Clock,
    title: 'The site took too long to respond',
    hint: 'It may be slow or overloaded right now. Try again in a moment.',
    retry: true,
  },
  unreachable: {
    icon: Globe,
    title: 'Couldn’t reach that site',
    hint: 'Check that the address is correct and the site is online.',
    retry: true,
  },
  blocked: {
    icon: Ban,
    title: 'The site refused the scan',
    hint: 'Some sites block automated requests. This one returned an access error.',
    retry: false,
  },
  'not-html': {
    icon: FileCode,
    title: 'That isn’t a web page',
    hint: 'The address returned a file or data, not HTML. Try the site’s home page.',
    retry: false,
  },
  redirects: {
    icon: Repeat,
    title: 'Too many redirects',
    hint: 'The site kept sending Spillcheck somewhere else. Try the final address directly.',
    retry: false,
  },
  'rate-limited': {
    icon: Hourglass,
    title: 'That’s a lot of scans',
    hint: 'Each scan runs a real browser, so there’s a limit of 10 new scans a minute. Results you’ve already run are free. Try again in a minute.',
    retry: true,
  },
  offline: {
    icon: WifiOff,
    title: 'You’re offline',
    hint: 'Spillcheck couldn’t be reached. Check your connection and try again.',
    retry: true,
  },
  failed: {
    icon: TriangleAlert,
    title: 'Something went wrong',
    hint: 'The scan failed unexpectedly. Trying again usually works.',
    retry: true,
  },
};
