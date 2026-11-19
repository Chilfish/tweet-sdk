export interface PollChoice {
  label: string
  count: number
  /** Pre-computed integer percentage (0–100). */
  percentage: number
  imageUrl?: string
  imageWidth?: number
  imageHeight?: number
  /** Dominant colour `#rrggbb`, used as a loading placeholder. */
  color?: string
}

export interface TweetPoll {
  choices: PollChoice[]
  totalVotes: number
  countsAreFinal: boolean
  /** Normalized ISO timestamp; undefined when unparseable. */
  endDatetime?: string
  durationMinutes?: number
  hasImages: boolean
}
