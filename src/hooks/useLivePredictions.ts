"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export function useLivePredictions(includeFinished = false) {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    let query = supabase
      .from("predictions")
      .select("*")
      .order("kickoff_time", { ascending: true });

    if (!includeFinished) {
      query = query.neq("match_status", "FINISHED");
    }

    const { data } = await query;

    if (data) setPredictions(data);
    setLoading(false);
  }, [includeFinished]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { predictions, loading, refetch: fetchData };
}