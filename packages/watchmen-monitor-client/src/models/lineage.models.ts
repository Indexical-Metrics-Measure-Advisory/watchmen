// Topic-level upstream lineage models — mirror watchmen-lineage model/lineage.py
// (TopicConsanguinity / TopicLineageLink / TopicLineageFactorPair).
// Endpoint: GET /lineage/topic/consanguinity

/** One factor-to-factor upstream relation between two topics. */
export interface TopicLineageFactorPair {
  sourceFactorId?: string;
  sourceFactorName?: string;
  targetFactorId?: string;
  targetFactorName?: string;
  relationType?: string;
  arithmetic?: string | null;
}

/** Topic-level upstream hop: source topic --(pipeline)--> target topic. */
export interface TopicLineageLink {
  level?: number;
  sourceTopicId?: string;
  sourceTopicName?: string;
  targetTopicId?: string;
  targetTopicName?: string;
  pipelineId?: string;
  pipelineName?: string;
  factors?: TopicLineageFactorPair[];
}

/** Upstream lineage chain of a topic, flattened as level-grouped links. */
export interface TopicConsanguinity {
  topicId?: string;
  topicName?: string;
  upstream?: TopicLineageLink[];
}
