//! World bundle compiler.
//!
//! This crate owns the control-plane bundle format. It turns immutable
//! environment versions plus optional trace snapshots into a deterministic
//! file tree and a packaged artifact that the sandbox runtime can upload.

use chronicle_domain::{
    DatasetSnapshot, DatastoreSpec, EnvironmentSpec, EnvironmentVersionId,
    EnvironmentVersionRecord, StreamTimelineEvent, WorldBundleRef, WorldBundleSha256,
};
use flate2::{write::GzEncoder, Compression, GzBuilder};
use p256::{
    ecdsa::{signature::Signer, Signature as P256Signature, SigningKey},
    pkcs8::{EncodePrivateKey, LineEnding},
    SecretKey as P256SecretKey,
};
use rcgen::{
    BasicConstraints, CertificateParams, DistinguishedName, DnType, IsCa, KeyPair, KeyUsagePurpose,
    RemoteKeyPair, PKCS_ECDSA_P256_SHA256,
};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tar::{Builder as TarBuilder, Header};
use url::Url;

pub const COMPILER_VERSION: &str = "world-compiler-v1";
pub const RUNTIME_ABI_VERSION: &str = "world-runtime-abi-v1";

const DEFAULT_SERVICE: &str = "_default";

#[derive(Debug, thiserror::Error)]
pub enum WorldCompilerError {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("sqlite error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("url parse error: {0}")]
    Url(#[from] url::ParseError),
    #[error("certificate error: {0}")]
    Certificate(#[from] rcgen::Error),
    #[error("key generation error: {0}")]
    KeyGeneration(String),
    #[error("path error: {0}")]
    Path(String),
}

pub type WorldCompilerResult<T> = Result<T, WorldCompilerError>;

#[derive(Debug, Clone)]
pub struct WorldCompileInput<'a> {
    pub tenant_id: &'a str,
    pub env_version: &'a EnvironmentVersionRecord,
    pub dataset_snapshot_id: &'a str,
    pub scenario_id: &'a str,
    pub dataset_snapshot: Option<&'a DatasetSnapshot>,
    pub environment_base_dir: Option<&'a Path>,
}

#[derive(Debug, Clone)]
pub struct CompiledWorldBundle {
    pub bundle_ref: WorldBundleRef,
    pub root_dir: PathBuf,
    pub package_path: PathBuf,
    pub manifest: Value,
    pub size_bytes: u64,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct WorldCompiler {
    output_root: PathBuf,
}

impl WorldCompiler {
    pub fn new(output_root: impl Into<PathBuf>) -> Self {
        Self {
            output_root: output_root.into(),
        }
    }

    pub fn default_output_root() -> PathBuf {
        std::env::var("CHRONICLE_WORLD_BUNDLE_ROOT")
            .ok()
            .filter(|raw| !raw.trim().is_empty())
            .map(PathBuf::from)
            .unwrap_or_else(|| std::env::temp_dir().join("chronicle/world-bundles"))
    }

    pub fn compile(
        &self,
        input: WorldCompileInput<'_>,
    ) -> WorldCompilerResult<CompiledWorldBundle> {
        let spec_json = serde_json::to_value(&input.env_version.spec)?;
        let spec_hash = sha256_hex(canonical_json(&spec_json)?.as_bytes());
        let mut warnings = Vec::new();
        let captures = project_http_captures(&input, &mut warnings)?;
        if captures.is_empty() {
            warnings.push("world.no_http_captures".to_string());
        }

        fs::create_dir_all(self.output_root.join("expanded"))?;
        fs::create_dir_all(self.output_root.join("packages"))?;
        fs::create_dir_all(self.output_root.join("staging"))?;

        let staging = self.output_root.join("staging").join(staging_id());
        if staging.exists() {
            fs::remove_dir_all(&staging)?;
        }
        let staging_world = staging.join("world");
        fs::create_dir_all(&staging_world)?;

        let service_routes = build_service_routes(&input.env_version.spec, &captures);
        let ca_seed = ca_seed(&input, &spec_hash, &captures)?;
        write_bundle_tree(
            &staging_world,
            &input,
            &input.env_version.spec,
            &service_routes,
            &captures,
            &spec_hash,
            &ca_seed,
            &mut warnings,
        )?;

        let files = collect_file_entries(&staging_world)?;
        let mut manifest = manifest_without_hash(&input, &spec_hash, &warnings, &files)?;
        let canonical = canonical_json(&manifest)?;
        let sha256 = sha256_hex(canonical.as_bytes());
        manifest["sha256"] = Value::String(sha256.clone());
        fs::write(
            staging_world.join("manifest.json"),
            serde_json::to_vec_pretty(&manifest)?,
        )?;

        let final_root = self
            .output_root
            .join("expanded")
            .join(&sha256)
            .join("world");
        if final_root.exists() {
            fs::remove_dir_all(&final_root)?;
        }
        if let Some(parent) = final_root.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::rename(&staging_world, &final_root)?;
        let _ = fs::remove_dir_all(&staging);

        let package_path = self
            .output_root
            .join("packages")
            .join(format!("{sha256}.tar.gz"));
        write_tar_gz_package(&final_root, &package_path)?;
        let size_bytes = fs::metadata(&package_path)?.len();
        let uri = format!("file://{}", package_path.display());

        Ok(CompiledWorldBundle {
            bundle_ref: WorldBundleRef {
                tenant_id: input.tenant_id.to_string(),
                environment_version_id: EnvironmentVersionId::new(input.env_version.id.clone()),
                dataset_snapshot_id: input.dataset_snapshot_id.to_string(),
                scenario_id: input.scenario_id.to_string(),
                sha256: WorldBundleSha256::new(sha256),
                uri,
            },
            root_dir: final_root,
            package_path,
            manifest,
            size_bytes,
            warnings,
        })
    }
}

#[derive(Debug, Clone)]
struct FileEntry {
    path: String,
    size_bytes: u64,
    sha256: String,
}

#[derive(Debug, Clone)]
struct CapturedHttpInteraction {
    ordinal: u32,
    event_id: String,
    trace_id: String,
    service: String,
    authority: String,
    scheme: String,
    method: String,
    path: String,
    path_query: String,
    request_fingerprint: String,
    request: HttpRequestCapture,
    response: HttpResponseCapture,
    occurred_at: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct HttpCapturePayload {
    request: HttpRequestCapture,
    response: HttpResponseCapture,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct HttpRequestCapture {
    method: String,
    url: String,
    headers: BTreeMap<String, String>,
    body: Value,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct HttpResponseCapture {
    status_code: u16,
    headers: BTreeMap<String, String>,
    body: Value,
}

#[derive(Debug, Clone)]
struct ServiceRoute {
    service: String,
    authorities: BTreeSet<String>,
    declared: bool,
}

fn project_http_captures(
    input: &WorldCompileInput<'_>,
    warnings: &mut Vec<String>,
) -> WorldCompilerResult<Vec<CapturedHttpInteraction>> {
    let Some(snapshot) = input.dataset_snapshot else {
        return Ok(Vec::new());
    };
    let mut events: Vec<&StreamTimelineEvent> = snapshot
        .events
        .as_deref()
        .unwrap_or(&[])
        .iter()
        .filter(|event| event.trace_id.as_deref() == Some(input.scenario_id))
        .filter(|event| event.event_type == "outbound_http")
        .collect();
    events.sort_by_key(|event| event.occurred_at);

    let mut captures = Vec::new();
    for event in events {
        let Some(payload) = &event.payload else {
            warnings.push(format!("world.http_capture.malformed:{}", event.id));
            continue;
        };
        let parsed: HttpCapturePayload = match serde_json::from_value(payload.clone()) {
            Ok(parsed) => parsed,
            Err(_) => {
                warnings.push(format!("world.http_capture.malformed:{}", event.id));
                continue;
            }
        };
        let url = match Url::parse(&parsed.request.url) {
            Ok(url) => url,
            Err(_) => {
                warnings.push(format!("world.http_capture.bad_url:{}", event.id));
                continue;
            }
        };
        let Some(authority) = url.host_str().map(normalize_authority) else {
            warnings.push(format!("world.http_capture.bad_url:{}", event.id));
            continue;
        };
        let authority = if let Some(port) = url.port() {
            format!("{authority}:{port}")
        } else {
            authority
        };
        let method = parsed.request.method.trim().to_ascii_uppercase();
        if method.is_empty() {
            warnings.push(format!("world.http_capture.malformed:{}", event.id));
            continue;
        }
        let path = normalize_path(url.path());
        let path_query = match url.query() {
            Some(query) if !query.is_empty() => format!("{path}?{query}"),
            _ => path.clone(),
        };
        let request_fingerprint = sha256_hex(
            canonical_json(&json!({
                "authority": authority,
                "method": method,
                "pathQuery": path_query,
                "headers": parsed.request.headers,
                "body": parsed.request.body,
            }))?
            .as_bytes(),
        );
        captures.push(CapturedHttpInteraction {
            ordinal: captures.len() as u32,
            event_id: event.id.clone(),
            trace_id: input.scenario_id.to_string(),
            service: String::new(),
            authority,
            scheme: url.scheme().to_string(),
            method,
            path,
            path_query,
            request_fingerprint,
            request: parsed.request,
            response: parsed.response,
            occurred_at: event.occurred_at.to_rfc3339(),
        });
    }
    Ok(captures)
}

fn build_service_routes(
    spec: &EnvironmentSpec,
    captures: &[CapturedHttpInteraction],
) -> BTreeMap<String, ServiceRoute> {
    let mut routes = BTreeMap::new();
    let mut authority_to_service = BTreeMap::new();
    for service in &spec.services {
        let route = routes
            .entry(service.name.clone())
            .or_insert_with(|| ServiceRoute {
                service: service.name.clone(),
                authorities: BTreeSet::new(),
                declared: true,
            });
        route.declared = true;
        for authority in &service.authorities {
            let authority = normalize_authority(authority);
            route.authorities.insert(authority.clone());
            authority_to_service.insert(authority, service.name.clone());
        }
    }

    for capture in captures {
        if authority_to_service.contains_key(&capture.authority) {
            continue;
        }
        let service = synthesized_service_name(&capture.authority, &routes);
        routes
            .entry(service.clone())
            .or_insert_with(|| ServiceRoute {
                service: service.clone(),
                authorities: BTreeSet::new(),
                declared: false,
            })
            .authorities
            .insert(capture.authority.clone());
        authority_to_service.insert(capture.authority.clone(), service);
    }

    if routes.is_empty() {
        routes.insert(
            DEFAULT_SERVICE.to_string(),
            ServiceRoute {
                service: DEFAULT_SERVICE.to_string(),
                authorities: BTreeSet::new(),
                declared: false,
            },
        );
    }

    routes
}

fn write_bundle_tree(
    root: &Path,
    input: &WorldCompileInput<'_>,
    spec: &EnvironmentSpec,
    service_routes: &BTreeMap<String, ServiceRoute>,
    captures: &[CapturedHttpInteraction],
    spec_hash: &str,
    ca_seed: &[u8; 32],
    warnings: &mut Vec<String>,
) -> WorldCompilerResult<()> {
    fs::create_dir_all(root.join("services"))?;
    fs::create_dir_all(root.join("datastores"))?;
    fs::create_dir_all(root.join("mcp"))?;
    fs::create_dir_all(root.join("grading"))?;
    fs::create_dir_all(root.join("security"))?;

    fs::write(
        root.join("routes.json"),
        serde_json::to_vec_pretty(&routes_json(service_routes))?,
    )?;
    fs::write(
        root.join("fallback_policy.json"),
        serde_json::to_vec_pretty(&json!({
            "defaultRead": "empty_result",
            "defaultWrite": "fail_closed"
        }))?,
    )?;

    for route in service_routes.values() {
        let service_dir = root.join("services").join(&route.service);
        fs::create_dir_all(&service_dir)?;
        let service_captures: Vec<CapturedHttpInteraction> = captures
            .iter()
            .filter(|capture| {
                route.authorities.contains(&capture.authority)
                    || (route.service == DEFAULT_SERVICE && captures.is_empty())
            })
            .cloned()
            .map(|mut capture| {
                capture.service = route.service.clone();
                capture
            })
            .collect();
        write_replay_index(&service_dir.join("replay_index.sqlite"), &service_captures)?;
    }

    write_ca_material(&root.join("security"), spec_hash, ca_seed)?;

    let mut datastore_specs = Vec::new();
    for datastore in &spec.datastores {
        let bundle_name = safe_bundle_component(&datastore.name, "datastore");
        let datastore_dir = root.join("datastores").join(&bundle_name);
        fs::create_dir_all(&datastore_dir)?;
        let seed = write_datastore_seed(&datastore_dir, input, datastore, warnings)?;
        write_datastore_schema_fingerprint(&datastore_dir, datastore, &bundle_name, seed.as_ref())?;
        datastore_specs.push(datastore_state_diff_entry(
            datastore,
            &bundle_name,
            seed.as_ref(),
            input,
            warnings,
        )?);
    }
    fs::write(root.join("mcp").join("servers.json"), b"[]")?;
    fs::write(root.join("mcp").join("tools.json"), b"[]")?;
    fs::write(root.join("grading").join("call_graph_gold.json"), b"{}")?;
    fs::write(
        root.join("grading").join("state_diff_spec.json"),
        serde_json::to_vec_pretty(&json!({
            "version": 1,
            "datastores": datastore_specs,
        }))?,
    )?;
    fs::write(root.join("grading").join("invariants.json"), b"[]")?;
    Ok(())
}

#[derive(Debug, Clone)]
struct DatastoreSeedMaterial {
    path: String,
    size_bytes: u64,
    sha256: String,
    source_uri: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExpectedDatastoreSnapshot {
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    tables: Vec<ExpectedDatastoreTableSnapshot>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExpectedDatastoreTableSnapshot {
    #[serde(default = "default_schema")]
    schema: String,
    name: String,
    #[serde(default)]
    rows: Vec<Value>,
}

fn default_schema() -> String {
    "public".to_string()
}

fn write_datastore_seed(
    datastore_dir: &Path,
    input: &WorldCompileInput<'_>,
    datastore: &DatastoreSpec,
    warnings: &mut Vec<String>,
) -> WorldCompilerResult<Option<DatastoreSeedMaterial>> {
    let Some(seed_uri) = datastore
        .seed_uri
        .as_deref()
        .filter(|uri| !uri.trim().is_empty())
    else {
        warnings.push(format!("world.datastore.no_seed:{}", datastore.name));
        return Ok(None);
    };
    let Some(seed_path) =
        resolve_seed_path(seed_uri, input.environment_base_dir, warnings, datastore)
    else {
        return Ok(None);
    };
    let bytes = fs::read(&seed_path)?;
    let out = datastore_dir.join("seed.dump.zst");
    fs::write(&out, &bytes)?;
    Ok(Some(DatastoreSeedMaterial {
        path: "seed.dump.zst".to_string(),
        size_bytes: bytes.len() as u64,
        sha256: sha256_hex(&bytes),
        source_uri: seed_uri.to_string(),
    }))
}

fn resolve_seed_path(
    seed_uri: &str,
    base_dir: Option<&Path>,
    warnings: &mut Vec<String>,
    datastore: &DatastoreSpec,
) -> Option<PathBuf> {
    if let Some(raw) = seed_uri.strip_prefix("file://") {
        if let Ok(url) = Url::parse(seed_uri) {
            return url.to_file_path().ok();
        }
        return Some(PathBuf::from(raw));
    }
    if let Ok(url) = Url::parse(seed_uri) {
        if url.scheme().len() > 1 {
            warnings.push(format!(
                "world.datastore.seed_uri_unsupported:{}:{}",
                datastore.name,
                url.scheme()
            ));
            return None;
        }
    }
    let path = PathBuf::from(seed_uri);
    if path.is_absolute() {
        Some(path)
    } else {
        Some(base_dir.unwrap_or_else(|| Path::new(".")).join(path))
    }
}

fn write_datastore_schema_fingerprint(
    datastore_dir: &Path,
    datastore: &DatastoreSpec,
    bundle_name: &str,
    seed: Option<&DatastoreSeedMaterial>,
) -> WorldCompilerResult<()> {
    let seed_json = seed.map(|seed| {
        json!({
            "path": seed.path,
            "sizeBytes": seed.size_bytes,
            "sha256": seed.sha256,
            "sourceUriHash": sha256_hex(seed.source_uri.as_bytes()),
        })
    });
    let declared = datastore.schema_fingerprint.clone();
    let fingerprint_source = declared.clone().unwrap_or_else(|| {
        json!({
            "datastore": datastore.name,
            "kind": datastore.kind,
            "seed": seed_json.clone(),
        })
    });
    let schema_hash = sha256_hex(canonical_json(&fingerprint_source)?.as_bytes());
    fs::write(
        datastore_dir.join("schema_fingerprint.json"),
        serde_json::to_vec_pretty(&json!({
            "version": 1,
            "name": datastore.name,
            "bundleName": bundle_name,
            "kind": datastore.kind,
            "schemaHash": schema_hash,
            "source": if declared.is_some() { "declared" } else { "generated" },
            "seed": seed_json,
            "fingerprint": fingerprint_source,
        }))?,
    )?;
    Ok(())
}

fn datastore_expected_delta(
    datastore: &DatastoreSpec,
    spec: &Value,
    base_dir: Option<&Path>,
    warnings: &mut Vec<String>,
) -> WorldCompilerResult<Value> {
    if let Some(expected) = spec
        .get("expectedDelta")
        .filter(|value| !value.is_null())
        .filter(|value| !value.as_object().is_some_and(|obj| obj.is_empty()))
    {
        return Ok(expected.clone());
    }

    if let Some(expected_delta_uri) = first_string(spec, &["expectedDeltaUri", "expectedDeltaPath"])
    {
        return Ok(read_json_fixture(
            expected_delta_uri,
            base_dir,
            datastore,
            "expected_delta",
            warnings,
        )?
        .unwrap_or(Value::Null));
    }

    let initial = read_snapshot_fixture(
        spec,
        datastore,
        base_dir,
        &["initialState"],
        &["initialStateUri", "initialStatePath"],
        "initial_state",
        warnings,
    )?;
    let expected_final = read_snapshot_fixture(
        spec,
        datastore,
        base_dir,
        &["expectedFinalState", "finalState", "expectedState"],
        &[
            "expectedFinalStateUri",
            "expectedFinalStatePath",
            "finalStateUri",
            "finalStatePath",
            "expectedStateUri",
            "expectedStatePath",
        ],
        "expected_final_state",
        warnings,
    )?;

    match (initial, expected_final) {
        (Some(initial), Some(expected_final)) => Ok(expected_delta_from_snapshots(
            datastore,
            &initial,
            &expected_final,
        )),
        (Some(_), None) | (None, Some(_)) => {
            warnings.push(format!(
                "world.datastore.expected_delta.incomplete:{}",
                datastore.name
            ));
            Ok(Value::Null)
        }
        (None, None) => Ok(Value::Null),
    }
}

fn read_snapshot_fixture(
    spec: &Value,
    datastore: &DatastoreSpec,
    base_dir: Option<&Path>,
    inline_keys: &[&str],
    uri_keys: &[&str],
    label: &str,
    warnings: &mut Vec<String>,
) -> WorldCompilerResult<Option<ExpectedDatastoreSnapshot>> {
    for key in inline_keys {
        if let Some(value) = spec.get(*key).filter(|value| !value.is_null()) {
            return match serde_json::from_value::<ExpectedDatastoreSnapshot>(value.clone()) {
                Ok(snapshot) => Ok(Some(snapshot)),
                Err(err) => {
                    warnings.push(format!(
                        "world.datastore.{label}_malformed:{}:{err}",
                        datastore.name
                    ));
                    Ok(None)
                }
            };
        }
    }

    let Some(uri) = first_string(spec, uri_keys) else {
        return Ok(None);
    };
    let Some(value) = read_json_fixture(uri, base_dir, datastore, label, warnings)? else {
        return Ok(None);
    };
    match serde_json::from_value::<ExpectedDatastoreSnapshot>(value) {
        Ok(snapshot) => Ok(Some(snapshot)),
        Err(err) => {
            warnings.push(format!(
                "world.datastore.{label}_malformed:{}:{err}",
                datastore.name
            ));
            Ok(None)
        }
    }
}

fn read_json_fixture(
    uri: &str,
    base_dir: Option<&Path>,
    datastore: &DatastoreSpec,
    label: &str,
    warnings: &mut Vec<String>,
) -> WorldCompilerResult<Option<Value>> {
    let Some(path) = resolve_fixture_path(uri, base_dir, warnings, datastore, label) else {
        return Ok(None);
    };
    let bytes = match fs::read(&path) {
        Ok(bytes) => bytes,
        Err(err) => {
            warnings.push(format!(
                "world.datastore.{label}_unreadable:{}:{}",
                datastore.name, err
            ));
            return Ok(None);
        }
    };
    match serde_json::from_slice(&bytes) {
        Ok(value) => Ok(Some(value)),
        Err(err) => {
            warnings.push(format!(
                "world.datastore.{label}_malformed:{}:{err}",
                datastore.name
            ));
            Ok(None)
        }
    }
}

fn resolve_fixture_path(
    uri: &str,
    base_dir: Option<&Path>,
    warnings: &mut Vec<String>,
    datastore: &DatastoreSpec,
    label: &str,
) -> Option<PathBuf> {
    if let Some(raw) = uri.strip_prefix("file://") {
        if let Ok(url) = Url::parse(uri) {
            return url.to_file_path().ok();
        }
        return Some(PathBuf::from(raw));
    }
    if let Ok(url) = Url::parse(uri) {
        if url.scheme().len() > 1 {
            warnings.push(format!(
                "world.datastore.{label}_uri_unsupported:{}:{}",
                datastore.name,
                url.scheme()
            ));
            return None;
        }
    }
    let path = PathBuf::from(uri);
    if path.is_absolute() {
        Some(path)
    } else {
        Some(base_dir.unwrap_or_else(|| Path::new(".")).join(path))
    }
}

fn first_string<'a>(value: &'a Value, keys: &[&str]) -> Option<&'a str> {
    keys.iter().find_map(|key| {
        value
            .get(*key)
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|raw| !raw.is_empty())
    })
}

fn expected_delta_from_snapshots(
    datastore: &DatastoreSpec,
    initial: &ExpectedDatastoreSnapshot,
    expected_final: &ExpectedDatastoreSnapshot,
) -> Value {
    let mut tables = Vec::new();
    let mut initial_row_count = 0usize;
    let mut final_row_count = 0usize;
    let mut inserted_rows = 0usize;
    let mut deleted_rows = 0usize;
    let mut table_keys = BTreeMap::new();

    for table in &initial.tables {
        table_keys.insert(
            (table.schema.clone(), table.name.clone()),
            (Some(table), None::<&ExpectedDatastoreTableSnapshot>),
        );
    }
    for table in &expected_final.tables {
        table_keys
            .entry((table.schema.clone(), table.name.clone()))
            .and_modify(|(_, final_slot)| *final_slot = Some(table))
            .or_insert((None, Some(table)));
    }

    for ((schema, name), (initial_table, final_table)) in table_keys {
        let initial_rows = initial_table
            .map(|table| table.rows.as_slice())
            .unwrap_or(&[]);
        let final_rows = final_table
            .map(|table| table.rows.as_slice())
            .unwrap_or(&[]);
        let mut inserted = row_multiset_difference(final_rows, initial_rows);
        let mut deleted = row_multiset_difference(initial_rows, final_rows);
        inserted.sort_by_key(canonical_row);
        deleted.sort_by_key(canonical_row);

        initial_row_count += initial_rows.len();
        final_row_count += final_rows.len();
        inserted_rows += inserted.len();
        deleted_rows += deleted.len();
        tables.push(json!({
            "schema": schema,
            "name": name,
            "initialRowCount": initial_rows.len(),
            "finalRowCount": final_rows.len(),
            "insertedRows": inserted,
            "deletedRows": deleted,
        }));
    }

    json!({
        "source": "snapshot_diff",
        "datastore": datastore.name,
        "initialName": initial.name.as_deref().unwrap_or(&datastore.name),
        "expectedFinalName": expected_final.name.as_deref().unwrap_or(&datastore.name),
        "changed": inserted_rows > 0 || deleted_rows > 0,
        "initialRowCount": initial_row_count,
        "finalRowCount": final_row_count,
        "deltaRows": inserted_rows + deleted_rows,
        "insertedRows": inserted_rows,
        "deletedRows": deleted_rows,
        "tables": tables,
    })
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

fn datastore_state_diff_entry(
    datastore: &DatastoreSpec,
    bundle_name: &str,
    seed: Option<&DatastoreSeedMaterial>,
    input: &WorldCompileInput<'_>,
    warnings: &mut Vec<String>,
) -> WorldCompilerResult<Value> {
    let spec = datastore
        .state_diff_spec
        .clone()
        .unwrap_or_else(|| json!({}));
    let expected_delta =
        datastore_expected_delta(datastore, &spec, input.environment_base_dir, warnings)?;
    Ok(json!({
        "name": datastore.name,
        "bundleName": bundle_name,
        "kind": datastore.kind,
        "seedPath": seed.map(|seed| format!("datastores/{bundle_name}/{}", seed.path)),
        "schemaFingerprintPath": format!("datastores/{bundle_name}/schema_fingerprint.json"),
        "logicalViews": [],
        "expectedDelta": expected_delta,
        "spec": spec,
    }))
}

fn routes_json(service_routes: &BTreeMap<String, ServiceRoute>) -> Value {
    let authorities: Vec<Value> = service_routes
        .values()
        .flat_map(|route| {
            route.authorities.iter().map(move |authority| {
                json!({
                    "authority": authority,
                    "service": route.service,
                    "source": if route.declared { "declared" } else { "captured" }
                })
            })
        })
        .collect();
    let services: Vec<Value> = service_routes
        .values()
        .map(|route| {
            json!({
                "name": route.service,
                "authorities": route.authorities.iter().cloned().collect::<Vec<_>>(),
                "declared": route.declared
            })
        })
        .collect();
    json!({
        "authorities": authorities,
        "services": services,
    })
}

fn write_replay_index(
    path: &Path,
    captures: &[CapturedHttpInteraction],
) -> WorldCompilerResult<()> {
    if path.exists() {
        fs::remove_file(path)?;
    }
    let conn = Connection::open(path)?;
    conn.execute_batch(
        r#"
        PRAGMA journal_mode = OFF;
        PRAGMA synchronous = OFF;
        CREATE TABLE replay_interactions (
            ordinal INTEGER PRIMARY KEY,
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
        CREATE INDEX idx_replay_authority_method_path
            ON replay_interactions(authority, method, path);
        CREATE INDEX idx_replay_fingerprint
            ON replay_interactions(request_fingerprint);
        "#,
    )?;
    let tx = conn.unchecked_transaction()?;
    {
        let mut stmt = tx.prepare(
            r#"
            INSERT INTO replay_interactions (
                ordinal, event_id, trace_id, service, authority, scheme, method,
                path, path_query, request_fingerprint, request_json, response_json,
                status_code, match_kind, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, 'replay', ?14)
            "#,
        )?;
        for capture in captures {
            stmt.execute(params![
                capture.ordinal,
                capture.event_id,
                capture.trace_id,
                capture.service,
                capture.authority,
                capture.scheme,
                capture.method,
                capture.path,
                capture.path_query,
                capture.request_fingerprint,
                canonical_json(&serde_json::to_value(&capture.request)?)?,
                canonical_json(&serde_json::to_value(&capture.response)?)?,
                capture.response.status_code,
                capture.occurred_at,
            ])?;
        }
    }
    tx.commit()?;
    Ok(())
}

fn write_ca_material(
    security_dir: &Path,
    spec_hash: &str,
    ca_seed: &[u8; 32],
) -> WorldCompilerResult<()> {
    let (key_pair, key_pem) = key_pair_from_seed(ca_seed)?;
    let mut params = CertificateParams::new(vec!["Chronicle World MITM CA".to_string()])?;
    params.distinguished_name = DistinguishedName::new();
    params.distinguished_name.push(
        DnType::CommonName,
        format!("Chronicle World MITM CA {spec_hash}"),
    );
    params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
    params.key_usages = vec![
        KeyUsagePurpose::KeyCertSign,
        KeyUsagePurpose::DigitalSignature,
        KeyUsagePurpose::CrlSign,
    ];
    let cert = params.self_signed(&key_pair)?;
    let cert_pem = cert.pem();
    fs::write(security_dir.join("ca.crt"), cert_pem.as_bytes())?;
    fs::write(security_dir.join("ca.key"), key_pem.as_bytes())?;
    fs::write(
        security_dir.join("mitmproxy-ca.pem"),
        format!("{key_pem}{cert_pem}").as_bytes(),
    )?;
    Ok(())
}

fn ca_seed(
    input: &WorldCompileInput<'_>,
    spec_hash: &str,
    captures: &[CapturedHttpInteraction],
) -> WorldCompilerResult<[u8; 32]> {
    let capture_summary = captures
        .iter()
        .map(|capture| {
            json!({
                "ordinal": capture.ordinal,
                "eventId": capture.event_id,
                "traceId": capture.trace_id,
                "authority": capture.authority,
                "method": capture.method,
                "pathQuery": capture.path_query,
                "requestFingerprint": capture.request_fingerprint,
                "response": capture.response,
            })
        })
        .collect::<Vec<_>>();
    let seed_json = json!({
        "compilerVersion": COMPILER_VERSION,
        "tenantId": input.tenant_id,
        "environmentVersionId": input.env_version.id,
        "datasetSnapshotId": input.dataset_snapshot_id,
        "scenarioId": input.scenario_id,
        "specHash": spec_hash,
        "captures": capture_summary,
    });
    let digest = Sha256::digest(canonical_json(&seed_json)?.as_bytes());
    let mut seed = [0u8; 32];
    seed.copy_from_slice(&digest);
    Ok(seed)
}

fn key_pair_from_seed(seed: &[u8; 32]) -> WorldCompilerResult<(KeyPair, String)> {
    let mut candidate = *seed;
    for counter in 0u32..1024 {
        if counter > 0 {
            let mut hasher = Sha256::new();
            hasher.update(seed);
            hasher.update(counter.to_be_bytes());
            candidate.copy_from_slice(&hasher.finalize());
        }
        if let Ok(secret_key) = P256SecretKey::from_slice(&candidate) {
            let key_pem = secret_key
                .to_pkcs8_pem(LineEnding::LF)
                .map_err(|err| WorldCompilerError::KeyGeneration(err.to_string()))?;
            let signing_key = SigningKey::from(secret_key);
            let verifying_key = signing_key.verifying_key();
            let public_key = verifying_key.to_encoded_point(false).as_bytes().to_vec();
            let key_pair = KeyPair::from_remote(Box::new(DeterministicP256KeyPair {
                signing_key,
                public_key,
            }))?;
            return Ok((key_pair, key_pem.to_string()));
        }
    }
    Err(WorldCompilerError::KeyGeneration(
        "unable to derive a valid P-256 private key from bundle seed".to_string(),
    ))
}

struct DeterministicP256KeyPair {
    signing_key: SigningKey,
    public_key: Vec<u8>,
}

impl RemoteKeyPair for DeterministicP256KeyPair {
    fn public_key(&self) -> &[u8] {
        &self.public_key
    }

    fn sign(&self, msg: &[u8]) -> Result<Vec<u8>, rcgen::Error> {
        let signature: P256Signature = self.signing_key.sign(msg);
        Ok(signature.to_der().as_bytes().to_vec())
    }

    fn algorithm(&self) -> &'static rcgen::SignatureAlgorithm {
        &PKCS_ECDSA_P256_SHA256
    }
}

fn manifest_without_hash(
    input: &WorldCompileInput<'_>,
    spec_hash: &str,
    warnings: &[String],
    files: &[FileEntry],
) -> WorldCompilerResult<Value> {
    Ok(json!({
        "version": 1,
        "compilerVersion": COMPILER_VERSION,
        "runtimeAbiVersion": RUNTIME_ABI_VERSION,
        "tenantId": input.tenant_id,
        "environmentVersionId": input.env_version.id,
        "datasetSnapshotId": input.dataset_snapshot_id,
        "scenarioId": input.scenario_id,
        "specHash": spec_hash,
        "redactionPolicyHash": sha256_hex(b"{}"),
        "warnings": warnings,
        "files": files.iter().map(|entry| {
            json!({
                "path": entry.path,
                "sizeBytes": entry.size_bytes,
                "sha256": entry.sha256,
            })
        }).collect::<Vec<_>>(),
        "sha256": null
    }))
}

pub fn canonical_json(value: &Value) -> WorldCompilerResult<String> {
    Ok(serde_json::to_string(value)?)
}

pub fn sha256_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    hex::encode(hasher.finalize())
}

fn collect_file_entries(root: &Path) -> WorldCompilerResult<Vec<FileEntry>> {
    let mut paths = Vec::new();
    collect_paths(root, root, &mut paths)?;
    paths.sort_by(|a, b| a.0.cmp(&b.0));
    let mut entries = Vec::with_capacity(paths.len());
    for (rel, path) in paths {
        if rel == "manifest.json" {
            continue;
        }
        let bytes = fs::read(&path)?;
        entries.push(FileEntry {
            path: rel,
            size_bytes: bytes.len() as u64,
            sha256: sha256_hex(&bytes),
        });
    }
    Ok(entries)
}

fn collect_paths(
    root: &Path,
    dir: &Path,
    out: &mut Vec<(String, PathBuf)>,
) -> WorldCompilerResult<()> {
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            collect_paths(root, &path, out)?;
        } else {
            let rel = path
                .strip_prefix(root)
                .map_err(|e| WorldCompilerError::Path(e.to_string()))?
                .to_string_lossy()
                .replace('\\', "/");
            out.push((rel, path));
        }
    }
    Ok(())
}

fn write_tar_gz_package(root: &Path, package_path: &Path) -> WorldCompilerResult<()> {
    if let Some(parent) = package_path.parent() {
        fs::create_dir_all(parent)?;
    }
    let file = fs::File::create(package_path)?;
    let encoder: GzEncoder<fs::File> = GzBuilder::new()
        .mtime(0)
        .filename("")
        .write(file, Compression::default());
    let mut builder = TarBuilder::new(encoder);
    let mut paths = Vec::new();
    collect_paths(root, root, &mut paths)?;
    paths.sort_by(|a, b| a.0.cmp(&b.0));
    for (rel, path) in paths {
        let bytes = fs::read(&path)?;
        let mut header = Header::new_gnu();
        header.set_size(bytes.len() as u64);
        header.set_mode(0o644);
        header.set_uid(0);
        header.set_gid(0);
        header.set_mtime(0);
        header.set_cksum();
        builder.append_data(&mut header, format!("world/{rel}"), bytes.as_slice())?;
    }
    let encoder = builder.into_inner()?;
    encoder.finish()?;
    Ok(())
}

fn normalize_authority(value: &str) -> String {
    value
        .trim()
        .trim_start_matches("http://")
        .trim_start_matches("https://")
        .trim_end_matches('/')
        .to_ascii_lowercase()
}

fn normalize_path(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        "/".to_string()
    } else if trimmed.starts_with('/') {
        trimmed.to_string()
    } else {
        format!("/{trimmed}")
    }
}

fn synthesized_service_name(authority: &str, existing: &BTreeMap<String, ServiceRoute>) -> String {
    let mut base = String::from("http_");
    for ch in authority.chars() {
        if ch.is_ascii_alphanumeric() {
            base.push(ch.to_ascii_lowercase());
        } else if !base.ends_with('_') {
            base.push('_');
        }
    }
    let base = base.trim_end_matches('_').to_string();
    if !existing.contains_key(&base) {
        return base;
    }
    format!("{}_{}", base, &sha256_hex(authority.as_bytes())[..8])
}

fn safe_bundle_component(value: &str, fallback: &str) -> String {
    let mut out = String::new();
    for ch in value.trim().chars() {
        if ch.is_ascii_alphanumeric() || matches!(ch, '_' | '-') {
            out.push(ch);
        } else if !out.ends_with('_') {
            out.push('_');
        }
    }
    let out = out.trim_matches('_').to_string();
    if out.is_empty() {
        fallback.to_string()
    } else {
        out
    }
}

fn staging_id() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |duration| duration.as_nanos());
    format!("{}-{nanos}", std::process::id())
}

