import type { LucideProps } from "lucide-react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  BadgeCheck,
  Bug,
  Check,
  ChevronDown,
  Circle,
  CircleHelp,
  Copy,
  Database,
  Diamond,
  Flag,
  Flame,
  House,
  Lightbulb,
  Link2,
  LockKeyhole,
  MessageCircleQuestion,
  MessagesSquare,
  Move,
  Plus,
  Play,
  RotateCcw,
  Server,
  Share2,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Trophy,
  UserRound,
  X,
  Zap,
} from "lucide-react";

const icons = {
  "alert-triangle": AlertTriangle,
  "arrow-down": ArrowDown,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "arrow-up": ArrowUp,
  "arrow-up-right": ArrowUpRight,
  "badge-check": BadgeCheck,
  bug: Bug,
  check: Check,
  "chevron-down": ChevronDown,
  circle: Circle,
  copy: Copy,
  help: CircleHelp,
  database: Database,
  diamond: Diamond,
  flag: Flag,
  flame: Flame,
  home: House,
  idea: Lightbulb,
  link: Link2,
  lock: LockKeyhole,
  question: MessageCircleQuestion,
  messages: MessagesSquare,
  move: Move,
  plus: Plus,
  play: Play,
  retry: RotateCcw,
  server: Server,
  share: Share2,
  star: Star,
  "thumbs-down": ThumbsDown,
  "thumbs-up": ThumbsUp,
  trash: Trash2,
  trophy: Trophy,
  user: UserRound,
  close: X,
  zap: Zap,
} as const;

export type SystemIconName = keyof typeof icons;

type SystemIconProps = Readonly<{
  name: SystemIconName;
  label?: string;
  size?: "small" | "medium" | "large";
  className?: string;
}>;

export function SystemIcon({ name, label, size = "medium", className = "" }: SystemIconProps) {
  const Icon = icons[name];
  const accessibility: Pick<LucideProps, "aria-hidden" | "aria-label" | "role"> = label
    ? { "aria-label": label, role: "img" }
    : { "aria-hidden": true };

  return <Icon className={`system-icon system-icon-${size} ${className}`.trim()} focusable="false" strokeWidth={2} {...accessibility} />;
}
