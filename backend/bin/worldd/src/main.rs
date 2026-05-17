use anyhow::{Context, Result};
use chronicle_world_runtime::{
    datastore_urls_from_state_dir, default_socket_for_bundle, export_datastore_state,
    http_interaction, http_interaction_with_payload, read_bundle_sha, runtime_interaction,
    state_hash, write_export_with_state_delta, write_rpc_response, HttpMatchRequest,
    HttpMatchResponse, WorldInteraction, WorldRpcRequest, WorldRpcResponse, WorldStatus,
};
use rusqlite::Connection;
use serde::Deserialize;
use serde_json::json;
use serde_json::Value;
use sha2::Digest;
use std::collections::{BTreeMap, BTreeSet, HashMap};
use std::fs;
use std::io::{BufRead, BufReader};
use std::os::unix::net::{UnixListener, UnixStream};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Instant;

fn main() -> Result<()> {
    let args = Args::parse()?;
    fs::create_dir_all(&args.state_dir)?;
    if let Some(parent) = args.socket.parent() {
        fs::create_dir_all(parent)?;
    }
    if args.socket.exists() {
        fs::remove_file(&args.socket).with_context(|| {
            format!(
                "remove stale worldd socket at {}",
                args.socket.to_string_lossy()
            )
        })?;
    }

    let bundle_sha = read_bundle_sha(&args.bundle).context("read bundle sha")?;
    let state = Arc::new(Mutex::new(WorldState::new(
        args.bundle.clone(),
        args.socket.clone(),
        args.state_dir.clone(),
        bundle_sha,
    )?));
    let listener = UnixListener::bind(&args.socket)
        .with_context(|| format!("bind worldd socket {}", args.socket.to_string_lossy()))?;
    eprintln!(
        "worldd listening socket={} bundle={}",
        args.socket.to_string_lossy(),
        args.bundle.to_string_lossy()
    );

    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                let state = Arc::clone(&state);
                if let Err(err) = handle_stream(stream, &state) {
                    eprintln!("worldd request failed: {err:#}");
                }
            }
            Err(err) => eprintln!("worldd accept failed: {err}"),
        }
    }
    Ok(())
}

fn handle_stream(mut stream: UnixStream, state: &Arc<Mutex<WorldState>>) -> Result<()> {
    let mut line = String::new();
    {
        let mut reader = BufReader::new(&stream);
        reader.read_line(&mut line)?;
    }
    let request: WorldRpcRequest = serde_json::from_str(&line).context("decode world rpc")?;
    let response = {
        let mut state = state.lock().expect("world state mutex poisoned");
        state.handle(request)
    };
    write_rpc_response(&mut stream, response)?;
    Ok(())
}

#[derive(Debug)]
struct Args {
    bundle: PathBuf,
    socket: PathBuf,
    state_dir: PathBuf,
}

impl Args {
    fn parse() -> Result<Self> {
        let mut raw = std::env::args().skip(1);
        let mut bundle = None;
        let mut socket = None;
        let mut state_dir = None;
        while let Some(arg) = raw.next() {
            match arg.as_str() {
                "--bundle" => bundle = raw.next().map(PathBuf::from),
                "--socket" => socket = raw.next().map(PathBuf::from),
                "--state-dir" => state_dir = raw.next().map(PathBuf::from),
                "--help" | "-h" => {
                    println!("usage: worldd --bundle <dir> [--socket <path>] [--state-dir <dir>]");
                    std::process::exit(0);
                }
                other => anyhow::bail!("unknown worldd argument: {other}"),
            }
        }
        let bundle = bundle.context("--bundle is required")?;
        let socket = socket.unwrap_or_else(|| default_socket_for_bundle(&bundle));
        let state_dir = state_dir.unwrap_or_else(|| bundle.join("runtime"));
        Ok(Self {
            bundle,
            socket,
            state_dir,
        })
    }
}

