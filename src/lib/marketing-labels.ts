type TFunc = (key: string) => string;

const CHANNEL_KEYS = ["INSTAGRAM", "FACEBOOK", "TIKTOK", "IN_STORE", "INFLUENCER", "OTHER"] as const;
const EXPERIMENT_STATUS_KEYS = ["IDEA", "TESTING", "LAUNCHED", "REJECTED"] as const;
const SOURCE_KEYS = ["IN_PERSON", "INSTAGRAM", "GOOGLE_REVIEW", "OTHER"] as const;
const SENTIMENT_KEYS = ["POSITIVE", "NEUTRAL", "NEGATIVE"] as const;

/** `t` is the root translation function (no namespace) — pass `useTranslations()`. */
export function campaignChannelLabel(t: TFunc, channel: string): string {
  return (CHANNEL_KEYS as readonly string[]).includes(channel)
    ? t(`marketing.channels.${channel}`)
    : channel;
}

export function experimentStatusLabel(t: TFunc, status: string): string {
  return (EXPERIMENT_STATUS_KEYS as readonly string[]).includes(status)
    ? t(`marketing.experimentStatuses.${status}`)
    : status;
}

export function feedbackSourceLabel(t: TFunc, source: string): string {
  return (SOURCE_KEYS as readonly string[]).includes(source) ? t(`marketing.sources.${source}`) : source;
}

export function feedbackSentimentLabel(t: TFunc, sentiment: string): string {
  return (SENTIMENT_KEYS as readonly string[]).includes(sentiment)
    ? t(`marketing.sentiments.${sentiment}`)
    : sentiment;
}
