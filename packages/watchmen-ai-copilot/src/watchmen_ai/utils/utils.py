from watchmen_storage import SnowflakeGenerator


def generate_token(snowflake_generator: SnowflakeGenerator):
    return str(snowflake_generator.next_id())