#[derive(Debug)]
struct WorldState {
    bundle_dir: PathBuf,
    socket: PathBuf,
    state_dir: PathBuf,
    bundle_sha: String,
    started_at: Instant,
    interactions: Vec<WorldInteraction>,
    replay: ReplayStore,
}

impl WorldState {
    fn new(
        bundle_dir: PathBuf,
        socket: PathBuf,
        state_dir: PathBuf,
        bundle_sha: String,
    ) -> Result<Self> {
        let replay = ReplayStore::load(&bundle_dir).context("load replay indexes")?;
        let mut state = Self {
            bundle_dir,
            socket,
            state_dir,
            bundle_sha,
            started_at: Instant::now(),
            interactions: Vec::new(),
            replay,
        };
        state.record(runtime_interaction(
            0,
            "worldd",
            "boot",
            "runtime",
            json!({
            "bundleSha": state.bundle_sha.clone(),
            "pid": std::process::id(),
            }),
        ));
        Ok(state)
    }

    fn handle(
        &mut self,
        request: WorldRpcRequest,
    ) -> chronicle_world_runtime::WorldRuntimeResult<WorldRpcResponse> {
        match request {
            WorldRpcRequest::Status => Ok(WorldRpcResponse::Status(self.status()?)),
            WorldRpcRequest::StateHash => Ok(WorldRpcResponse::StateHash {
                state_hash: self.hash()?,
            }),
            WorldRpcRequest::Export { out_dir } => {
                self.record(runtime_interaction(
                    self.next_ordinal(),
                    "worldd",
                    "export",
                    "runtime",
                    json!({ "outDir": out_dir.clone() }),
                ));
                let status = self.status()?;
                let (mut datastore_files, state_delta) =
                    export_datastore_state(&self.state_dir, &out_dir, &status)?;
                let (mut files, coverage) = write_export_with_state_delta(
                    &out_dir,
                    &status,
                    &self.interactions,
                    state_delta,
                )?;
                files.append(&mut datastore_files);
                Ok(WorldRpcResponse::Export {
                    out_dir,
                    files,
                    coverage,
                })
            }
            WorldRpcRequest::RecordRuntimeEvent { event, payload } => {
                let ordinal = self.next_ordinal();
                self.record(runtime_interaction(
                    ordinal, "worldd", event, "runtime", payload,
                ));
                Ok(WorldRpcResponse::Recorded { ordinal })
            }
            WorldRpcRequest::MatchHttp { request } => {
                let started = Instant::now();
                let outcome = self.replay.match_http(&request);
                let duration_ms = started.elapsed().as_millis() as u64;
                let ordinal = self.next_ordinal();
                self.record(http_interaction_with_payload(
                    ordinal,
                    outcome.service.clone(),
                    request.method.clone(),
                    request.path_query.clone(),
                    outcome.status_code,
                    outcome.match_kind.clone(),
                    outcome.request_fingerprint.clone(),
                    duration_ms,
                    json!({
                        "request": request.clone(),
                        "response": outcome.clone(),
                    }),
                ));
                Ok(WorldRpcResponse::HttpMatched(outcome))
            }
            WorldRpcRequest::RecordHttp {
                service,
                method,
                path,
                status_code,
                match_kind,
            } => {
                let ordinal = self.next_ordinal();
                self.record(http_interaction(
                    ordinal,
                    service,
                    method,
                    path,
                    status_code,
                    match_kind,
                ));
                Ok(WorldRpcResponse::Recorded { ordinal })
            }
        }
    }

    fn status(&self) -> chronicle_world_runtime::WorldRuntimeResult<WorldStatus> {
        Ok(WorldStatus {
            ready: true,
            socket: self.socket.to_string_lossy().to_string(),
            bundle_sha: self.bundle_sha.clone(),
            bundle_dir: self.bundle_dir.to_string_lossy().to_string(),
            pid: std::process::id(),
            uptime_ms: self.started_at.elapsed().as_millis() as u64,
            interactions: self.interactions.len(),
            state_hash: self.hash()?,
            datastore_urls: datastore_urls_from_state_dir(&self.state_dir)?,
        })
    }