#[cfg(test)]
mod tests {
    use super::*;
    use chronicle_domain::{
        Dataset, DatasetSnapshot, DatastoreSpec, EnvironmentSpec, EnvironmentVersionStatus,
        ServiceSpec, TraceStatus, TraceSummary,
    };
    use chrono::{TimeZone, Utc};

    fn version() -> EnvironmentVersionRecord {
        EnvironmentVersionRecord {
            id: "envver_1".to_string(),
            environment_id: "env_1".to_string(),
            tenant_id: "tenant_1".to_string(),
            version: "v1".to_string(),
            spec: EnvironmentSpec {
                services: vec![ServiceSpec {
                    name: "example".to_string(),
                    authorities: vec!["api.example.com".to_string()],
                    openapi_uri: None,
                }],
                ..EnvironmentSpec::default()
            },
            status: EnvironmentVersionStatus::Published,
            created_at: Utc.timestamp_opt(0, 0).unwrap(),
        }
    }

    fn trace(id: &str) -> TraceSummary {
        TraceSummary {
            trace_id: id.to_string(),
            label: "Trace".to_string(),
            primary_source: "test".to_string(),
            sources: vec!["test".to_string()],
            event_count: 1,
            started_at: Utc.timestamp_opt(0, 0).unwrap(),
            duration_ms: 0,
            status: TraceStatus::Ok,
            split: None,
            cluster_id: None,
            added_at: None,
            added_by: None,
            note: None,
            embedding: None,
        }
    }

