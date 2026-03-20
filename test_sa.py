from sqlalchemy import create_engine, text
engine = create_engine("postgresql+psycopg2://watchmen:watchmen@localhost:5432/watchmen")
conn = engine.connect()
trans = conn.begin()
conn.execute(text("SELECT 1"))
conn.close()
print("done")
