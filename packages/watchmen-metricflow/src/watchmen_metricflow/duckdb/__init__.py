

def init_duckdb():
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
    # Now you can query the Postgres table through DuckDB


#
#
# if __name__ == "__main__":
#     duckdb_con = init_duckdb()
#     print(duckdb_con.execute("SELECT * FROM pg.life_metrics.bank_insurance_policy_dataset LIMIT 5").fetchdf())
#
#
#
#
# #
# class DuckdbConnect:
#
#     def get_con(self):
#         return con