    fn snapshot(body: Value) -> DatasetSnapshot {
        DatasetSnapshot {
            dataset: Dataset {
                id: "ds".to_string(),
                name: "Dataset".to_string(),
                description: None,
                purpose: None,
                trace_count: 1,
                event_count: Some(1),
                updated_at: None,
                created_by: None,
                tags: None,
            },
            traces: vec![trace("scenario_1")],
            clusters: vec![],
            edges: vec![],
            events: Some(vec![StreamTimelineEvent {
                id: "ev_http".to_string(),
                source: "capture".to_string(),
                event_type: "outbound_http".to_string(),
                occurred_at: Utc.timestamp_opt(1, 0).unwrap(),
                actor: None,
                message: None,
                payload: Some(body),
                stream: None,
                color: None,
                trace_id: Some("scenario_1".to_string()),
                parent_event_id: None,
                correlation_key: None,
                trace_label: None,
            }]),
        }
    }

    fn capture_payload(path: &str) -> Value {
        json!({
            "request": {
                "method": "GET",
                "url": format!("https://api.example.com{path}"),
                "headers": { "accept": "application/json" },
                "body": null
            },
            "response": {
                "statusCode": 200,
                "headers": { "content-type": "application/json" },
                "body": { "ok": true }
            }
        })
    }