    fn hash(&self) -> chronicle_world_runtime::WorldRuntimeResult<String> {
        state_hash(&self.bundle_sha, &self.interactions)
    }

    fn next_ordinal(&self) -> u64 {
        self.interactions.len() as u64
    }

    fn record(&mut self, interaction: WorldInteraction) {
        self.interactions.push(interaction);
    }
}

#[derive(Debug)]
struct ReplayStore {
    entries: Vec<ReplayEntry>,
    known_authorities: BTreeSet<String>,
    consumed_by_key: HashMap<String, usize>,
}

impl ReplayStore {
    fn load(bundle_dir: &std::path::Path) -> Result<Self> {
        let services_dir = bundle_dir.join("services");
        let mut entries = Vec::new();
        if services_dir.is_dir() {
            for service in fs::read_dir(&services_dir).context("read services dir")? {
                let service = service?;
                let service_dir = service.path();
                if !service_dir.is_dir() {
                    continue;
                }
                let service_name = service.file_name().to_string_lossy().to_string();
                let index = service_dir.join("replay_index.sqlite");
                if index.is_file() {
                    entries.extend(load_service_entries(&index, &service_name)?);
                }
            }
        }
        entries.sort_by_key(|entry| entry.ordinal);
        let known_authorities = entries
            .iter()
            .map(|entry| entry.authority.clone())
            .collect();
        Ok(Self {
            entries,
            known_authorities,
            consumed_by_key: HashMap::new(),
        })
    }

    fn match_http(&mut self, request: &HttpMatchRequest) -> HttpMatchResponse {
        let method = request.method.to_ascii_uppercase();
        let authority = canonical_authority(&request.authority);
        let path_query = normalize_path_query(&request.path_query, &request.path);
        let path = normalize_path(&request.path);
        let fingerprint = request_fingerprint(&authority, &method, &path_query, &request.body);

        if let Some(entry) = self.next_entry(&authority, &method, &path_query, true) {
            return entry.to_response("replay", fingerprint);
        }
        if let Some(entry) = self.next_entry(&authority, &method, &path, false) {
            return entry.to_response("replay", fingerprint);
        }

        if !self.known_authorities.is_empty() && !self.known_authorities.contains(&authority) {
            return HttpMatchResponse {
                service: service_for_authority(&authority),
                match_kind: "blocked".to_string(),
                status_code: 502,
                headers: json_headers(),
                body: json!({
                    "error": "chronicle world blocked traffic to an undeclared authority",
                    "method": method,
                    "authority": authority,
                    "path": path_query,
                }),
                request_fingerprint: fingerprint,
            };
        }

        if is_read_method(&method) {
            return HttpMatchResponse {
                service: service_for_authority(&authority),
                match_kind: "fallback".to_string(),
                status_code: 200,
                headers: json_headers(),
                body: json!({}),
                request_fingerprint: fingerprint,
            };
        }

        HttpMatchResponse {
            service: service_for_authority(&authority),
            match_kind: "unmatched".to_string(),
            status_code: 501,
            headers: json_headers(),
            body: json!({
                "error": "chronicle world has no replay for this write operation",
                "method": method,
                "authority": authority,
                "path": path_query,
            }),
            request_fingerprint: fingerprint,
        }
    }

    fn next_entry(
        &mut self,
        authority: &str,
        method: &str,
        path: &str,
        include_query: bool,
    ) -> Option<&ReplayEntry> {
        let key = format!(
            "{}\n{}\n{}\n{}",
            authority,
            method,
            if include_query { "query" } else { "path" },
            path
        );
        let consumed = *self.consumed_by_key.get(&key).unwrap_or(&0);
        let mut seen = 0usize;
        for (idx, entry) in self.entries.iter().enumerate() {
            let entry_path = if include_query {
                &entry.path_query
            } else {
                &entry.path
            };
            if entry.authority == authority && entry.method == method && entry_path == path {
                if seen == consumed {
                    self.consumed_by_key.insert(key, consumed + 1);
                    return self.entries.get(idx);
                }
                seen += 1;
            }
        }
        None
    }
}

