"""
Spark accelerated reads on top of the topic data services.

`SparkTopicDataService` is a delegate-first decorator of a TopicDataService: ordinary reads
(count / criteria / aggregations, and everything else via __getattr__) are pushed down to the
underlying storage service unchanged. Spark is engaged only through `find_distribution_frame`,
which loads the requested columns within a criteria into a spark data frame, for computations
that need the full value distribution of a column, such as median, quantile and standard
deviation.

pyspark is imported lazily, this package can be imported without pyspark installed; pyspark
is only required when a SparkSession is actually used. Declare it with the ``spark`` extra
of this package when needed.
"""

from .topic_data_service import SparkTopicDataService

__all__ = ['SparkTopicDataService']
