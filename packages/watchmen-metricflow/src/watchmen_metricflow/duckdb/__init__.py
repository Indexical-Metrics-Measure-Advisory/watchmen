import duckdb

# Create or open a DuckDB database file
duckdb_con = duckdb.connect("mydb.duckdb")

print("init duck db")

duckdb_con.install_extension("postgres_scanner")
duckdb_con.load_extension("postgres_scanner")


duckdb_con.execute("""
    ATTACH 'dbname=postgres user=postgres password=mysecretpassword host=127.0.0.1 port=5432'
    AS pg (TYPE POSTGRES);
""")


print(duckdb_con.execute("SELECT * FROM pg.life_metrics.bank_insurance_policy_dataset LIMIT 5").fetchdf())


#
# class DuckdbConnect:
#
#     def get_con(self):
#         return con



