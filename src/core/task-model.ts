export const TASK_STATUSES = ['inbox', 'active', 'waiting', 'done', 'cancelled'] as const;
export const IMPORTANCE_LEVELS = ['important', 'normal'] as const;
export const URGENCY_LEVELS = ['urgent', 'normal'] as const;
export const TASK_BUCKETS = ['today', 'tomorrow', 'this_week', 'later'] as const;
export const TASK_PROGRESS = ['not_started', 'started', 'almost_done'] as const;
export const REMINDER_MODES = ['once', 'persistent', 'escalating'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type Importance = (typeof IMPORTANCE_LEVELS)[number];
export type Urgency = (typeof URGENCY_LEVELS)[number];
export type TaskBucket = (typeof TASK_BUCKETS)[number];
export type TaskProgress = (typeof TASK_PROGRESS)[number];
export type ReminderMode = (typeof REMINDER_MODES)[number];

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  importance: Importance;
  urgency: Urgency;
  startAt: string | null;
  dueAt: string | null;
  remindAt: string | null;
  bucket: TaskBucket | null;
  estimatedMinutes: number | null;
  progress: TaskProgress;
  reminderMode: ReminderMode | null;
  snoozeCount: number;
  lastSnoozedAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  deletedAt: string | null;
};

export type CreateTaskInput = {
  title: string;
  notes?: string | null;
  status?: TaskStatus;
  importance?: Importance;
  urgency?: Urgency;
  startAt?: string | Date | null;
  dueAt?: string | Date | null;
  remindAt?: string | Date | null;
  bucket?: TaskBucket | null;
  estimatedMinutes?: number | null;
  progress?: TaskProgress;
  reminderMode?: ReminderMode | null;
};

export type UpdateTaskInput = Omit<Partial<CreateTaskInput>, 'title'> & {
  title?: string;
};

export const TASK_VIEWS = ['today', 'tomorrow', 'this_week', 'urgent', 'important', 'overdue', 'inbox'] as const;
export type TaskView = (typeof TASK_VIEWS)[number];

export type ListTaskFilters = {
  status?: TaskStatus;
  bucket?: TaskBucket;
  importance?: Importance;
  urgency?: Urgency;
  dueBefore?: string | Date;
  dueAfter?: string | Date;
  view?: TaskView;
};

export type FocusResult = {
  critical: Task[];
  today: Task[];
  should_start: Task[];
  waiting: Task[];
};
