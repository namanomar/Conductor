import { NextResponse } from "next/server";
import { generateWorkflowFromPrompt } from "@/lib/server/workflow-gen";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }
    const graph = await generateWorkflowFromPrompt(prompt);
    return NextResponse.json({ graph });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Workflow generation failed" },
      { status: 500 }
    );
  }
}
