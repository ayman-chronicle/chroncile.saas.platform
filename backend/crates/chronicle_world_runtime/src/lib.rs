//! Shared protocol and artifact helpers for the in-sandbox world runtime.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::os::unix::net::UnixStream;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

pub const WORLD_ROOT: &str = "/tmp/chronicle/world";
pub const WORLD_SOCKET: &str = "/tmp/chronicle/world/worldd.sock";
pub const WORLD_PID_FILE: &str = "worldd.pid";
pub const DATASTORE_RUNTIME_DIR: &str = "datastores";
pub const POSTGRES_METADATA_FILE: &str = "postgres.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorldStatus {
    pub ready: bool,
    pub socket: String,
    pub bundle_sha: String,
    pub bundle_dir: String,
    pub pid: u32,
    pub uptime_ms: u64,
    pub interactions: usize,
    pub state_hash: String,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub datastore_urls: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorldInteraction {
    pub ordinal: u64,
    pub kind: String,
    pub service: String,
    pub method_path: String,
    pub request_fingerprint: String,
    pub match_kind: String,
    pub status_code: u16,
    pub duration_ms: u64,
    pub created_at_ms: u64,
    pub payload: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpMatchRequest {
    pub method: String,
    pub url: String,
    pub authority: String,
    pub path: String,
    pub path_query: String,
    #[serde(default)]
    pub headers: BTreeMap<String, String>,
    #[serde(default)]
    pub body: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpMatchResponse {
    pub service: String,
    pub match_kind: String,
    pub status_code: u16,
    #[serde(default)]
    pub headers: BTreeMap<String, String>,
    #[serde(default)]
    pub body: Value,
    pub request_fingerprint: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "rpc", rename_all = "snake_case")]
pub enum WorldRpcRequest {
    Status,
    StateHash,
    Export {
        out_dir: PathBuf,
    },
    RecordRuntimeEvent {
        event: String,
        payload: Value,
    },
    MatchHttp {
        request: HttpMatchRequest,
    },
    RecordHttp {
        service: String,
        method: String,
        path: String,
        status_code: u16,
        match_kind: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum WorldRpcResponse {
    Status(WorldStatus),
    StateHash {
        state_hash: String,
    },
    Export {
        out_dir: PathBuf,
        files: Vec<String>,
        coverage: CoverageReport,
    },
    HttpMatched(HttpMatchResponse),
    Recorded {
        ordinal: u64,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoverageReport {
    pub bundle_sha: String,
    pub state_hash: String,
    pub total_interactions: usize,
    pub by_kind: BTreeMap<String, usize>,
    pub by_match_kind: BTreeMap<String, usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StateDeltaReport {
    pub bundle_sha: String,
    pub state_hash: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub datastores: Vec<DatastoreDeltaReport>,
    pub changes: Vec<Value>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatastoreRuntimeMetadata {
    pub name: String,
    pub url: String,
    #[serde(default)]
    pub host: Option<String>,
    #[serde(default)]
    pub port: Option<u16>,
    #[serde(default)]
    pub database: Option<String>,
    #[serde(default)]
    pub user: Option<String>,
    #[serde(default)]
    pub data_dir: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatastoreSnapshot {
    pub name: String,
    pub captured_at_ms: u64,
    pub tables: Vec<DatastoreTableSnapshot>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatastoreTableSnapshot {
    pub schema: String,
    pub name: String,
    pub row_count: usize,
    pub columns: Vec<DatastoreColumnSnapshot>,
    pub rows: Vec<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatastoreColumnSnapshot {
    pub name: String,
    #[serde(rename = "type")]
    pub data_type: String,
    pub nullable: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatastoreSchemaFingerprint {
    pub datastore: String,
    pub sha256: String,
    pub tables: Vec<DatastoreSchemaTable>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatastoreSchemaTable {
    pub schema: String,
    pub name: String,
    pub columns: Vec<DatastoreColumnSnapshot>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatastoreDeltaReport {
    pub name: String,
    pub changed: bool,
    pub initial_row_count: usize,
    pub final_row_count: usize,
    pub inserted_rows: usize,
    pub deleted_rows: usize,
    pub tables: Vec<DatastoreTableDelta>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatastoreTableDelta {
    pub schema: String,
    pub name: String,
    pub initial_row_count: usize,
    pub final_row_count: usize,
    pub inserted_rows: Vec<Value>,
    pub deleted_rows: Vec<Value>,
}

#[derive(Debug, thiserror::Error)]
pub enum WorldRuntimeError {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("protocol error: {0}")]
    Protocol(String),
}

pub type WorldRuntimeResult<T> = Result<T, WorldRuntimeError>;

pub fn default_socket_for_bundle(bundle_dir: &Path) -> PathBuf {
    if bundle_dir == Path::new(WORLD_ROOT) {
        PathBuf::from(WORLD_SOCKET)
    } else {
        let mut hasher = Sha256::new();
        hasher.update(bundle_dir.to_string_lossy().as_bytes());
        let digest = hex::encode(hasher.finalize());
        std::env::temp_dir().join(format!("chronicle-worldd-{}.sock", &digest[..16]))
    }
}

pub fn pid_file_for_bundle(bundle_dir: &Path) -> PathBuf {
    bundle_dir.join(WORLD_PID_FILE)
}

pub fn read_bundle_sha(bundle_dir: &Path) -> WorldRuntimeResult<String> {
    let manifest = fs::read_to_string(bundle_dir.join("manifest.json"))?;
    let value: Value = serde_json::from_str(&manifest)?;
    Ok(value
        .get("sha256")
        .and_then(Value::as_str)
        .unwrap_or("unknown")
        .to_string())
}

pub fn write_env(bundle_dir: &Path, status: &WorldStatus) -> WorldRuntimeResult<()> {
    let ca = bundle_dir.join("security").join("ca.crt");
    let ca = ca.to_string_lossy();
    let mut env = format!(
        "export WORLD_RUN_ID=local\nexport WORLD_BUNDLE_SHA={bundle_sha}\nexport WORLD_SOCKET={socket}\nexport WORLD_STATE_HASH={state_hash}\nexport WORLD_RUNTIME_PID={pid}\nexport WORLD_CA_CERT={ca}\nexport HTTP_PROXY=http://127.0.0.1:8888\nexport HTTPS_PROXY=http://127.0.0.1:8888\nexport ALL_PROXY=http://127.0.0.1:8888\nexport NO_PROXY=127.0.0.1,localhost\nexport http_proxy=http://127.0.0.1:8888\nexport https_proxy=http://127.0.0.1:8888\nexport all_proxy=http://127.0.0.1:8888\nexport no_proxy=127.0.0.1,localhost\nexport SSL_CERT_FILE={ca}\nexport REQUESTS_CA_BUNDLE={ca}\nexport NODE_EXTRA_CA_CERTS={ca}\n",
        bundle_sha = status.bundle_sha,
        socket = status.socket,
        state_hash = status.state_hash,
        pid = status.pid,
        ca = ca,
    );
    if let Some((_, url)) = status.datastore_urls.iter().next() {
        env.push_str(&format!("export DATABASE_URL={url}\n"));
    }
    for (name, url) in &status.datastore_urls {
        let key = datastore_env_key(name);
        env.push_str(&format!("export CHRONICLE_DATASTORE_{key}_URL={url}\n"));
    }
    fs::write(bundle_dir.join("env"), env)?;
    Ok(())
}

pub fn datastore_env_key(name: &str) -> String {
    let mut out = String::new();
    for ch in name.chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch.to_ascii_uppercase());
        } else {
            out.push('_');
        }
    }
    let out = out.trim_matches('_').to_string();
    if out.is_empty() {
        "DATASTORE".to_string()
    } else {
        out
    }
}

pub fn datastore_urls_from_state_dir(
    state_dir: &Path,
) -> WorldRuntimeResult<BTreeMap<String, String>> {
    Ok(datastore_metadata_from_state_dir(state_dir)?
        .into_iter()
        .map(|metadata| (metadata.name, metadata.url))
        .collect())
}

pub fn datastore_metadata_from_state_dir(
    state_dir: &Path,
) -> WorldRuntimeResult<Vec<DatastoreRuntimeMetadata>> {
    let datastores = state_dir.join(DATASTORE_RUNTIME_DIR);
    let mut out = Vec::new();
    if !datastores.is_dir() {
        return Ok(out);
    }
    for entry in fs::read_dir(datastores)? {
        let entry = entry?;
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let metadata_path = path.join(POSTGRES_METADATA_FILE);
        if !metadata_path.is_file() {
            continue;
        }
        let mut metadata: DatastoreRuntimeMetadata =
            serde_json::from_slice(&fs::read(&metadata_path)?)?;
        if metadata.name.trim().is_empty() {
            metadata.name = entry.file_name().to_string_lossy().to_string();
        }
        if metadata.url.trim().is_empty() {
            continue;
        }
        out.push(metadata);
    }
    out.sort_by(|left, right| left.name.cmp(&right.name));
    Ok(out)
}

pub fn send_rpc(socket: &Path, request: &WorldRpcRequest) -> WorldRuntimeResult<WorldRpcResponse> {
    let mut stream = UnixStream::connect(socket)?;
    serde_json::to_writer(&mut stream, request)?;
    stream.write_all(b"\n")?;
    stream.flush()?;

    let mut reader = BufReader::new(stream);
    let mut line = String::new();
    reader.read_line(&mut line)?;
    if line.trim().is_empty() {
        return Err(WorldRuntimeError::Protocol(
            "worldd closed connection without a response".to_string(),
        ));
    }

    let envelope: RpcEnvelope = serde_json::from_str(&line)?;
    if let Some(error) = envelope.error {
        return Err(WorldRuntimeError::Protocol(error));
    }
    envelope
        .result
        .ok_or_else(|| WorldRuntimeError::Protocol("worldd returned no result".to_string()))
}

pub fn write_rpc_response(
    stream: &mut UnixStream,
    result: WorldRuntimeResult<WorldRpcResponse>,
) -> WorldRuntimeResult<()> {
    let envelope = match result {
        Ok(result) => RpcEnvelope {
            result: Some(result),
            error: None,
        },
        Err(err) => RpcEnvelope {
            result: None,
            error: Some(err.to_string()),
        },
    };
    serde_json::to_writer(&mut *stream, &envelope)?;
    stream.write_all(b"\n")?;
    stream.flush()?;
    Ok(())
}

pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |duration| duration.as_millis() as u64)
}

pub fn state_hash(
    bundle_sha: &str,
    interactions: &[WorldInteraction],
) -> WorldRuntimeResult<String> {
    let mut hasher = Sha256::new();
    hasher.update(bundle_sha.as_bytes());
    for interaction in interactions {
        hasher.update(serde_json::to_vec(interaction)?);
    }
    Ok(hex::encode(hasher.finalize()))
}

pub fn coverage_report(
    bundle_sha: &str,
    state_hash: &str,
    interactions: &[WorldInteraction],
) -> CoverageReport {
    let mut by_kind = BTreeMap::new();
    let mut by_match_kind = BTreeMap::new();
    for interaction in interactions {
        *by_kind.entry(interaction.kind.clone()).or_insert(0) += 1;
        *by_match_kind
            .entry(interaction.match_kind.clone())
            .or_insert(0) += 1;
    }
    CoverageReport {
        bundle_sha: bundle_sha.to_string(),
        state_hash: state_hash.to_string(),
        total_interactions: interactions.len(),
        by_kind,
        by_match_kind,
    }
}

pub fn write_export(
    out_dir: &Path,
    status: &WorldStatus,
    interactions: &[WorldInteraction],
) -> WorldRuntimeResult<(Vec<String>, CoverageReport)> {
    let state_delta = empty_state_delta(status);
    write_export_with_state_delta(out_dir, status, interactions, state_delta)
}

pub fn write_export_with_state_delta(
    out_dir: &Path,
    status: &WorldStatus,
    interactions: &[WorldInteraction],
    state_delta: StateDeltaReport,
) -> WorldRuntimeResult<(Vec<String>, CoverageReport)> {
    fs::create_dir_all(out_dir)?;
    let coverage = coverage_report(&status.bundle_sha, &status.state_hash, interactions);

    let interactions_path = out_dir.join("interactions.jsonl");
    let mut interactions_file = fs::File::create(&interactions_path)?;
    for interaction in interactions {
        serde_json::to_writer(&mut interactions_file, interaction)?;
        interactions_file.write_all(b"\n")?;
    }

    fs::write(
        out_dir.join("coverage.json"),
        serde_json::to_vec_pretty(&coverage)?,
    )?;
    fs::write(
        out_dir.join("state_delta.json"),
        serde_json::to_vec_pretty(&state_delta)?,
    )?;
    fs::write(
        out_dir.join("world_status.json"),
        serde_json::to_vec_pretty(status)?,
    )?;

    let mut files = vec![
        "interactions.jsonl".to_string(),
        "coverage.json".to_string(),
        "state_delta.json".to_string(),
        "world_status.json".to_string(),
    ];
    let state_diff_spec = PathBuf::from(&status.bundle_dir)
        .join("grading")
        .join("state_diff_spec.json");
    if state_diff_spec.is_file() {
        let grading_dir = out_dir.join("grading");
        fs::create_dir_all(&grading_dir)?;
        fs::copy(&state_diff_spec, grading_dir.join("state_diff_spec.json"))?;
        files.push("grading/state_diff_spec.json".to_string());
    }

    Ok((files, coverage))
}

pub fn empty_state_delta(status: &WorldStatus) -> StateDeltaReport {
    StateDeltaReport {
        bundle_sha: status.bundle_sha.clone(),
        state_hash: status.state_hash.clone(),
        datastores: Vec::new(),
        changes: Vec::new(),
        errors: Vec::new(),
    }
}

pub fn write_postgres_snapshot(
    datastore_name: &str,
    database_url: &str,
    out_path: &Path,
) -> WorldRuntimeResult<DatastoreSnapshot> {
    let snapshot = postgres_snapshot(datastore_name, database_url)?;
    if let Some(parent) = out_path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(out_path, serde_json::to_vec_pretty(&snapshot)?)?;
    Ok(snapshot)
}

pub fn export_datastore_state(
    state_dir: &Path,
    out_dir: &Path,
    status: &WorldStatus,
) -> WorldRuntimeResult<(Vec<String>, StateDeltaReport)> {
    let mut files = Vec::new();
    let mut report = empty_state_delta(status);
    let metadata = datastore_metadata_from_state_dir(state_dir)?;
    if metadata.is_empty() {
        return Ok((files, report));
    }

    let export_root = out_dir.join(DATASTORE_RUNTIME_DIR);
    fs::create_dir_all(&export_root)?;

    for datastore in metadata {
        let datastore_state_dir = state_dir.join(DATASTORE_RUNTIME_DIR).join(&datastore.name);
        let datastore_out_dir = export_root.join(&datastore.name);
        fs::create_dir_all(&datastore_out_dir)?;

        let initial_src = datastore_state_dir.join("initial_state.json");
        let initial_out = datastore_out_dir.join("initial_state.json");
        let final_out = datastore_out_dir.join("final_state.json");
        let schema_out = datastore_out_dir.join("schema_fingerprint.actual.json");

        let final_snapshot =
            match write_postgres_snapshot(&datastore.name, &datastore.url, &final_out) {
                Ok(snapshot) => snapshot,
                Err(err) => {
                    report
                        .errors
                        .push(format!("{} final snapshot failed: {err}", datastore.name));
                    continue;
                }
            };
        files.push(format!(
            "{DATASTORE_RUNTIME_DIR}/{}/final_state.json",
            datastore.name
        ));

        let schema = schema_fingerprint(&final_snapshot)?;
        fs::write(&schema_out, serde_json::to_vec_pretty(&schema)?)?;
        files.push(format!(
            "{DATASTORE_RUNTIME_DIR}/{}/schema_fingerprint.actual.json",
            datastore.name
        ));

        let initial_snapshot = if initial_src.is_file() {
            fs::copy(&initial_src, &initial_out)?;
            files.push(format!(
                "{DATASTORE_RUNTIME_DIR}/{}/initial_state.json",
                datastore.name
            ));
            serde_json::from_slice::<DatastoreSnapshot>(&fs::read(&initial_src)?)?
        } else {
            report
                .errors
                .push(format!("{} initial snapshot missing", datastore.name));
            DatastoreSnapshot {
                name: datastore.name.clone(),
                captured_at_ms: 0,
                tables: Vec::new(),
            }
        };

        let delta = diff_datastore_snapshots(&datastore.name, &initial_snapshot, &final_snapshot);
        report.changes.push(serde_json::to_value(&delta)?);
        report.datastores.push(delta);
    }

    Ok((files, report))
}

pub fn postgres_snapshot(
    datastore_name: &str,
    database_url: &str,
) -> WorldRuntimeResult<DatastoreSnapshot> {
    let table_refs = list_postgres_tables(database_url)?;
    let mut tables = Vec::new();
    for table in table_refs {
        let columns = postgres_table_columns(database_url, &table.schema, &table.name)?;
        let rows = postgres_table_rows(database_url, &table.schema, &table.name)?;
        tables.push(DatastoreTableSnapshot {
            schema: table.schema,
            name: table.name,
            row_count: rows.len(),
            columns,
            rows,
        });
    }
    Ok(DatastoreSnapshot {
        name: datastore_name.to_string(),
        captured_at_ms: now_ms(),
        tables,
    })
}

pub fn diff_datastore_snapshots(
    name: &str,
    initial: &DatastoreSnapshot,
    final_snapshot: &DatastoreSnapshot,
) -> DatastoreDeltaReport {
    let mut tables = Vec::new();
    let mut initial_row_count = 0;
    let mut final_row_count = 0;
    let mut inserted_rows = 0;
    let mut deleted_rows = 0;
    let mut table_keys = BTreeMap::new();
    for table in &initial.tables {
        table_keys.insert(
            (table.schema.clone(), table.name.clone()),
            (Some(table), None::<&DatastoreTableSnapshot>),
        );
    }
    for table in &final_snapshot.tables {
        table_keys
            .entry((table.schema.clone(), table.name.clone()))
            .and_modify(|(_, final_slot)| *final_slot = Some(table))
            .or_insert((None, Some(table)));
    }

    for ((schema, table_name), (initial_table, final_table)) in table_keys {
        let initial_rows = initial_table
            .map(|table| table.rows.as_slice())
            .unwrap_or(&[]);
        let final_rows = final_table
            .map(|table| table.rows.as_slice())
            .unwrap_or(&[]);
        let deleted = row_multiset_difference(initial_rows, final_rows);
        let inserted = row_multiset_difference(final_rows, initial_rows);
        let initial_count = initial_rows.len();
        let final_count = final_rows.len();
        initial_row_count += initial_count;
        final_row_count += final_count;
        inserted_rows += inserted.len();
        deleted_rows += deleted.len();
        tables.push(DatastoreTableDelta {
            schema,
            name: table_name,
            initial_row_count: initial_count,
            final_row_count: final_count,
            inserted_rows: inserted,
            deleted_rows: deleted,
        });
    }

    DatastoreDeltaReport {
        name: name.to_string(),
        changed: inserted_rows > 0 || deleted_rows > 0,
        initial_row_count,
        final_row_count,
        inserted_rows,
        deleted_rows,
        tables,
    }
}

pub fn schema_fingerprint(
    snapshot: &DatastoreSnapshot,
) -> WorldRuntimeResult<DatastoreSchemaFingerprint> {
    let tables = snapshot
        .tables
        .iter()
        .map(|table| DatastoreSchemaTable {
            schema: table.schema.clone(),
            name: table.name.clone(),
            columns: table.columns.clone(),
        })
        .collect::<Vec<_>>();
    let mut hasher = Sha256::new();
    hasher.update(serde_json::to_vec(&tables)?);
    Ok(DatastoreSchemaFingerprint {
        datastore: snapshot.name.clone(),
        sha256: hex::encode(hasher.finalize()),
        tables,
    })
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PgTableRef {
    schema: String,
    name: String,
}

fn list_postgres_tables(database_url: &str) -> WorldRuntimeResult<Vec<PgTableRef>> {
    let query = r#"
        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object('schema', table_schema, 'name', table_name)
                ORDER BY table_schema, table_name
            ),
            '[]'::jsonb
        )::text
        FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
          AND table_schema NOT IN ('pg_catalog', 'information_schema');
    "#;
    let value = psql_json(database_url, query)?;
    Ok(serde_json::from_value(value)?)
}

fn postgres_table_columns(
    database_url: &str,
    schema: &str,
    table: &str,
) -> WorldRuntimeResult<Vec<DatastoreColumnSnapshot>> {
    let query = format!(
        r#"
        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'name', column_name,
                    'type', data_type,
                    'nullable', is_nullable = 'YES',
                    'default', column_default
                )
                ORDER BY ordinal_position
            ),
            '[]'::jsonb
        )::text
        FROM information_schema.columns
        WHERE table_schema = {}
          AND table_name = {};
        "#,
        sql_literal(schema),
        sql_literal(table)
    );
    let value = psql_json(database_url, &query)?;
    Ok(serde_json::from_value(value)?)
}

fn postgres_table_rows(
    database_url: &str,
    schema: &str,
    table: &str,
) -> WorldRuntimeResult<Vec<Value>> {
    let query = format!(
        r#"
        SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data::text), '[]'::jsonb)::text
        FROM (
            SELECT to_jsonb(t) AS row_data
            FROM {}.{} AS t
        ) AS rows;
        "#,
        sql_ident(schema),
        sql_ident(table)
    );
    let value = psql_json(database_url, &query)?;
    Ok(serde_json::from_value(value)?)
}

fn psql_json(database_url: &str, query: &str) -> WorldRuntimeResult<Value> {
    let output = Command::new("psql")
        .arg(database_url)
        .arg("-X")
        .arg("-q")
        .arg("-tA")
        .arg("-v")
        .arg("ON_ERROR_STOP=1")
        .arg("-c")
        .arg(query)
        .output()?;
    if !output.status.success() {
        return Err(WorldRuntimeError::Protocol(format!(
            "psql query failed with status {}; stderr: {}",
            output.status,
            String::from_utf8_lossy(&output.stderr)
        )));
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str(stdout.trim()).map_err(WorldRuntimeError::from)
}

fn sql_ident(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}

fn sql_literal(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

fn row_multiset_difference(left: &[Value], right: &[Value]) -> Vec<Value> {
    let mut right_counts = BTreeMap::<String, usize>::new();
    for row in right {
        *right_counts.entry(canonical_row(row)).or_insert(0) += 1;
    }

    let mut out = Vec::new();
    for row in left {
        let key = canonical_row(row);
        match right_counts.get_mut(&key) {
            Some(count) if *count > 0 => *count -= 1,
            _ => out.push(row.clone()),
        }
    }
    out
}

fn canonical_row(row: &Value) -> String {
    serde_json::to_string(row).unwrap_or_else(|_| row.to_string())
}

pub fn runtime_interaction(
    ordinal: u64,
    service: impl Into<String>,
    method_path: impl Into<String>,
    match_kind: impl Into<String>,
    payload: Value,
) -> WorldInteraction {
    WorldInteraction {
        ordinal,
        kind: "runtime".to_string(),
        service: service.into(),
        method_path: method_path.into(),
        request_fingerprint: format!("runtime:{ordinal}"),
        match_kind: match_kind.into(),
        status_code: 200,
        duration_ms: 0,
        created_at_ms: now_ms(),
        payload,
    }
}

pub fn http_interaction(
    ordinal: u64,
    service: String,
    method: String,
    path: String,
    status_code: u16,
    match_kind: String,
) -> WorldInteraction {
    WorldInteraction {
        ordinal,
        kind: "http".to_string(),
        service,
        method_path: format!("{method} {path}"),
        request_fingerprint: format!("http:{method}:{path}"),
        match_kind,
        status_code,
        duration_ms: 0,
        created_at_ms: now_ms(),
        payload: json!({}),
    }
}

pub fn http_interaction_with_payload(
    ordinal: u64,
    service: String,
    method: String,
    path: String,
    status_code: u16,
    match_kind: String,
    request_fingerprint: String,
    duration_ms: u64,
    payload: Value,
) -> WorldInteraction {
    WorldInteraction {
        ordinal,
        kind: "http".to_string(),
        service,
        method_path: format!("{method} {path}"),
        request_fingerprint,
        match_kind,
        status_code,
        duration_ms,
        created_at_ms: now_ms(),
        payload,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct RpcEnvelope {
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<WorldRpcResponse>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn state_hash_changes_with_interactions() {
        let empty = state_hash("sha", &[]).unwrap();
        let one = state_hash(
            "sha",
            &[runtime_interaction(
                0,
                "worldd",
                "boot",
                "runtime",
                json!({"ready": true}),
            )],
        )
        .unwrap();
        assert_ne!(empty, one);
    }

    #[test]
    fn export_artifacts_are_non_empty() {
        let tmp = tempfile::tempdir().unwrap();
        let interactions = vec![runtime_interaction(
            0,
            "worldd",
            "boot",
            "runtime",
            json!({"ready": true}),
        )];
        let hash = state_hash("sha", &interactions).unwrap();
        let status = WorldStatus {
            ready: true,
            socket: "/tmp/world.sock".to_string(),
            bundle_sha: "sha".to_string(),
            bundle_dir: "/tmp/world".to_string(),
            pid: 42,
            uptime_ms: 10,
            interactions: interactions.len(),
            state_hash: hash,
            datastore_urls: BTreeMap::new(),
        };
        let (files, coverage) = write_export(tmp.path(), &status, &interactions).unwrap();
        assert_eq!(coverage.total_interactions, 1);
        assert!(files.contains(&"world_status.json".to_string()));
        assert!(
            tmp.path()
                .join("interactions.jsonl")
                .metadata()
                .unwrap()
                .len()
                > 0
        );
        assert!(tmp.path().join("coverage.json").metadata().unwrap().len() > 0);
        assert!(
            tmp.path()
                .join("state_delta.json")
                .metadata()
                .unwrap()
                .len()
                > 0
        );
    }

    #[test]
    fn export_artifacts_include_state_diff_spec_when_bundle_has_one() {
        let bundle = tempfile::tempdir().unwrap();
        let out = tempfile::tempdir().unwrap();
        fs::create_dir_all(bundle.path().join("grading")).unwrap();
        fs::write(
            bundle.path().join("grading/state_diff_spec.json"),
            serde_json::to_vec_pretty(&json!({
                "datastores": [{
                    "name": "appdb",
                    "expectedDelta": { "changed": true }
                }]
            }))
            .unwrap(),
        )
        .unwrap();
        let status = WorldStatus {
            ready: true,
            socket: "/tmp/world.sock".to_string(),
            bundle_sha: "sha".to_string(),
            bundle_dir: bundle.path().to_string_lossy().to_string(),
            pid: 42,
            uptime_ms: 10,
            interactions: 0,
            state_hash: "state".to_string(),
            datastore_urls: BTreeMap::new(),
        };

        let (files, _) = write_export(out.path(), &status, &[]).unwrap();

        assert!(files.contains(&"grading/state_diff_spec.json".to_string()));
        let exported = fs::read_to_string(out.path().join("grading/state_diff_spec.json")).unwrap();
        assert!(exported.contains("expectedDelta"));
    }

    #[test]
    fn env_includes_database_urls_when_datastores_are_present() {
        let tmp = tempfile::tempdir().unwrap();
        fs::create_dir_all(tmp.path().join("security")).unwrap();
        fs::write(tmp.path().join("security/ca.crt"), "ca").unwrap();
        let mut datastore_urls = BTreeMap::new();
        datastore_urls.insert(
            "app-db".to_string(),
            "postgres://chronicle@127.0.0.1:15432/appdb".to_string(),
        );
        let status = WorldStatus {
            ready: true,
            socket: "/tmp/world.sock".to_string(),
            bundle_sha: "sha".to_string(),
            bundle_dir: tmp.path().to_string_lossy().to_string(),
            pid: 42,
            uptime_ms: 10,
            interactions: 0,
            state_hash: "state".to_string(),
            datastore_urls,
        };
        write_env(tmp.path(), &status).unwrap();
        let env = fs::read_to_string(tmp.path().join("env")).unwrap();
        assert!(env.contains("export DATABASE_URL=postgres://chronicle@127.0.0.1:15432/appdb"));
        assert!(env.contains(
            "export CHRONICLE_DATASTORE_APP_DB_URL=postgres://chronicle@127.0.0.1:15432/appdb"
        ));
    }

    #[test]
    fn reads_datastore_urls_from_runtime_metadata() {
        let tmp = tempfile::tempdir().unwrap();
        let metadata_dir = tmp.path().join("datastores/appdb");
        fs::create_dir_all(&metadata_dir).unwrap();
        fs::write(
            metadata_dir.join("postgres.json"),
            br#"{"name":"appdb","url":"postgres://chronicle@127.0.0.1:15432/appdb"}"#,
        )
        .unwrap();
        let urls = datastore_urls_from_state_dir(tmp.path()).unwrap();
        assert_eq!(
            urls.get("appdb"),
            Some(&"postgres://chronicle@127.0.0.1:15432/appdb".to_string())
        );
    }

    #[test]
    fn datastore_snapshot_diff_reports_inserted_and_deleted_rows() {
        let initial = DatastoreSnapshot {
            name: "appdb".to_string(),
            captured_at_ms: 1,
            tables: vec![DatastoreTableSnapshot {
                schema: "public".to_string(),
                name: "items".to_string(),
                row_count: 2,
                columns: Vec::new(),
                rows: vec![json!({"id": 1, "name": "old"}), json!({"id": 2})],
            }],
        };
        let final_snapshot = DatastoreSnapshot {
            name: "appdb".to_string(),
            captured_at_ms: 2,
            tables: vec![DatastoreTableSnapshot {
                schema: "public".to_string(),
                name: "items".to_string(),
                row_count: 2,
                columns: Vec::new(),
                rows: vec![json!({"id": 2}), json!({"id": 3, "name": "new"})],
            }],
        };

        let diff = diff_datastore_snapshots("appdb", &initial, &final_snapshot);

        assert!(diff.changed);
        assert_eq!(diff.initial_row_count, 2);
        assert_eq!(diff.final_row_count, 2);
        assert_eq!(diff.inserted_rows, 1);
        assert_eq!(diff.deleted_rows, 1);
        assert_eq!(
            diff.tables[0].inserted_rows,
            vec![json!({"id": 3, "name": "new"})]
        );
        assert_eq!(
            diff.tables[0].deleted_rows,
            vec![json!({"id": 1, "name": "old"})]
        );
    }
}
