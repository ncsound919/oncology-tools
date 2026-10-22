"""Shared parquet I/O with provenance attrs. Requires pyarrow (see requirements)."""
import os

import pyarrow as pa
import pyarrow.parquet as pq


def ensure_parent(path):
    parent = os.path.dirname(os.path.abspath(path))
    os.makedirs(parent, exist_ok=True)


def write_parquet_with_attrs(df, path, attrs):
    """Write df to parquet with string key-value metadata in the file schema."""
    ensure_parent(path)
    table = pa.Table.from_pandas(df, preserve_index=False)
    meta = {str(k): str(v) for k, v in attrs.items()}
    table = table.replace_schema_metadata({** (table.schema.metadata or {}),
                                           **{k.encode(): v.encode() for k, v in meta.items()}})
    pq.write_table(table, path)
