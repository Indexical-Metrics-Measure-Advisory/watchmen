// Topic profile model — watchmen-model dqc/topic_profile.py declares
// `TopicProfile = Any` (a wide, backend-defined dict), so the frontend keeps
// it as an open record and renders its entries generically.
// Source: packages/watchmen-model/src/watchmen_model/dqc/topic_profile.py
// Endpoint: GET /dqc/topic/profile?topic_id=&date=
// (packages/watchmen-rest-dqc/.../topic_profile/topic_profile_router.py)

export type TopicProfile = Record<string, any> | null;
