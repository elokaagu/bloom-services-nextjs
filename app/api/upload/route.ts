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

    console.log("Upload attempt:", { filename, bucket, workspaceId, ownerId });

    const supabase = supabaseService();

    // 1) upload raw file
    console.log("Uploading to storage bucket:", bucket);
    const { data: uploadRes, error: uploadErr } = await supabase.storage
      .from(bucket)
      .upload(filename, await file.arrayBuffer(), { contentType: file.type });
    if (uploadErr) {
      console.error("Storage upload error:", uploadErr);
      throw uploadErr;
    }
    console.log("Storage upload successful:", uploadRes.path);

    // 2) create document row (status=uploading)
    console.log("Creating document record...");
    const { data: doc, error: docErr } = await supabase
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
    if (docErr) {
      console.error("Database insert error:", docErr);
      throw docErr;
    }
    console.log("Document record created:", doc.id);

    return NextResponse.json({ document: doc });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