    fn compile_with(snapshot: Option<&DatasetSnapshot>, tmp: &Path) -> CompiledWorldBundle {
        WorldCompiler::new(tmp)
            .compile(WorldCompileInput {
                tenant_id: "tenant_1",
                env_version: &version(),
                dataset_snapshot_id: "snapshot_1",
                scenario_id: "scenario_1",
                dataset_snapshot: snapshot,
                environment_base_dir: None,
            })
            .unwrap()
    }

    #[test]
    fn projects_outbound_http_into_replay_index() {
        let tmp = tempfile::tempdir().unwrap();
        let snapshot = snapshot(capture_payload("/v1/items?limit=10"));
        let compiled = compile_with(Some(&snapshot), tmp.path());
        let db = compiled
            .root_dir
            .join("services/example/replay_index.sqlite");
        let conn = Connection::open(db).unwrap();
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM replay_interactions", [], |row| {
                row.get(0)
            })
            .unwrap();
        let path_query: String = conn
            .query_row(
                "SELECT path_query FROM replay_interactions WHERE ordinal = 0",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 1);
        assert_eq!(path_query, "/v1/items?limit=10");
    }

    #[test]
    fn empty_http_captures_compile_with_warning() {
        let tmp = tempfile::tempdir().unwrap();
        let compiled = compile_with(None, tmp.path());
        assert!(compiled
            .warnings
            .iter()
            .any(|warning| warning == "world.no_http_captures"));
        assert!(compiled
            .root_dir
            .join("services/example/replay_index.sqlite")
            .is_file());
    }

    #[test]
    fn malformed_http_capture_is_skipped_with_warning() {
        let tmp = tempfile::tempdir().unwrap();
        let snapshot = snapshot(json!({"request": {"method": "GET"}}));
        let compiled = compile_with(Some(&snapshot), tmp.path());
        assert!(compiled
            .warnings
            .iter()
            .any(|warning| warning.starts_with("world.http_capture.malformed")));
        let conn = Connection::open(
            compiled
                .root_dir
                .join("services/example/replay_index.sqlite"),
        )
        .unwrap();
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM replay_interactions", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn stable_hash_and_package_for_identical_input() {
        let tmp = tempfile::tempdir().unwrap();
        let snapshot = snapshot(capture_payload("/v1/items"));
        let first = compile_with(Some(&snapshot), tmp.path());
        let first_package = fs::read(&first.package_path).unwrap();
        let second = compile_with(Some(&snapshot), tmp.path());
        assert_eq!(first.bundle_ref.sha256, second.bundle_ref.sha256);
        assert_eq!(first_package, fs::read(&second.package_path).unwrap());
    }

    #[test]
    fn hash_changes_when_http_content_changes() {
        let tmp = tempfile::tempdir().unwrap();
        let first_snapshot = snapshot(capture_payload("/v1/items"));
        let second_snapshot = snapshot(capture_payload("/v1/items/2"));
        let first = compile_with(Some(&first_snapshot), tmp.path());
        let second = compile_with(Some(&second_snapshot), tmp.path());
        assert_ne!(first.bundle_ref.sha256, second.bundle_ref.sha256);
    }

    #[test]
    fn ca_material_changes_when_http_content_changes() {
        let tmp = tempfile::tempdir().unwrap();
        let first_snapshot = snapshot(capture_payload("/v1/items"));
        let second_snapshot = snapshot(capture_payload("/v1/items/2"));
        let first = compile_with(Some(&first_snapshot), tmp.path());
        let first_key = fs::read(first.root_dir.join("security/ca.key")).unwrap();
        let second = compile_with(Some(&second_snapshot), tmp.path());
        let second_key = fs::read(second.root_dir.join("security/ca.key")).unwrap();
        assert_ne!(first_key, second_key);
    }

    #[test]
    fn generated_ca_files_exist() {
        let tmp = tempfile::tempdir().unwrap();
        let compiled = compile_with(None, tmp.path());
        for file in ["ca.crt", "ca.key", "mitmproxy-ca.pem"] {
            let path = compiled.root_dir.join("security").join(file);
            assert!(path.is_file());
            assert!(fs::metadata(path).unwrap().len() > 0);
        }
    }

    #[test]
    fn datastore_seed_schema_and_state_diff_files_are_written() {
        let tmp = tempfile::tempdir().unwrap();
        let env_dir = tmp.path().join("env");
        fs::create_dir_all(env_dir.join("seeds")).unwrap();
        fs::create_dir_all(env_dir.join("snapshots")).unwrap();
        fs::write(env_dir.join("seeds/appdb.dump.zst"), b"fake-zstd-pg-dump").unwrap();
        fs::write(
            env_dir.join("snapshots/appdb.initial.json"),
            serde_json::to_vec_pretty(&json!({
                "name": "appdb",
                "tables": [{
                    "schema": "public",
                    "name": "users",
                    "rows": [{ "id": 1, "email": "old@example.com" }]
                }]
            }))
            .unwrap(),
        )
        .unwrap();
        fs::write(
            env_dir.join("snapshots/appdb.expected.json"),
            serde_json::to_vec_pretty(&json!({
                "name": "appdb",
                "tables": [{
                    "schema": "public",
                    "name": "users",
                    "rows": [
                        { "id": 1, "email": "old@example.com" },
                        { "id": 2, "email": "new@example.com" }
                    ]
                }]
            }))
            .unwrap(),
        )
        .unwrap();

        let mut env_version = version();
        env_version.spec.datastores = vec![DatastoreSpec {
            name: "appdb".to_string(),
            kind: "postgres".to_string(),
            seed_uri: Some("seeds/appdb.dump.zst".to_string()),
            schema_fingerprint: Some(json!({
                "tables": ["public.users"]
            })),
            state_diff_spec: Some(json!({
                "initialStateUri": "snapshots/appdb.initial.json",
                "expectedFinalStateUri": "snapshots/appdb.expected.json",
                "logicalViews": [
                    {
                        "name": "users",
                        "query": "SELECT id, email FROM public.users ORDER BY id"
                    }
                ]
            })),
        }];

        let compiled = WorldCompiler::new(tmp.path())
            .compile(WorldCompileInput {
                tenant_id: "tenant_1",
                env_version: &env_version,
                dataset_snapshot_id: "snapshot_1",
                scenario_id: "scenario_1",
                dataset_snapshot: None,
                environment_base_dir: Some(&env_dir),
            })
            .unwrap();

        let seed_path = compiled.root_dir.join("datastores/appdb/seed.dump.zst");
        assert_eq!(fs::read(seed_path).unwrap(), b"fake-zstd-pg-dump");

        let schema: Value = serde_json::from_slice(
            &fs::read(
                compiled
                    .root_dir
                    .join("datastores/appdb/schema_fingerprint.json"),
            )
            .unwrap(),
        )
        .unwrap();
        assert_eq!(schema["name"], "appdb");
        assert_eq!(schema["kind"], "postgres");
        assert_eq!(schema["source"], "declared");
        assert_eq!(schema["fingerprint"]["tables"][0], "public.users");
        assert_eq!(schema["seed"]["sha256"], sha256_hex(b"fake-zstd-pg-dump"));

        let state_diff: Value = serde_json::from_slice(
            &fs::read(compiled.root_dir.join("grading/state_diff_spec.json")).unwrap(),
        )
        .unwrap();
        assert_eq!(state_diff["version"], 1);
        assert_eq!(state_diff["datastores"][0]["name"], "appdb");
        assert_eq!(
            state_diff["datastores"][0]["seedPath"],
            "datastores/appdb/seed.dump.zst"
        );
        assert_eq!(
            state_diff["datastores"][0]["schemaFingerprintPath"],
            "datastores/appdb/schema_fingerprint.json"
        );
        assert_eq!(
            state_diff["datastores"][0]["spec"]["logicalViews"][0]["name"],
            "users"
        );
        assert_eq!(
            state_diff["datastores"][0]["expectedDelta"]["source"],
            "snapshot_diff"
        );
        assert_eq!(
            state_diff["datastores"][0]["expectedDelta"]["insertedRows"],
            1
        );
        assert_eq!(
            state_diff["datastores"][0]["expectedDelta"]["deletedRows"],
            0
        );
        assert_eq!(
            state_diff["datastores"][0]["expectedDelta"]["tables"][0]["insertedRows"][0]["email"],
            "new@example.com"
        );

        let manifest_files = compiled
            .manifest
            .get("files")
            .and_then(Value::as_array)
            .unwrap();
        for expected in [
            "datastores/appdb/seed.dump.zst",
            "datastores/appdb/schema_fingerprint.json",
            "grading/state_diff_spec.json",
        ] {
            assert!(
                manifest_files
                    .iter()
                    .any(|file| file.get("path").and_then(Value::as_str) == Some(expected)),
                "manifest did not include {expected}"
            );
        }
    }

    #[test]
    fn expected_delta_uri_is_embedded_in_state_diff_spec() {
        let tmp = tempfile::tempdir().unwrap();
        let env_dir = tmp.path().join("env");
        fs::create_dir_all(env_dir.join("grading")).unwrap();
        fs::write(
            env_dir.join("grading/appdb.expected_delta.json"),
            serde_json::to_vec_pretty(&json!({
                "changed": true,
                "insertedRows": 1,
                "tables": [{
                    "schema": "public",
                    "name": "orders",
                    "insertedRows": [{ "id": "ord_1" }]
                }]
            }))
            .unwrap(),
        )
        .unwrap();

        let mut env_version = version();
        env_version.spec.datastores = vec![DatastoreSpec {
            name: "appdb".to_string(),
            kind: "postgres".to_string(),
            seed_uri: None,
            schema_fingerprint: None,
            state_diff_spec: Some(json!({
                "expectedDeltaUri": "grading/appdb.expected_delta.json"
            })),
        }];

        let compiled = WorldCompiler::new(tmp.path())
            .compile(WorldCompileInput {
                tenant_id: "tenant_1",
                env_version: &env_version,
                dataset_snapshot_id: "snapshot_1",
                scenario_id: "scenario_1",
                dataset_snapshot: None,
                environment_base_dir: Some(&env_dir),
            })
            .unwrap();

        let state_diff: Value = serde_json::from_slice(
            &fs::read(compiled.root_dir.join("grading/state_diff_spec.json")).unwrap(),
        )
        .unwrap();
        assert_eq!(
            state_diff["datastores"][0]["expectedDelta"]["tables"][0]["insertedRows"][0]["id"],
            "ord_1"
        );
        assert!(compiled
            .warnings
            .iter()
            .any(|warning| warning == "world.datastore.no_seed:appdb"));
        assert!(!compiled
            .warnings
            .iter()
            .any(|warning| warning.contains("expected_delta")));
    }

    #[test]
    fn datastore_seed_content_changes_bundle_hash() {
        let tmp = tempfile::tempdir().unwrap();
        let env_dir = tmp.path().join("env");
        fs::create_dir_all(env_dir.join("seeds")).unwrap();

        let mut env_version = version();
        env_version.spec.datastores = vec![DatastoreSpec {
            name: "appdb".to_string(),
            kind: "postgres".to_string(),
            seed_uri: Some("seeds/appdb.dump.zst".to_string()),
            schema_fingerprint: None,
            state_diff_spec: None,
        }];

        fs::write(env_dir.join("seeds/appdb.dump.zst"), b"seed-one").unwrap();
        let first = WorldCompiler::new(tmp.path())
            .compile(WorldCompileInput {
                tenant_id: "tenant_1",
                env_version: &env_version,
                dataset_snapshot_id: "snapshot_1",
                scenario_id: "scenario_1",
                dataset_snapshot: None,
                environment_base_dir: Some(&env_dir),
            })
            .unwrap();

        fs::write(env_dir.join("seeds/appdb.dump.zst"), b"seed-two").unwrap();
        let second = WorldCompiler::new(tmp.path())
            .compile(WorldCompileInput {
                tenant_id: "tenant_1",
                env_version: &env_version,
                dataset_snapshot_id: "snapshot_1",
                scenario_id: "scenario_1",
                dataset_snapshot: None,
                environment_base_dir: Some(&env_dir),
            })
            .unwrap();

        assert_ne!(first.bundle_ref.sha256, second.bundle_ref.sha256);
    }
}
