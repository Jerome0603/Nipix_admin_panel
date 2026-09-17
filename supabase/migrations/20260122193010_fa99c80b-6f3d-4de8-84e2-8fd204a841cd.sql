-- Create role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'course_admin', 'support_team');

-- Create course level enum
CREATE TYPE public.course_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- Create course status enum
CREATE TYPE public.course_status AS ENUM ('draft', 'published', 'archived');

-- Create enrollment status enum
CREATE TYPE public.enrollment_status AS ENUM ('active', 'completed', 'dropped');

-- Create payment status enum
CREATE TYPE public.payment_status AS ENUM ('paid', 'pending', 'refunded');

-- Create certificate status enum
CREATE TYPE public.certificate_status AS ENUM ('pending', 'approved', 'issued');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL DEFAULT 'support_team',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create instructors table
CREATE TABLE public.instructors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create courses table
CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    duration TEXT,
    level public.course_level NOT NULL DEFAULT 'beginner',
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status public.course_status NOT NULL DEFAULT 'draft',
    certificate_enabled BOOLEAN NOT NULL DEFAULT false,
    syllabus_url TEXT,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create course_instructors junction table
CREATE TABLE public.course_instructors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    instructor_id UUID REFERENCES public.instructors(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (course_id, instructor_id)
);

-- Create students table (for demo purposes, separate from auth users)
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create enrollments table
CREATE TABLE public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    status public.enrollment_status NOT NULL DEFAULT 'active',
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    UNIQUE (student_id, course_id)
);

-- Create payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status public.payment_status NOT NULL DEFAULT 'pending',
    transaction_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create certificate_templates table
CREATE TABLE public.certificate_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    template_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create certificates table
CREATE TABLE public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    template_id UUID REFERENCES public.certificate_templates(id) ON DELETE SET NULL,
    certificate_id TEXT NOT NULL UNIQUE,
    certificate_url TEXT,
    status public.certificate_status NOT NULL DEFAULT 'pending',
    issued_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, course_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is any admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'course_admin')
  )
$$;

-- Create function to check if user has any role (is authenticated admin)
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

-- User roles policies (only super admin can manage)
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Super admin can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Courses policies
CREATE POLICY "All admin roles can view courses"
ON public.courses FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Super admin and course admin can insert courses"
ON public.courses FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Super admin and course admin can update courses"
ON public.courses FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Super admin can delete courses"
ON public.courses FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Instructors policies
CREATE POLICY "All admin roles can view instructors"
ON public.instructors FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Super admin can manage instructors"
ON public.instructors FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Course instructors policies
CREATE POLICY "All admin roles can view course instructors"
ON public.course_instructors FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Super admin can manage course instructors"
ON public.course_instructors FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Students policies
CREATE POLICY "All admin roles can view students"
ON public.students FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Super admin and course admin can manage students"
ON public.students FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Enrollments policies
CREATE POLICY "All admin roles can view enrollments"
ON public.enrollments FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Super admin and course admin can manage enrollments"
ON public.enrollments FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Payments policies
CREATE POLICY "All admin roles can view payments"
ON public.payments FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Super admin can manage payments"
ON public.payments FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Certificate templates policies
CREATE POLICY "All admin roles can view certificate templates"
ON public.certificate_templates FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Super admin can manage certificate templates"
ON public.certificate_templates FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Certificates policies
CREATE POLICY "All admin roles can view certificates"
ON public.certificates FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Super admin and course admin can manage certificates"
ON public.certificates FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_instructors_updated_at
  BEFORE UPDATE ON public.instructors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('course-files', 'course-files', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', true);

-- Storage policies for course files
CREATE POLICY "Authenticated users can view course files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'course-files');

CREATE POLICY "Admins can upload course files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-files' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update course files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'course-files' AND public.is_admin(auth.uid()));

CREATE POLICY "Super admin can delete course files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'course-files' AND public.has_role(auth.uid(), 'super_admin'));

-- Storage policies for certificates
CREATE POLICY "Authenticated users can view certificates"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'certificates');

CREATE POLICY "Admins can upload certificates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'certificates' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update certificates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'certificates' AND public.is_admin(auth.uid()));

CREATE POLICY "Super admin can delete certificates"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'certificates' AND public.has_role(auth.uid(), 'super_admin'));