#[derive(Debug, Clone)]
struct ReplayEntry {
    ordinal: u64,
    service: String,
    authority: String,
    method: String,
    path: String,
    path_query: String,
    response: StoredResponse,
}

impl ReplayEntry {
    fn to_response(&self, match_kind: &str, request_fingerprint: String) -> HttpMatchResponse {
        HttpMatchResponse {
            service: self.service.clone(),
            match_kind: match_kind.to_string(),
            status_code: self.response.status_code,
            headers: self.response.headers.clone(),
            body: self.response.body.clone(),
            request_fingerprint,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredResponse {
    status_code: u16,
    #[serde(default)]
    headers: BTreeMap<String, String>,
    #[serde(default)]
    body: Value,
}

fn load_service_entries(index: &std::path::Path, service: &str) -> Result<Vec<ReplayEntry>> {
    let conn = Connection::open(index)
        .with_context(|| format!("open replay index {}", index.to_string_lossy()))?;
    let mut stmt = conn.prepare(
        r#"
        SELECT ordinal, service, authority, method, path, path_query, response_json
        FROM replay_interactions
        ORDER BY ordinal ASC
        "#,
    )?;
    let mut rows = stmt.query([])?;
    let mut entries = Vec::new();
    while let Some(row) = rows.next()? {
        let response_json: String = row.get(6)?;
        let response: StoredResponse = serde_json::from_str(&response_json)
            .with_context(|| format!("decode response_json from {}", index.to_string_lossy()))?;
        let service_from_db: String = row.get(1)?;
        entries.push(ReplayEntry {
            ordinal: row.get::<_, i64>(0)?.max(0) as u64,
            service: if service_from_db.is_empty() {
                service.to_string()
            } else {
                service_from_db
            },
            authority: canonical_authority(&row.get::<_, String>(2)?),
            method: row.get::<_, String>(3)?.to_ascii_uppercase(),
            path: normalize_path(&row.get::<_, String>(4)?),
            path_query: normalize_path_query(&row.get::<_, String>(5)?, &row.get::<_, String>(4)?),
            response,
        });
    }
    Ok(entries)
}

fn canonical_authority(raw: &str) -> String {
    let lower = raw
        .trim()
        .trim_start_matches("http://")
        .trim_start_matches("https://")
        .trim_end_matches('/')
        .to_ascii_lowercase();
    lower
        .strip_suffix(":443")
        .or_else(|| lower.strip_suffix(":80"))
        .unwrap_or(&lower)
        .to_string()
}

fn normalize_path(raw: &str) -> String {
    let without_query = raw.split_once('?').map(|(path, _)| path).unwrap_or(raw);
    if without_query.is_empty() {
        "/".to_string()
    } else if without_query.starts_with('/') {
        without_query.to_string()
    } else {
        format!("/{without_query}")
    }
}

fn normalize_path_query(raw_path_query: &str, fallback_path: &str) -> String {
    let raw = if raw_path_query.trim().is_empty() {
        fallback_path
    } else {
        raw_path_query
    };
    if raw.is_empty() {
        "/".to_string()
    } else if raw.starts_with('/') {
        raw.to_string()
    } else {
        format!("/{raw}")
    }
}

fn request_fingerprint(authority: &str, method: &str, path_query: &str, body: &Value) -> String {
    let mut hasher = sha2::Sha256::new();
    hasher.update(authority.as_bytes());
    hasher.update(b"\n");
    hasher.update(method.as_bytes());
    hasher.update(b"\n");
    hasher.update(path_query.as_bytes());
    hasher.update(b"\n");
    if let Ok(bytes) = serde_json::to_vec(body) {
        hasher.update(bytes);
    }
    format!("http:{}", hex::encode(hasher.finalize()))
}

fn is_read_method(method: &str) -> bool {
    matches!(method, "GET" | "HEAD" | "OPTIONS")
}

fn json_headers() -> BTreeMap<String, String> {
    BTreeMap::from([("content-type".to_string(), "application/json".to_string())])
}

fn service_for_authority(authority: &str) -> String {
    let mut out = String::from("http_");
    for ch in authority.chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch);
        } else if !out.ends_with('_') {
            out.push('_');
        }
    }
    out.trim_end_matches('_').to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;
    use std::collections::BTreeMap;

