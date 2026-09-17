-- Create program_category enum for workshops/seminars/vac
CREATE TYPE public.program_category AS ENUM ('workshop', 'seminar', 'vac');

-- Create event_mode enum
CREATE TYPE public.event_mode AS ENUM ('online', 'offline', 'hybrid');

-- Create internship_type enum  
CREATE TYPE public.internship_type AS ENUM ('online', 'hybrid', 'offline');

-- Create registration_type enum
CREATE TYPE public.registration_type AS ENUM ('course', 'internship', 'event', 'workshop');

-- =====================
-- INTERNSHIPS TABLE
-- =====================
CREATE TABLE public.internships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  type internship_type NOT NULL DEFAULT 'online',
  duration TEXT,
  openings INTEGER DEFAULT 0,
  stipend TEXT,
  description TEXT,
  certificate_enabled BOOLEAN NOT NULL DEFAULT false,
  status course_status NOT NULL DEFAULT 'draft',
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Internship skills
CREATE TABLE public.internship_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  internship_id UUID NOT NULL REFERENCES public.internships(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Internship responsibilities
CREATE TABLE public.internship_responsibilities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  internship_id UUID NOT NULL REFERENCES public.internships(id) ON DELETE CASCADE,
  responsibility TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Internship benefits
CREATE TABLE public.internship_benefits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  internship_id UUID NOT NULL REFERENCES public.internships(id) ON DELETE CASCADE,
  benefit TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================
-- EVENTS TABLE
-- =====================
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  event_date DATE,
  event_time TIME,
  mode event_mode NOT NULL DEFAULT 'online',
  location TEXT,
  capacity INTEGER DEFAULT 0,
  registration_open BOOLEAN NOT NULL DEFAULT true,
  certificate_enabled BOOLEAN NOT NULL DEFAULT false,
  status course_status NOT NULL DEFAULT 'draft',
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Event schedule (days)
CREATE TABLE public.event_schedule_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  day_title TEXT,
  day_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Event sessions
CREATE TABLE public.event_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_day_id UUID NOT NULL REFERENCES public.event_schedule_days(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIME,
  end_time TIME,
  speaker TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Event problem statements (hackathons)
CREATE TABLE public.event_problem_statements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Event prizes
CREATE TABLE public.event_prizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  prize_amount TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Event FAQs
CREATE TABLE public.event_faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================
-- WORKSHOPS/SEMINARS/VAC TABLE
-- =====================
CREATE TABLE public.programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category program_category NOT NULL DEFAULT 'workshop',
  duration TEXT,
  mode event_mode NOT NULL DEFAULT 'online',
  description TEXT,
  status course_status NOT NULL DEFAULT 'draft',
  image_url TEXT,
  certificate_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================
-- COURSE MODULES & LESSONS
-- =====================
CREATE TABLE public.course_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.course_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration TEXT,
  video_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Course learning outcomes
CREATE TABLE public.course_learning_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Course projects
CREATE TABLE public.course_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Course FAQs
CREATE TABLE public.course_faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Course testimonials
CREATE TABLE public.course_testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  content TEXT NOT NULL,
  rating INTEGER DEFAULT 5,
  avatar_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================
-- REGISTRATIONS TABLE
-- =====================
CREATE TABLE public.registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_type registration_type NOT NULL,
  reference_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================
-- BLOGS TABLE
-- =====================
CREATE TABLE public.blogs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  content TEXT,
  excerpt TEXT,
  author_id UUID REFERENCES public.profiles(id),
  cover_image_url TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================
-- ADD MISSING COLUMNS TO COURSES
-- =====================
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS mode event_mode DEFAULT 'online';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS start_date DATE;

-- =====================
-- ENABLE RLS ON ALL NEW TABLES
-- =====================
ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internship_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internship_responsibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internship_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_schedule_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_problem_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_learning_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- =====================
-- RLS POLICIES FOR INTERNSHIPS
-- =====================
CREATE POLICY "All admin roles can view internships" ON public.internships FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Super admin and course admin can insert internships" ON public.internships FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Super admin and course admin can update internships" ON public.internships FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Super admin can delete internships" ON public.internships FOR DELETE USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "All admin roles can view internship_skills" ON public.internship_skills FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admins can manage internship_skills" ON public.internship_skills FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "All admin roles can view internship_responsibilities" ON public.internship_responsibilities FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admins can manage internship_responsibilities" ON public.internship_responsibilities FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "All admin roles can view internship_benefits" ON public.internship_benefits FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admins can manage internship_benefits" ON public.internship_benefits FOR ALL USING (is_admin(auth.uid()));

-- =====================
-- RLS POLICIES FOR EVENTS
-- =====================
CREATE POLICY "All admin roles can view events" ON public.events FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Super admin and course admin can insert events" ON public.events FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Super admin and course admin can update events" ON public.events FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Super admin can delete events" ON public.events FOR DELETE USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "All admin roles can view event_schedule_days" ON public.event_schedule_days FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admins can manage event_schedule_days" ON public.event_schedule_days FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "All admin roles can view event_sessions" ON public.event_sessions FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admins can manage event_sessions" ON public.event_sessions FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "All admin roles can view event_problem_statements" ON public.event_problem_statements FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admins can manage event_problem_statements" ON public.event_problem_statements FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "All admin roles can view event_prizes" ON public.event_prizes FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admins can manage event_prizes" ON public.event_prizes FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "All admin roles can view event_faqs" ON public.event_faqs FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admins can manage event_faqs" ON public.event_faqs FOR ALL USING (is_admin(auth.uid()));

-- =====================
-- RLS POLICIES FOR PROGRAMS
-- =====================
CREATE POLICY "All admin roles can view programs" ON public.programs FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Super admin and course admin can insert programs" ON public.programs FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Super admin and course admin can update programs" ON public.programs FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Super admin can delete programs" ON public.programs FOR DELETE USING (has_role(auth.uid(), 'super_admin'));

-- =====================
-- RLS POLICIES FOR COURSE MODULES & LESSONS
-- =====================
CREATE POLICY "All admin roles can view course_modules" ON public.course_modules FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admins can manage course_modules" ON public.course_modules FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "All admin roles can view course_lessons" ON public.course_lessons FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admins can manage course_lessons" ON public.course_lessons FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "All admin roles can view course_learning_outcomes" ON public.course_learning_outcomes FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admins can manage course_learning_outcomes" ON public.course_learning_outcomes FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "All admin roles can view course_projects" ON public.course_projects FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admins can manage course_projects" ON public.course_projects FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "All admin roles can view course_faqs" ON public.course_faqs FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admins can manage course_faqs" ON public.course_faqs FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "All admin roles can view course_testimonials" ON public.course_testimonials FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admins can manage course_testimonials" ON public.course_testimonials FOR ALL USING (is_admin(auth.uid()));

-- =====================
-- RLS POLICIES FOR REGISTRATIONS
-- =====================
CREATE POLICY "All admin roles can view registrations" ON public.registrations FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Super admin can manage registrations" ON public.registrations FOR ALL USING (has_role(auth.uid(), 'super_admin'));
-- Allow public to insert registrations (for website forms)
CREATE POLICY "Anyone can register" ON public.registrations FOR INSERT WITH CHECK (true);

-- =====================
-- RLS POLICIES FOR BLOGS
-- =====================
CREATE POLICY "All admin roles can view blogs" ON public.blogs FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Super admin and course admin can insert blogs" ON public.blogs FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Super admin and course admin can update blogs" ON public.blogs FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Super admin can delete blogs" ON public.blogs FOR DELETE USING (has_role(auth.uid(), 'super_admin'));
-- Public can view published blogs
CREATE POLICY "Public can view published blogs" ON public.blogs FOR SELECT USING (published = true);

-- =====================
-- TRIGGERS FOR updated_at
-- =====================
CREATE TRIGGER update_internships_updated_at BEFORE UPDATE ON public.internships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_blogs_updated_at BEFORE UPDATE ON public.blogs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();