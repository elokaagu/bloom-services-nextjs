"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const EnvCheck = () => {
  const [envStatus, setEnvStatus] = useState<{
    supabaseUrl: boolean;
    supabaseAnonKey: boolean;
    supabaseServiceKey: boolean;
  }>({
    supabaseUrl: false,
    supabaseAnonKey: false,
    supabaseServiceKey: false,
  });

  useEffect(() => {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    setEnvStatus({
      supabaseUrl: !!supabaseUrl,
      supabaseAnonKey: !!supabaseAnonKey,
      supabaseServiceKey: !!supabaseServiceKey,
    });
  }, []);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Environment Variables Check</CardTitle>
        <CardDescription>
          Check if Supabase environment variables are properly configured
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <span>Supabase URL:</span>
          <Badge variant={envStatus.supabaseUrl ? "default" : "destructive"}>
            {envStatus.supabaseUrl ? "Set" : "Missing"}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span>Supabase Anon Key:</span>
          <Badge variant={envStatus.supabaseAnonKey ? "default" : "destructive"}>
            {envStatus.supabaseAnonKey ? "Set" : "Missing"}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span>Supabase Service Key:</span>
          <Badge variant={envStatus.supabaseServiceKey ? "default" : "destructive"}>
            {envStatus.supabaseServiceKey ? "Set" : "Missing"}
          </Badge>
        </div>
        
        {!envStatus.supabaseUrl || !envStatus.supabaseAnonKey ? (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              <strong>Missing Environment Variables!</strong>
            </p>
            <p className="text-xs text-red-600 mt-1">
              Create a <code>.env.local</code> file with your Supabase credentials.
            </p>
          </div>
        ) : (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              <strong>Environment variables are configured!</strong>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