    #[test]
    fn match_http_replays_indexed_response() {
        let tmp = tempfile::tempdir().unwrap();
        write_manifest(tmp.path(), "sha_replay");
        write_replay_index(
            tmp.path(),
            "catalog",
            "api.example.com",
            "GET",
            "/v1/items",
            "/v1/items?limit=10",
            json!({
                "statusCode": 200,
                "headers": { "content-type": "application/json" },
                "body": { "items": [{ "id": "item_1" }] }
            }),
        );

        let mut state = WorldState::new(
            tmp.path().to_path_buf(),
            tmp.path().join("worldd.sock"),
            tmp.path().join("runtime"),
            "sha_replay".to_string(),
        )
        .unwrap();

        let response = state
            .handle(WorldRpcRequest::MatchHttp {
                request: HttpMatchRequest {
                    method: "GET".to_string(),
                    url: "https://api.example.com/v1/items?limit=10".to_string(),
                    authority: "api.example.com".to_string(),
                    path: "/v1/items".to_string(),
                    path_query: "/v1/items?limit=10".to_string(),
                    headers: BTreeMap::new(),
                    body: Value::Null,
                },
            })
            .unwrap();

        let WorldRpcResponse::HttpMatched(matched) = response else {
            panic!("expected http match response");
        };
        assert_eq!(matched.service, "catalog");
        assert_eq!(matched.match_kind, "replay");
        assert_eq!(matched.status_code, 200);
        assert_eq!(matched.body["items"][0]["id"], "item_1");
        assert_eq!(state.interactions.len(), 2);
        assert_eq!(state.interactions[1].kind, "http");
        assert_eq!(state.interactions[1].match_kind, "replay");
    }

    #[test]
    fn unmatched_write_fails_closed_and_records_interaction() {
        let tmp = tempfile::tempdir().unwrap();
        write_manifest(tmp.path(), "sha_empty");
        fs::create_dir_all(tmp.path().join("services")).unwrap();

        let mut state = WorldState::new(
            tmp.path().to_path_buf(),
            tmp.path().join("worldd.sock"),
            tmp.path().join("runtime"),
            "sha_empty".to_string(),
        )
        .unwrap();

        let response = state
            .handle(WorldRpcRequest::MatchHttp {
                request: HttpMatchRequest {
                    method: "POST".to_string(),
                    url: "https://api.example.com/v1/items".to_string(),
                    authority: "api.example.com".to_string(),
                    path: "/v1/items".to_string(),
                    path_query: "/v1/items".to_string(),
                    headers: BTreeMap::new(),
                    body: json!({ "name": "Novel write" }),
                },
            })
            .unwrap();

        let WorldRpcResponse::HttpMatched(matched) = response else {
            panic!("expected http match response");
        };
        assert_eq!(matched.match_kind, "unmatched");
        assert_eq!(matched.status_code, 501);
        assert_eq!(state.interactions[1].match_kind, "unmatched");
    }

    #[test]
    fn unmatched_read_gets_safe_empty_fallback() {
        let tmp = tempfile::tempdir().unwrap();
        write_manifest(tmp.path(), "sha_empty");
        write_replay_index(
            tmp.path(),
            "catalog",
            "api.example.com",
            "GET",
            "/v1/items",
            "/v1/items?limit=10",
            json!({
                "statusCode": 200,
                "headers": { "content-type": "application/json" },
                "body": { "items": [] }
            }),
        );

        let mut state = WorldState::new(
            tmp.path().to_path_buf(),
            tmp.path().join("worldd.sock"),
            tmp.path().join("runtime"),
            "sha_empty".to_string(),
        )
        .unwrap();

        let response = state
            .handle(WorldRpcRequest::MatchHttp {
                request: HttpMatchRequest {
                    method: "GET".to_string(),
                    url: "https://api.example.com/v1/missing".to_string(),
                    authority: "api.example.com".to_string(),
                    path: "/v1/missing".to_string(),
                    path_query: "/v1/missing".to_string(),
                    headers: BTreeMap::new(),
                    body: Value::Null,
                },
            })
            .unwrap();

        let WorldRpcResponse::HttpMatched(matched) = response else {
            panic!("expected http match response");
        };
        assert_eq!(matched.match_kind, "fallback");
        assert_eq!(matched.status_code, 200);
        assert_eq!(matched.body, json!({}));
    }

