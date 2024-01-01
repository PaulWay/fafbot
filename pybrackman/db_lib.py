from datetime import datetime
import logging
import sqlite3

con = sqlite3.connect(
    "players.db",
    detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES
)
cursor = con.cursor()


PLAYER_HEADER = ['faf_id', 'faf_username', 'guild_id', 'discord_id', 'discord_username']
PLAYER_HEADER_STR = ', '.join(PLAYER_HEADER)


def db_create(cursor):
    # Don't use a primary or unique key on faf_id, because the same FAF player
    # may be on multiple Discord servers.  It's actually the combination of
    # guild_id and discord_id that is unique.
    cursor.execute("""
        CREATE TABLE players (
            faf_id integer,
            faf_username text,
            guild_id integer(8),
            discord_id integer(8),
            discord_username text,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP,
            CONSTRAINT guild_member UNIQUE (guild_id, discord_id)
        );
    """)
    cursor.execute("""
        CREATE INDEX player_faf_id on players (faf_id);
    """)
    cursor.execute("""
        CREATE INDEX player_faf_username on players (faf_username);
    """)


def read_csv(cursor, filename):
    """
    Read the CSV output and map it into the table here.  Modify the CSV to
    have a header with the right field names (including sqlite3's 'rowid').
    """
    import csv
    fh = open(filename, 'r')
    reader = csv.reader(fh.readlines())
    header = next(reader)
    # players = map_rows(reader, header)
    # return players
    header_str = ', '.join(header)
    values_str = ', '.join(['?'] * len(header))
    ins_sql = f"""
        INSERT INTO players
        ({header_str})
        VALUES ({values_str})
    """

    def process_rows(rows):
        for row in rows:
            out = []
            for field, val in zip(header, row):
                if field == 'created_at' or field == 'updated_at':
                    val = datetime.fromisoformat(val)
                out.append(val)
            yield out

    cursor.executemany(ins_sql, process_rows(reader))
    con.commit()


def map_rows(rows, fields=PLAYER_HEADER):
    """
    Takes a list of tuples of len(fields).
    Returns a list of dicts with the fields mapped to their keys.
    """
    return [
        dict(zip(fields, row))
        for row in rows
    ]


def map_row(row, fields=PLAYER_HEADER):
    """
    Takes a single tuple of len(fields).
    Returns None if the tuple is empty, or a dict with the fields mapped to
    their keys.
    """
    if not row:
        return None
    return dict(zip(fields, row))


def db_get_user(**kwargs):
    """
    Search the players table for a single row matching the given fields.
    This is going to be a bit ugly compared to the nice query construction
    syntax in e.g. Django.
    """
    # Make up a where clause correlated to values
    if not kwargs:
        return None
    conditions = []
    values = []
    for field, value in kwargs.items():
        conditions.append(f"{field} = ?")
        values.append(value)
    sql = f"""
        SELECT {PLAYER_HEADER_STR}
        FROM players
        WHERE {' and '.join(conditions)}
    """
    res = cursor.execute(sql, values)
    row = res.fetchone()
    if not row:
        return None
    return map_row(row)


def db_get_users(faf_ids, guild_id):
    """
    Fetch a list of database rows matching those FAF IDs.  Used
    primarily for resolving players from a game.
    """
    qmarks = ', '.join(['?'] * len(faf_ids))
    sql = f"""
        SELECT {PLAYER_HEADER_STR}
        FROM players
        WHERE faf_id in ({qmarks}) AND guild_id = ?
    """
    logging.info("Requesting FAF IDs %s", repr(faf_ids))
    res = cursor.execute(sql, [int(i) for i in faf_ids] + [guild_id])
    data = map_rows(res.fetchall())
    logging.info("db_get_users returns %s", repr(data))
    return data


def db_set_user(faf_id, faf_username, guild_id, discord_id, discord_username):
    """
    Add a user, or update them if they already exist.  The unique key is
    (guild_id, discord_id).
    """
    ins_sql = f"""
        INSERT INTO players
          (faf_id, faf_username, discord_username, updated_at, guild_id, discord_id)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (guild_id, discord_id) DO
        UPDATE SET faf_id=excluded.faf_id, faf_username=excluded.faf_username,
          discord_username=excluded.discord_username, updated_at=excluded.updated_at
    """
    #     RETURNING {PLAYER_HEADER_STR} - doesn't seem to work
    row_vals = (
        faf_id, faf_username, discord_username, datetime.now(),
        guild_id, discord_id,
    )
    # For some reason logging really doesn't like taking row_vals as an arguemnt here.
    # Have to manually expand it?
    # logging.info('Insert SQL: %s', ins_sql)
    # logging.info('Row data: %s', repr(row_vals))
    res = cursor.execute(ins_sql, row_vals)
    con.commit()

    # For some reason the RETURNING keyword doesn't work - SQLite complains about a
    # syntax error.  So we just select it again...
    sql = f"""
        SELECT {PLAYER_HEADER_STR}
        FROM players
        WHERE guild_id = ? and discord_id = ?
    """
    res = cursor.execute(sql, [guild_id, discord_id])
    row = res.fetchone()
    return map_row(row)
