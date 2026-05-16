import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Schema = z.object({
  username: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-zA-Z0-9_.-]+$/, "حروف إنجليزية وأرقام فقط"),
  password: z.string().min(6).max(100),
  full_name: z.string().min(1).max(255),
});

export const createStaffMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Schema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: roleRow, error: roleErr } = await supabase
      .from("user_roles")
      .select("role, club_id, clubs(code)")
      .eq("user_id", userId)
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!roleRow || roleRow.role !== "admin") {
      throw new Error("ليس لديك صلاحية لإضافة موظفين");
    }
    const clubCode = (roleRow.clubs as { code?: string } | null)?.code;
    if (!clubCode || !roleRow.club_id) throw new Error("النادي غير موجود");

    const email = `${data.username.toLowerCase()}@${clubCode.toLowerCase()}.local`;

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        username: data.username,
        club_code: clubCode,
      },
    });
    if (createErr) throw new Error(createErr.message);

    return { id: created.user?.id ?? null, email };
  });