    #[test]
    fn unknown_authority_fails_closed_and_records_blocked_interaction() {
        let tmp = tempfile::tempdir().unwrap();
        write_manifest(tmp.path(), "sha_blocked");
        write_replay_index(
            tmp.path(),
            "catalog",
            "api.example.com",
            "GET",
            "/v1/items",
            "/v1/items?limit=10",
            json!({
                "statusCode": 200,
                "headers": { "content-type": "application/json" },
                "body": { "items": [] }
            }),
        );

        let mut state = WorldState::new(
            tmp.path().to_path_buf(),
            tmp.path().join("worldd.sock"),
            tmp.path().join("runtime"),
            "sha_blocked".to_string(),
        )
        .unwrap();

        let response = state
            .handle(WorldRpcRequest::MatchHttp {
                request: HttpMatchRequest {
                    method: "GET".to_string(),
                    url: "http://1.1.1.1/".to_string(),
                    authority: "1.1.1.1".to_string(),
                    path: "/".to_string(),
                    path_query: "/".to_string(),
                    headers: BTreeMap::new(),
                    body: Value::Null,
                },
            })
            .unwrap();

        let WorldRpcResponse::HttpMatched(matched) = response else {
            panic!("expected http match response");
        };
        assert_eq!(matched.match_kind, "blocked");
        assert_eq!(matched.status_code, 502);
        assert_eq!(state.interactions[1].match_kind, "blocked");
    }

    fn write_manifest(root: &std::path::Path, sha: &str) {
        fs::write(
            root.join("manifest.json"),
            serde_json::to_vec(&json!({ "sha256": sha })).unwrap(),
        )
        .unwrap();
    }

    fn write_replay_index(
        root: &std::path::Path,
        service: &str,
        authority: &str,
        method: &str,
        path: &str,
        path_query: &str,
        response: Value,
    ) {
        let dir = root.join("services").join(service);
        fs::create_dir_all(&dir).unwrap();
        let conn = Connection::open(dir.join("replay_index.sqlite")).unwrap();
        conn.execute_batch(
            r#"
            CREATE TABLE replay_interactions (
                ordinal INTEGER NOT NULL,
                event_id TEXT NOT NULL,
                trace_id TEXT NOT NULL,
                service TEXT NOT NULL,
                authority TEXT NOT NULL,
                scheme TEXT NOT NULL,
                method TEXT NOT NULL,
                path TEXT NOT NULL,
                path_query TEXT NOT NULL,
                request_fingerprint TEXT NOT NULL,
                request_json TEXT NOT NULL,
                response_json TEXT NOT NULL,
                status_code INTEGER NOT NULL,
                match_kind TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            "#,
        )
        .unwrap();
        conn.execute(
            r#"
            INSERT INTO replay_interactions (
                ordinal, event_id, trace_id, service, authority, scheme, method,
                path, path_query, request_fingerprint, request_json, response_json,
                status_code, match_kind, created_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
            "#,
            rusqlite::params![
                0i64,
                "evt_1",
                "trace_1",
                service,
                authority,
                "https",
                method,
                path,
                path_query,
                "fp_1",
                "{}",
                serde_json::to_string(&response).unwrap(),
                response["statusCode"].as_u64().unwrap_or(200) as i64,
                "replay",
                "2026-01-01T00:00:00Z"
            ],
        )
        .unwrap();
    }
}
