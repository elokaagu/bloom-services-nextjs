"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function UploadTest() {
  const [result, setResult] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const testUpload = async () => {
    setIsLoading(true);
    setResult("Testing upload...");

    try {
      // Create a test file
      const testFile = new File(["test content"], "test.txt", {
        type: "text/plain",
      });

      const formData = new FormData();
      formData.append("file", testFile);
      formData.append("workspaceId", "550e8400-e29b-41d4-a716-446655440001");
      formData.append("ownerId", "550e8400-e29b-41d4-a716-446655440002");
      formData.append("title", "Test Upload.txt");

      console.log("Sending upload request...");
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);

      if (response.ok) {
        setResult(`✅ Upload successful! Document ID: ${data.document.id}`);
      } else {
        setResult(`❌ Upload failed: ${data.error}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setResult(
        `❌ Upload error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Upload Test</h1>
      <Button onClick={testUpload} disabled={isLoading}>
        {isLoading ? "Testing..." : "Test Upload"}
      </Button>
      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}
