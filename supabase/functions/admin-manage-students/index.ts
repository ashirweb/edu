import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await userClient.from("user_roles").select("role").eq("user_id", caller.id).maybeSingle();
    if (!roleData || roleData.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { action, ...payload } = await req.json();

    if (action === "create-student") {
      const { email, password, fullName, rollNumber, classId, parentName, parentPhone, address } = payload;

      // Create auth user
      const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (authError) {
        return new Response(JSON.stringify({ error: authError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Assign student role
      const { error: roleError } = await adminClient.from("user_roles").insert({
        user_id: newUser.user.id,
        role: "student",
      });

      if (roleError) {
        return new Response(JSON.stringify({ error: roleError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create student record
      const { data: student, error: studentError } = await adminClient.from("students").insert({
        user_id: newUser.user.id,
        roll_number: rollNumber,
        class_id: classId || null,
        parent_name: parentName || null,
        parent_phone: parentPhone || null,
        address: address || null,
      }).select().single();

      if (studentError) {
        return new Response(JSON.stringify({ error: studentError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ student, userId: newUser.user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update-student") {
      const { studentId, rollNumber, classId, parentName, parentPhone, address, fullName } = payload;

      const { error: studentError } = await adminClient.from("students").update({
        roll_number: rollNumber,
        class_id: classId || null,
        parent_name: parentName || null,
        parent_phone: parentPhone || null,
        address: address || null,
      }).eq("id", studentId);

      if (studentError) {
        return new Response(JSON.stringify({ error: studentError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update profile name if provided
      if (fullName) {
        const { data: studentData } = await adminClient.from("students").select("user_id").eq("id", studentId).single();
        if (studentData) {
          await adminClient.from("profiles").update({ full_name: fullName }).eq("user_id", studentData.user_id);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete-student") {
      const { studentId } = payload;

      // Get user_id first
      const { data: studentData } = await adminClient.from("students").select("user_id").eq("id", studentId).single();
      if (!studentData) {
        return new Response(JSON.stringify({ error: "Student not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete auth user (cascades to profile, student, roles)
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(studentData.user_id);
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
