import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const workspaceId = form.get("workspaceId") as string;
    const ownerId = form.get("ownerId") as string;
    const title = form.get("title") as string;

    if (!file || !workspaceId || !ownerId) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }

    const filename = `${crypto.randomUUID()}-${file.name}`;
    const bucket = process.env.STORAGE_BUCKET!;

    // 1) upload raw file
    const { data: uploadRes, error: uploadErr } = await supabaseService.storage
      .from(bucket)
      .upload(filename, await file.arrayBuffer(), { contentType: file.type });
    if (uploadErr) throw uploadErr;

    // 2) create document row (status=uploading)
    const { data: doc, error: docErr } = await supabaseService
      .from("documents")
      .insert({
        workspace_id: workspaceId,
        owner_id: ownerId,
        title: title || file.name,
        storage_path: uploadRes.path,
        status: "uploading",
      })
      .select("*")
      .single();
    if (docErr) throw docErr;

    return NextResponse.json({ document: doc });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
