/** Tipos da central de aprendizado Domine a Wiize. */

export interface LearningModule {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_path: string | null;
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface LearningLesson {
  id: string;
  module_id: string;
  slug: string;
  title: string;
  description: string;
  youtube_url: string;
  youtube_video_id: string;
  thumbnail_path: string | null;
  duration_seconds: number | null;
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface LearningModuleWithLessons extends LearningModule {
  lessons: LearningLesson[];
}

export interface LearningModuleInput {
  slug: string;
  title: string;
  description: string;
  cover_path: string | null;
  display_order: number;
  is_published: boolean;
}

export interface LearningLessonInput {
  slug: string;
  title: string;
  description: string;
  youtube_url: string;
  youtube_video_id: string;
  thumbnail_path: string | null;
  duration_seconds: number | null;
  display_order: number;
  is_published: boolean;
}
