
## الفكرة العامة

نضيف جدول `clubs` (نادي + رمز تسجيل فريد). كل جدول موجود (members, packages, subscriptions, payments, profiles, user_roles) يصير فيه عمود `club_id` لتمييز بيانات كل نادي. RLS بتمنع أي شخص من رؤية بيانات نادٍ آخر.

## التدفق

1. **أنت (المطور)** تنشئ نادي جديد + رمز من قاعدة البيانات (مثلاً `CLUB-AHLI-2026`) وتعطي العميل: رابط الموقع + الرمز.
2. **أول دخول للنادي:** صاحب النادي يفتح `/signup` ويدخل: رمز النادي + اسمه + إيميله + كلمة سر → يصير **admin** لهذا النادي. الرمز لا يصلح لتسجيل admin ثاني بعدها.
3. **داخل البرنامج:** الـ admin يفتح صفحة "الموظفون" ويضيف موظف بـ: اسم مستخدم + كلمة سر. النظام داخليًا يحوّل لإيميل وهمي `<username>@<club_code>.local`.
4. **دخول الموظف:** صفحة `/login` فيها وضعَين (تبويبات):
   - **مدير نادي:** إيميل + كلمة سر
   - **موظف:** رمز النادي + اسم مستخدم + كلمة سر

## تغييرات قاعدة البيانات (migration)

- جدول جديد `clubs(id, name, code UNIQUE, is_active, created_at)`
- إضافة `club_id UUID NOT NULL` لجداول: `profiles, user_roles, members, packages, subscriptions, payments`
- حذف كل البيانات الحالية + كل مستخدمي auth (`delete from auth.users`) لأننا نبدأ من الصفر
- دوال:
  - `get_user_club_id(uuid)` security definer → ترجع club_id للمستخدم
  - تعديل `has_role` و `is_staff_or_admin` لتأخذ بعين الاعتبار club_id (التحقق فقط على المستخدم نفسه)
  - استبدال `handle_new_user`: تقرأ `club_code` و(اختياريًا) `username` من `raw_user_meta_data`، تتحقق من الرمز، تضيف profile مع `club_id`، وتعطي دور admin فقط إذا كان أول مستخدم في هذا النادي وإلا staff
- تحديث **كل** سياسات RLS الموجودة بحيث تضيف شرط `club_id = get_user_club_id(auth.uid())` لمنع رؤية بيانات أندية أخرى

## كود الواجهة

- **`/signup` (صفحة جديدة):** نموذج يحتوي رمز النادي + اسم + إيميل + كلمة سر. ينادي `supabase.auth.signUp` مع `options.data = { full_name, club_code }`.
- **`/login`:** تبويبَين (مدير / موظف). موظف يدخل code+username+password → نحوّل لـ `email = username@code.local` ثم `signInWithPassword`.
- **`/staff` (موجودة):** نضيف نموذج "إضافة موظف جديد" (username + password). يستدعي server function تستخدم `supabaseAdmin.auth.admin.createUser` لإنشاء حساب الموظف مع نفس club_id للأدمن، وإضافة دور staff. (تستخدم admin API لأن الموظف لا يحتاج تأكيد إيميل).
- الجدول كلياً بدون تأكيد إيميل: نُفعّل `auto_confirm_email = true` لأن إيميلات الموظفين وهمية.

## ملف server function جديد

`src/lib/staff.functions.ts` → `createStaff({ username, password })`: يتحقق أن المنادي admin، يجلب club_code من قاعدة البيانات، ينشئ المستخدم بـ `supabaseAdmin` مع `email_confirm: true` و `user_metadata = { full_name: username, club_code, username }`، يضيف دور staff.

## ملاحظات

- بعد ما توافق على الخطة، تنفيذ الـ migration رح يمسح كل البيانات والمستخدمين الحاليين. لازم تنشئ نادي أول من قاعدة البيانات (سأعطيك أمر INSERT جاهز بعد الـ migration) وبعدها تستخدم رمزه للتسجيل من جديد.
- `auto_confirm_email` سيتم تفعيله ليعمل نظام إيميلات الموظفين الوهمية.
