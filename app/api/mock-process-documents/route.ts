import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function simpleChunk(text: string, size = 1200, overlap = 200) {
  const chunks: { text: string; chunk_no: number }[] = [];
  for (let i = 0, c = 0; i < text.length; i += size - overlap) {
    chunks.push({ text: text.slice(i, i + size), chunk_no: c++ });
  }
  return chunks;
}

async function embed(texts: string[]) {
  const res = await openai.embeddings.create({
    model: process.env.EMBEDDING_MODEL!,
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

export async function POST(req: NextRequest) {
  try {
    console.log("=== MOCK DOCUMENT PROCESSING START ===");

    const supabase = supabaseService();

    // Get all documents that don't have chunks yet
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, title, status")
      .eq("workspace_id", "550e8400-e29b-41d4-a716-446655440001") // Policy Research workspace
      .in("status", ["ready", "processing"]);

    if (docsError) {
      console.error("Error fetching documents:", docsError);
      return NextResponse.json(
        { error: "Failed to fetch documents", details: docsError.message },
        { status: 500 }
      );
    }

    console.log(`Found ${documents?.length || 0} documents to process`);

    if (!documents || documents.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No documents found to process",
        processed: 0,
      });
    }

    const results = [];

    for (const doc of documents) {
      try {
        console.log(`Processing document: ${doc.title} (${doc.id})`);

        // Update status to processing
        await supabase
          .from("documents")
          .update({ status: "processing" })
          .eq("id", doc.id);

        // Create mock content based on document title
        let mockContent = "";

        if (doc.title.toLowerCase().includes("satellite")) {
          mockContent = `# Satellite Labs Research Report

## Executive Summary
Satellite Labs is a leading research facility specializing in advanced satellite technology and space exploration. Our mission is to develop cutting-edge satellite systems for communication, earth observation, and scientific research.

## Key Technologies
- Advanced propulsion systems for satellite positioning
- High-resolution imaging capabilities for earth observation
- Secure communication protocols for data transmission
- Autonomous navigation systems for deep space missions

## Research Areas
1. **Communication Satellites**: Developing next-generation communication systems for global connectivity
2. **Earth Observation**: Creating advanced sensors for climate monitoring and environmental research
3. **Scientific Missions**: Supporting space exploration with innovative satellite technologies
4. **Defense Applications**: Providing secure and reliable satellite systems for national security

## Recent Achievements
- Successfully launched 15 satellites in the past year
- Developed breakthrough propulsion technology reducing fuel consumption by 40%
- Established partnerships with major space agencies worldwide
- Received recognition for environmental monitoring contributions

## Future Projects
- Mars exploration satellite network
- Quantum communication systems
- Advanced AI-powered satellite operations
- Sustainable space debris management solutions`;
        } else if (doc.title.toLowerCase().includes("centralis")) {
          mockContent = `# Centralis Corporate Brochure

## About Centralis
Centralis is a premier technology consulting firm specializing in digital transformation and enterprise solutions. We help organizations navigate the complex landscape of modern technology to achieve their strategic objectives.

## Our Services
- **Digital Transformation**: Comprehensive strategies for modernizing business processes
- **Cloud Solutions**: Migration and optimization of cloud infrastructure
- **Data Analytics**: Advanced analytics and business intelligence solutions
- **Cybersecurity**: Comprehensive security frameworks and risk management
- **AI & Machine Learning**: Implementation of intelligent automation systems

## Industry Expertise
- Financial Services: Banking, insurance, and fintech solutions
- Healthcare: Digital health platforms and patient management systems
- Manufacturing: Smart factory solutions and supply chain optimization
- Retail: E-commerce platforms and customer experience enhancement
- Government: Public sector digital transformation initiatives

## Why Choose Centralis
- 15+ years of industry experience
- Certified professionals across all major technology platforms
- Proven track record of successful project delivery
- 24/7 support and maintenance services
- Flexible engagement models to meet diverse client needs

## Client Success Stories
- Reduced operational costs by 35% for Fortune 500 manufacturing client
- Improved customer satisfaction scores by 40% for retail chain
- Enhanced security posture for financial institution with zero breaches
- Accelerated time-to-market by 50% for healthcare startup`;
        } else {
          mockContent = `# ${doc.title}

## Document Overview
This document contains important information about ${doc.title.replace(
            /\.[^/.]+$/,
            ""
          )}. The content covers various aspects of the subject matter and provides detailed insights for stakeholders.

## Key Points
- Comprehensive analysis of current trends and developments
- Strategic recommendations for future planning
- Detailed implementation guidelines
- Risk assessment and mitigation strategies
- Performance metrics and success indicators

## Conclusion
This document serves as a comprehensive guide for understanding and implementing the strategies outlined within. Regular updates and reviews are recommended to ensure continued relevance and effectiveness.`;
        }

        // Clean up text
        const text = mockContent.replace(/\s+/g, " ").trim();

        // Create chunks
        const chunks = simpleChunk(text);
        console.log(`Created ${chunks.length} chunks for ${doc.title}`);

        // Generate embeddings
        const embeddings = await embed(chunks.map((c) => c.text));
        console.log(
          `Generated ${embeddings.length} embeddings for ${doc.title}`
        );

        // Insert chunks into database
        const rows = chunks.map((c, i) => ({
          document_id: doc.id,
          chunk_no: c.chunk_no,
          text: c.text,
          embedding: embeddings[i] as any,
        }));

        const { error: insErr } = await supabase
          .from("document_chunks")
          .insert(rows);

        if (insErr) {
          console.error("Database error inserting chunks:", insErr);
          throw insErr;
        }

        // Update document status to ready
        await supabase
          .from("documents")
          .update({ status: "ready" })
          .eq("id", doc.id);

        console.log(`Document ${doc.title} processed successfully`);
        results.push({
          documentId: doc.id,
          title: doc.title,
          success: true,
          chunks: rows.length,
        });
      } catch (error) {
        console.error(`Error processing ${doc.title}:`, error);

        // Mark document as failed
        await supabase
          .from("documents")
          .update({
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
          })
          .eq("id", doc.id);

        results.push({
          documentId: doc.id,
          title: doc.title,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(
      `Processing complete: ${successful} successful, ${failed} failed`
    );
    console.log("=== MOCK DOCUMENT PROCESSING SUCCESS ===");

    return NextResponse.json({
      success: true,
      message: `Processed ${successful} documents successfully, ${failed} failed`,
      results,
      summary: {
        total: documents.length,
        successful,
        failed,
      },
    });
  } catch (e: any) {
    console.error("=== MOCK DOCUMENT PROCESSING ERROR ===", e);
    return NextResponse.json(
      { error: e.message, stack: e.stack },
      { status: 500 }
    );
  }
}
