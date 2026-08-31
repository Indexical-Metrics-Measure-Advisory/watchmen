-- drop the topics.tags column when it exists,
-- environments applied the previous column based tags solution need this cleanup,
-- tags are stored in the topic_tags relation now
ALTER TABLE topics DROP COLUMN IF EXISTS tags;
