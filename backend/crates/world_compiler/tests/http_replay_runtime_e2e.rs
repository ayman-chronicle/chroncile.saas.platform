use chronicle_domain::{
    Dataset, DatasetSnapshot, EnvironmentSpec, EnvironmentVersionRecord, EnvironmentVersionStatus,
    ServiceSpec, StreamTimelineEvent, TraceStatus, TraceSummary,
};
use chronicle_world_compiler::{WorldCompileInput, WorldCompiler};
use chronicle_world_runtime::{
    default_socket_for_bundle, send_rpc, HttpMatchRequest, WorldRpcRequest, WorldRpcResponse,
};
use chrono::{TimeZone, Utc};
use serde_json::{json, Value};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::process::{Command, Output};
use std::sync::OnceLock;

static RUNTIME_BINS: OnceLock<()> = OnceLock::new();

#[test]
fn compiled_bundle_replays_http_through_worldd_and_exports_coverage() {
    let tmp = tempfile::tempdir().unwrap();
    let compiled = compile_fixture_bundle(tmp.path());
    let world = WorldProcess::start(&compiled.root_dir);

    let response = send_rpc(
        &default_socket_for_bundle(&compiled.root_dir),
        &WorldRpcRequest::MatchHttp {
            request: HttpMatchRequest {
                method: "GET".to_string(),
                url: "https://api.example.com/v1/items?limit=10".to_string(),
                authority: "api.example.com".to_string(),
                path: "/v1/items".to_string(),
                path_query: "/v1/items?limit=10".to_string(),
                headers: BTreeMap::from([("accept".to_string(), "application/json".to_string())]),
                body: Value::Null,
            },
        },
    )
    .unwrap();
    let WorldRpcResponse::HttpMatched(matched) = response else {
        panic!("expected http_matched response from worldd");
    };
    assert_eq!(matched.match_kind, "replay");
    assert_eq!(matched.status_code, 200);
    assert_eq!(matched.body["items"][0]["id"], "item_1");

    let export_dir = tmp.path().join("export");
    world.run_worldctl(
        &["export", "--bundle", world.bundle(), "--out"],
        Some(&export_dir),
    );
    let coverage: Value =
        serde_json::from_slice(&std::fs::read(export_dir.join("coverage.json")).unwrap()).unwrap();
    let interactions = std::fs::read_to_string(export_dir.join("interactions.jsonl")).unwrap();

    assert_eq!(coverage["byMatchKind"]["replay"], 1);
    assert!(interactions.contains(r#""matchKind":"replay""#));
    assert!(interactions.contains(r#""methodPath":"GET /v1/items?limit=10""#));
}

#[test]
#[ignore = "requires Docker, a built runtime image, and CHRONICLE_RUNTIME_DOCKER_E2E=1"]
fn compiled_bundle_replays_http_through_runtime_image_mitmproxy() {
    if std::env::var("CHRONICLE_RUNTIME_DOCKER_E2E")
        .ok()
        .as_deref()
        != Some("1")
    {
        eprintln!("skipping Docker replay E2E; set CHRONICLE_RUNTIME_DOCKER_E2E=1 to run it");
        return;
    }

    let tmp = tempfile::tempdir().unwrap();
    let compiled = compile_fixture_bundle(tmp.path());
    let image = std::env::var("CHRONICLE_RUNTIME_IMAGE")
        .unwrap_or_else(|_| "chronicle/sandbox-runtime:latest".to_string());
    let container = DockerContainer::run(&image, &compiled.root_dir);

    container.exec_root(&["worldctl", "start", "--bundle", "/tmp/chronicle/world"]);
    container.wait_for_tcp_port(8888);
    let curl = container.exec_agent_raw(&[
        "bash",
        "-lc",
        r#"
        set -euo pipefail
        source /tmp/chronicle/world/env
        curl -fsS --max-time 5 'https://api.example.com/v1/items?limit=10'
        "#,
    ]);
    if !curl.status.success() {
        let status = container.exec_root_raw(&[
            "worldctl",
            "status",
            "--bundle",
            "/tmp/chronicle/world",
            "--json",
        ]);
        let env = container.exec_root_raw(&["cat", "/tmp/chronicle/world/env"]);
        let regular_log = container.exec_root_raw(&[
            "sh",
            "-lc",
            "cat /tmp/chronicle/world/runtime/mitmproxy-regular.stderr.log 2>/dev/null || true",
        ]);
        let transparent_log = container.exec_root_raw(&[
            "sh",
            "-lc",
            "cat /tmp/chronicle/world/runtime/mitmproxy-transparent.stderr.log 2>/dev/null || true",
        ]);
        let _ = container.exec_root_raw(&[
            "worldctl",
            "export",
            "--bundle",
            "/tmp/chronicle/world",
            "--out",
            "/tmp/chronicle/world_artifacts",
        ]);
        let interactions = container.exec_root_raw(&[
            "sh",
            "-lc",
            "cat /tmp/chronicle/world_artifacts/interactions.jsonl 2>/dev/null || true",
        ]);
        panic!(
            "agent curl failed\nstatus={}\nstdout={}\nstderr={}\nworld_status={}\nenv={}\nregular_mitm_stderr={}\ntransparent_mitm_stderr={}\ninteractions={}",
            curl.status,
            String::from_utf8_lossy(&curl.stdout),
            String::from_utf8_lossy(&curl.stderr),
            String::from_utf8_lossy(&status.stdout),
            String::from_utf8_lossy(&env.stdout),
            String::from_utf8_lossy(&regular_log.stdout),
            String::from_utf8_lossy(&transparent_log.stdout),
            String::from_utf8_lossy(&interactions.stdout),
        );
    }
    assert!(
        String::from_utf8_lossy(&curl.stdout).contains("item_1"),
        "curl stdout={} stderr={}",
        String::from_utf8_lossy(&curl.stdout),
        String::from_utf8_lossy(&curl.stderr)
    );

    container.exec_root(&[
        "worldctl",
        "export",
        "--bundle",
        "/tmp/chronicle/world",
        "--out",
        "/tmp/chronicle/world_artifacts",
    ]);
    let coverage = container.exec_root(&["cat", "/tmp/chronicle/world_artifacts/coverage.json"]);
    let interactions =
        container.exec_root(&["cat", "/tmp/chronicle/world_artifacts/interactions.jsonl"]);
    let coverage: Value = serde_json::from_slice(&coverage.stdout).unwrap();
    let interactions = String::from_utf8(interactions.stdout).unwrap();

    assert_eq!(coverage["byMatchKind"]["replay"], 1);
    assert!(interactions.contains(r#""matchKind":"replay""#));
}

struct WorldProcess {
    bundle: PathBuf,
}

impl WorldProcess {
    fn start(bundle: &Path) -> Self {
        build_runtime_bins();
        let world = Self {
            bundle: bundle.to_path_buf(),
        };
        world.run_worldctl(&["start", "--bundle", world.bundle()], None);
        world
    }

    fn bundle(&self) -> &str {
        self.bundle.to_str().expect("bundle path should be utf-8")
    }

    fn run_worldctl(&self, args: &[&str], trailing_path: Option<&Path>) -> Output {
        let mut cmd = Command::new(bin_path("worldctl"));
        cmd.env("CHRONICLE_WORLD_INTERCEPT", "disabled");
        cmd.args(args);
        if let Some(path) = trailing_path {
            cmd.arg(path);
        }
        assert_success(cmd)
    }
}

impl Drop for WorldProcess {
    fn drop(&mut self) {
        let _ = Command::new(bin_path("worldctl"))
            .env("CHRONICLE_WORLD_INTERCEPT", "disabled")
            .args(["stop", "--bundle", self.bundle()])
            .output();
    }
}

struct DockerContainer {
    id: String,
}

impl DockerContainer {
    fn run(image: &str, bundle_root: &Path) -> Self {
        let name = format!("chronicle-http-replay-{}", unique_id());
        let mount = format!("{}:/tmp/chronicle/world", bundle_root.display());
        let output = assert_success({
            let mut cmd = Command::new("docker");
            cmd.args([
                "run",
                "--rm",
                "-d",
                "--cap-add",
                "NET_ADMIN",
                "--name",
                &name,
                "-v",
                &mount,
                image,
                "sleep",
                "infinity",
            ]);
            cmd
        });
        let id = String::from_utf8(output.stdout).unwrap().trim().to_string();
        Self {
            id: if id.is_empty() { name } else { id },
        }
    }

    fn exec_root(&self, args: &[&str]) -> Output {
        self.exec_root_raw(args)
            .inspect_success(format!("docker exec root {:?}", args))
    }

    fn exec_root_raw(&self, args: &[&str]) -> Output {
        let mut cmd = Command::new("docker");
        cmd.arg("exec").arg(&self.id).args(args);
        cmd.output()
            .unwrap_or_else(|err| panic!("docker exec root {:?} failed to start: {err}", args))
    }

    fn exec_agent_raw(&self, args: &[&str]) -> Output {
        let mut cmd = Command::new("docker");
        cmd.arg("exec")
            .arg("-u")
            .arg("agent")
            .arg(&self.id)
            .args(args);
        cmd.output()
            .unwrap_or_else(|err| panic!("docker exec agent {:?} failed to start: {err}", args))
    }

    fn wait_for_tcp_port(&self, port: u16) {
        let script = format!(
            r#"
            set -eu
            for _ in $(seq 1 40); do
              if bash -lc '</dev/tcp/127.0.0.1/{port}' >/dev/null 2>&1; then
                exit 0
              fi
              sleep 0.25
            done
            exit 1
            "#
        );
        self.exec_root(&["bash", "-lc", &script]);
    }
}

impl Drop for DockerContainer {
    fn drop(&mut self) {
        let _ = Command::new("docker").args(["rm", "-f", &self.id]).output();
    }
}

fn build_runtime_bins() {
    RUNTIME_BINS.get_or_init(|| {
        assert_success({
            let mut cmd = Command::new("cargo");
            cmd.current_dir(workspace_root());
            cmd.args(["build", "-p", "worldctl", "-p", "worldd"]);
            cmd
        });
    });
}

fn bin_path(name: &str) -> PathBuf {
    target_debug_dir().join(format!("{name}{}", std::env::consts::EXE_SUFFIX))
}

fn target_debug_dir() -> PathBuf {
    std::env::var("CARGO_TARGET_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| workspace_root().join("target"))
        .join("debug")
}

fn workspace_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(2)
        .expect("world_compiler lives under backend/crates")
        .to_path_buf()
}

fn assert_success(mut cmd: Command) -> Output {
    let debug = format!("{cmd:?}");
    let output = cmd
        .output()
        .unwrap_or_else(|err| panic!("{debug} failed to start: {err}"));
    output.inspect_success(debug)
}

trait OutputExt {
    fn inspect_success(self, debug: String) -> Self;
}

impl OutputExt for Output {
    fn inspect_success(self, debug: String) -> Self {
        assert!(
            self.status.success(),
            "{debug} failed\nstatus={}\nstdout={}\nstderr={}",
            self.status,
            String::from_utf8_lossy(&self.stdout),
            String::from_utf8_lossy(&self.stderr)
        );
        self
    }
}

fn unique_id() -> String {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0, |duration| duration.as_nanos());
    format!("{}-{nanos}", std::process::id())
}

fn compile_fixture_bundle(output_root: &Path) -> chronicle_world_compiler::CompiledWorldBundle {
    let env_version = env_version();
    let snapshot = snapshot(capture_payload());
    WorldCompiler::new(output_root)
        .compile(WorldCompileInput {
            tenant_id: "tenant_1",
            env_version: &env_version,
            dataset_snapshot_id: "snapshot_1",
            scenario_id: "scenario_1",
            dataset_snapshot: Some(&snapshot),
            environment_base_dir: None,
        })
        .unwrap()
}

fn env_version() -> EnvironmentVersionRecord {
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
        traces: vec![TraceSummary {
            trace_id: "scenario_1".to_string(),
            label: "Scenario".to_string(),
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
        }],
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

fn capture_payload() -> Value {
    json!({
        "request": {
            "method": "GET",
            "url": "https://api.example.com/v1/items?limit=10",
            "headers": { "accept": "application/json" },
            "body": null
        },
        "response": {
            "statusCode": 200,
            "headers": { "content-type": "application/json" },
            "body": { "items": [{ "id": "item_1" }] }
        }
    })
}
