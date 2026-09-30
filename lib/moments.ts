/** A candidate highlight in a VOD, produced by the analyze job. Times are VOD seconds. */
export type MomentReason = { type: "clips" | "chat" | "audio"; label: string; weight: number };
export type Moment = {
  id: string;
  start: number;
  end: number;
  /** Where the signals peaked — the "moment" itself; start/end pad around it. */
  peak: number;
  /** 0..1, relative to the best moment in this VOD. */
  score: number;
  reasons: MomentReason[];
  /** Title of the most-viewed Twitch clip covering this moment, if any. */
  title?: string;
};

export type AnalysisView = {
  vodId: string;
  status: "pending" | "processing" | "ready" | "failed";
  progress: number;
  duration: number | null;
  thumbs: string | null;
  wave: string | null;
  thumbsInfo: { interval: number; cols: number; rows: number; tw: number; th: number; count: number } | null;
  signals: { clips: boolean; chat: boolean; audio: boolean };
  moments: Moment[];
  error: string | null;
};
