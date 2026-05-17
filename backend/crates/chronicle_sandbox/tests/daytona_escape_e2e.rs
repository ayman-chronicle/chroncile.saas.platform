use chronicle_domain::{
    Dataset, DatasetSnapshot, EnvironmentSpec, EnvironmentVersionRecord, EnvironmentVersionStatus,
    ServiceSpec, StreamTimelineEvent, TraceStatus, TraceSummary,
};
use chronicle_sandbox::{
    DaytonaConfig, DaytonaSandbox, ExecRequest, ExecResult, ImageSource, Sandbox, StartOpts,
};
use chronicle_world_compiler::{CompiledWorldBundle, WorldCompileInput, WorldCompiler};
use chrono::{TimeZone, Utc};
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::time::Duration;

const REMOTE_WORLD_DIR: &str = "/tmp/chronicle/world";
const REMOTE_ARTIFACTS_DIR: &str = "/tmp/chronicle/world_artifacts";

#[tokio::test]
#[ignore = "requires DAYTONA_API_KEY, CHRONICLE_DAYTONA_E2E=1, and a published Chronicle runtime image"]
async fn daytona_compiled_bundle_replays_and_blocks_escape_matrix(
) -> Result<(), Box<dyn std::error::Error>> {
    if !daytona_e2e_enabled() {
        return Ok(());
    }

    let tmp = tempfile::tempdir()?;
    let compiled = compile_fixture_bundle(tmp.path());
    let mut sandbox = start_runtime_sandbox("replay").await?;

    let result = async {
        sandbox.upload_dir(&compiled.root_dir, REMOTE_WORLD_DIR).await?;
        exec_ok(
            &sandbox,
            "worldctl start",
            &format!("worldctl start --bundle {REMOTE_WORLD_DIR}"),
            Duration::from_secs(90),
        )
        .await?;
        wait_for_tcp_port(&sandbox, 8888).await?;
        wait_for_tcp_port(&sandbox, 8889).await?;

        let explicit = exec_agent(
            &sandbox,
            "explicit proxy replay",
            &format!(
                "bash -lc 'source {REMOTE_WORLD_DIR}/env && curl -fsS --max-time 10 \"https://api.example.com/v1/items?limit=10\"'"
            ),
            Duration::from_secs(20),
        )
        .await?;
        if !explicit.stdout.contains("item_1") {
            return Err(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!(
                    "explicit proxy replay returned unexpected body: stdout={} stderr={}",
                    explicit.stdout, explicit.stderr
                ),
            )
            .into());
        }

        let patch = exec_agent(
            &sandbox,
            "explicit proxy PATCH replay",
            &format!(
                "bash -lc 'source {REMOTE_WORLD_DIR}/env && \
                 status=$(curl -sS --max-time 10 -o /tmp/patch-replay.json -w \"%{{http_code}}\" \
                   -X PATCH \"https://api.example.com/v1/items/item_1\" \
                   -H \"content-type: application/json\" \
                   --data \"{{\\\"label\\\":\\\"Patched password reset guide\\\"}}\") && \
                 test \"$status\" = 200 && grep -q \"\\\"patched\\\":true\" /tmp/patch-replay.json'"
            ),
            Duration::from_secs(20),
        )
        .await?;
        if !patch.stdout.is_empty() {
            eprintln!("PATCH replay stdout: {}", patch.stdout);
        }

        let transparent = exec_agent(
            &sandbox,
            "transparent replay",
            &format!(
                "bash -lc 'env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u http_proxy -u https_proxy -u all_proxy curl -sS --max-time 10 --cacert {REMOTE_WORLD_DIR}/security/ca.crt --resolve api.example.com:443:1.1.1.1 -w \"\\nHTTP_STATUS=%{{http_code}}\\n\" \"https://api.example.com/v1/items?limit=10\"'"
            ),
            Duration::from_secs(20),
        )
        .await?;
        if !transparent.stdout.contains("item_1") {
            return Err(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!(
                    "transparent replay returned unexpected body: stdout={} stderr={}",
                    transparent.stdout, transparent.stderr
                ),
            )
            .into());
        }

        assert_http_status(
            &sandbox,
            "unknown HTTPS host",
            "bash -lc 'source /tmp/chronicle/world/env && curl -sS --max-time 10 -o /tmp/unknown-host.json -w \"%{http_code}\" \"https://unknown.example.com/escape\"'",
            "502",
        )
        .await?;
        assert_http_status(
            &sandbox,
            "unknown write",
            "bash -lc 'source /tmp/chronicle/world/env && curl -sS --max-time 10 -o /tmp/unknown-write.json -w \"%{http_code}\" -X POST \"https://api.example.com/v1/items\" -H \"content-type: application/json\" --data \"{\\\"id\\\":\\\"new\\\"}\"'",
            "501",
        )
        .await?;
        assert_http_status(
            &sandbox,
            "direct IPv4 HTTP",
            "bash -lc 'env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u http_proxy -u https_proxy -u all_proxy curl -sS --connect-timeout 2 --max-time 5 -o /tmp/direct-ip.json -w \"%{http_code}\" http://1.1.1.1/'",
            "502",
        )
        .await?;
        assert_firewall_counter_hits(
            &sandbox,
            "UDP 443",
            r#"bash -lc 'iptables -Z OUTPUT; sudo -u agent python3 - <<'"'"'PY'"'"' >/tmp/udp443 2>&1 || true
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.settimeout(0.2)
try:
    s.sendto(b"x", ("1.1.1.1", 443))
except OSError:
    pass
PY
iptables -L OUTPUT -v -n -x'"#,
            "udp dpt:443",
        )
        .await?;
        assert_firewall_counter_hits(
            &sandbox,
            "external DNS",
            r#"bash -lc 'iptables -Z OUTPUT; sudo -u agent python3 - <<'"'"'PY'"'"' >/tmp/external-dns 2>&1 || true
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.settimeout(0.2)
try:
    s.sendto(b"x", ("1.1.1.1", 53))
except OSError:
    pass
PY
iptables -L OUTPUT -v -n -x'"#,
            "udp dpt:53",
        )
        .await?;
        assert_http_status(
            &sandbox,
            "DNS over HTTPS",
            "bash -lc 'env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u http_proxy -u https_proxy -u all_proxy curl -sS --connect-timeout 2 --max-time 5 --cacert /tmp/chronicle/world/security/ca.crt --resolve cloudflare-dns.com:443:1.1.1.1 -o /tmp/doh.json -w \"%{http_code}\" \"https://cloudflare-dns.com/dns-query\" -H \"accept: application/dns-json\"'",
            "502",
        )
        .await?;
        assert_firewall_counter_hits(
            &sandbox,
            "DNS over TLS",
            "bash -lc 'iptables -Z OUTPUT; sudo -u agent timeout 2 bash -lc \"</dev/tcp/1.1.1.1/853\" >/tmp/dot 2>&1 || true; iptables -L OUTPUT -v -n -x'",
            "tcp dpt:853",
        )
        .await?;

        exec_ok(
            &sandbox,
            "worldctl export",
            &format!("worldctl export --bundle {REMOTE_WORLD_DIR} --out {REMOTE_ARTIFACTS_DIR}"),
            Duration::from_secs(60),
        )
        .await?;

        let artifact_dir = tmp.path().join("daytona_artifacts");
        sandbox
            .download_dir(REMOTE_ARTIFACTS_DIR, &artifact_dir)
            .await?;
        assert_world_artifacts(&artifact_dir)?;
        persist_artifact_dir("replay-matrix", "world_artifacts", &artifact_dir)?;
        Ok::<(), Box<dyn std::error::Error>>(())
    }
    .await;

    if let Err(err) = result.as_ref() {
        collect_failure_diagnostics(&sandbox, tmp.path(), err).await;
    }

    let _ = sandbox
        .exec(ExecRequest::new(format!(
            "worldctl stop --bundle {REMOTE_WORLD_DIR}"
        )))
        .await;
    let _ = sandbox.stop(true).await;
    result
}

#[tokio::test]
#[ignore = "requires DAYTONA_API_KEY, CHRONICLE_DAYTONA_E2E=1, and a published Chronicle runtime image"]
async fn daytona_runtime_image_contains_world_interception_tools(
) -> Result<(), Box<dyn std::error::Error>> {
    if !daytona_e2e_enabled() {
        return Ok(());
    }

    let mut sandbox = start_runtime_sandbox("tools").await?;
    let result = sandbox
        .exec(
            ExecRequest::new(
                "bash -lc 'test -x /usr/local/bin/worldctl && \
                 test -x /usr/local/bin/worldd && \
                 test -f /opt/chronicle/chronicle_addon.py && \
                 command -v mitmdump >/dev/null && \
                 command -v iptables >/dev/null && \
                 id agent >/dev/null'",
            )
            .with_timeout(Duration::from_secs(15)),
        )
        .await;
    let _ = sandbox.stop(true).await;
    let result = result?;
    assert_eq!(
        result.return_code, 0,
        "runtime image missing interception tooling: stdout={} stderr={}",
        result.stdout, result.stderr
    );
    Ok(())
}

async fn collect_failure_diagnostics(
    sandbox: &DaytonaSandbox,
    tmp: &Path,
    err: &Box<dyn std::error::Error>,
) {
    eprintln!("Daytona world E2E failed: {err}");
    let command = format!(
        "bash -lc 'set +e; \
         echo \"--- worldctl status ---\"; worldctl status --bundle {REMOTE_WORLD_DIR} --json; \
         echo \"--- iptables nat OUTPUT ---\"; iptables -t nat -S OUTPUT; \
         echo \"--- iptables filter OUTPUT ---\"; iptables -S OUTPUT; \
         echo \"--- runtime logs ---\"; \
         for f in {REMOTE_WORLD_DIR}/runtime/*.log; do echo \"--- $f ---\"; tail -200 \"$f\"; done; \
         worldctl export --bundle {REMOTE_WORLD_DIR} --out {REMOTE_ARTIFACTS_DIR}; \
         true'"
    );
    match sandbox
        .exec(ExecRequest::new(command).with_timeout(Duration::from_secs(30)))
        .await
    {
        Ok(result) => eprintln!(
            "Daytona failure diagnostics stdout:\n{}\nstderr:\n{}",
            result.stdout, result.stderr
        ),
        Err(diag_err) => eprintln!("failed to collect Daytona diagnostics: {diag_err}"),
    }

    let debug_root = daytona_artifact_root().unwrap_or_else(|| tmp.join("daytona_failure"));
    let debug_dir = debug_root.join("replay-matrix").join("failure_world");
    match sandbox.download_dir(REMOTE_WORLD_DIR, &debug_dir).await {
        Ok(()) => eprintln!(
            "downloaded Daytona failure world directory to {}",
            debug_dir.display()
        ),
        Err(download_err) => eprintln!("failed to download Daytona failure world: {download_err}"),
    }

    let artifact_dir = debug_root.join("replay-matrix").join("failure_artifacts");
    match sandbox
        .download_dir(REMOTE_ARTIFACTS_DIR, &artifact_dir)
        .await
    {
        Ok(()) => eprintln!(
            "downloaded Daytona failure artifacts to {}",
            artifact_dir.display()
        ),
        Err(download_err) => {
            eprintln!("failed to download Daytona failure artifacts: {download_err}")
        }
    }
}

async fn start_runtime_sandbox(suffix: &str) -> Result<DaytonaSandbox, Box<dyn std::error::Error>> {
    let cfg = DaytonaConfig::from_env();
    cfg.preflight()?;
    let mut sandbox = DaytonaSandbox::new(cfg)?;
    sandbox
        .start(StartOpts {
            session_id: format!("chronicle-daytona-{suffix}-{}", ulid::Ulid::new()),
            image: runtime_source(),
            allow_internet: false,
            max_lifetime: Duration::from_secs(10 * 60),
            idle_timeout: Some(Duration::from_secs(5 * 60)),
            ..StartOpts::default()
        })
        .await?;
    Ok(sandbox)
}

async fn wait_for_tcp_port(
    sandbox: &DaytonaSandbox,
    port: u16,
) -> Result<(), Box<dyn std::error::Error>> {
    exec_ok(
        sandbox,
        &format!("wait for TCP {port}"),
        &format!(
            r#"bash -lc 'for _ in $(seq 1 80); do if bash -lc "</dev/tcp/127.0.0.1/{port}" >/dev/null 2>&1; then exit 0; fi; sleep 0.25; done; exit 1'"#
        ),
        Duration::from_secs(30),
    )
    .await?;
    Ok(())
}

async fn exec_agent(
    sandbox: &DaytonaSandbox,
    name: &str,
    command: &str,
    timeout: Duration,
) -> Result<ExecResult, Box<dyn std::error::Error>> {
    let result = sandbox
        .exec(
            ExecRequest::new(command.to_string())
                .with_user("agent")
                .with_timeout(timeout),
        )
        .await?;
    if result.return_code != 0 {
        return Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!(
                "{name} failed: stdout={} stderr={}",
                result.stdout, result.stderr
            ),
        )
        .into());
    }
    Ok(result)
}

async fn exec_ok(
    sandbox: &DaytonaSandbox,
    name: &str,
    command: &str,
    timeout: Duration,
) -> Result<ExecResult, Box<dyn std::error::Error>> {
    let result = sandbox
        .exec(ExecRequest::new(command.to_string()).with_timeout(timeout))
        .await?;
    if result.return_code != 0 {
        return Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!(
                "{name} failed: stdout={} stderr={}",
                result.stdout, result.stderr
            ),
        )
        .into());
    }
    Ok(result)
}

async fn assert_http_status(
    sandbox: &DaytonaSandbox,
    name: &str,
    command: &str,
    expected_status: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let result = sandbox
        .exec(
            ExecRequest::new(command.to_string())
                .with_user("agent")
                .with_timeout(Duration::from_secs(20)),
        )
        .await?;
    if result.return_code != 0 || result.stdout.trim() != expected_status {
        return Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!(
                "{name} returned unexpected status: expected={expected_status} stdout={} stderr={} code={}",
                result.stdout, result.stderr, result.return_code
            ),
        )
        .into());
    }
    Ok(())
}

async fn assert_firewall_counter_hits(
    sandbox: &DaytonaSandbox,
    name: &str,
    command: &str,
    rule_fragment: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let result = sandbox
        .exec(ExecRequest::new(command.to_string()).with_timeout(Duration::from_secs(20)))
        .await?;
    if result.return_code != 0 {
        return Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!(
                "{name} firewall probe failed: stdout={} stderr={} code={}",
                result.stdout, result.stderr, result.return_code
            ),
        )
        .into());
    }
    for line in result.stdout.lines() {
        if line.contains(rule_fragment) {
            let packets = line
                .split_whitespace()
                .next()
                .and_then(|value| value.parse::<u64>().ok())
                .unwrap_or(0);
            if packets > 0 {
                return Ok(());
            }
        }
    }
    return Err(std::io::Error::new(
        std::io::ErrorKind::Other,
        format!(
            "{name} did not hit firewall rule containing {rule_fragment:?}: stdout={} stderr={}",
            result.stdout, result.stderr
        ),
    )
    .into());
}

fn assert_world_artifacts(artifact_dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let coverage: Value =
        serde_json::from_slice(&std::fs::read(artifact_dir.join("coverage.json"))?)?;
    let interactions = std::fs::read_to_string(artifact_dir.join("interactions.jsonl"))?;
    assert!(
        coverage["byMatchKind"]["replay"].as_u64().unwrap_or(0) >= 3,
        "coverage={coverage}\ninteractions={interactions}"
    );
    assert!(
        coverage["byMatchKind"]["blocked"].as_u64().unwrap_or(0) >= 3,
        "coverage={coverage}\ninteractions={interactions}"
    );
    assert!(
        coverage["byMatchKind"]["unmatched"].as_u64().unwrap_or(0) >= 1,
        "coverage={coverage}\ninteractions={interactions}"
    );
    assert!(interactions.contains(r#""matchKind":"replay""#));
    assert!(interactions.contains(r#""matchKind":"blocked""#));
    assert!(interactions.contains(r#""matchKind":"unmatched""#));
    assert!(interactions.contains(r#""methodPath":"GET /v1/items?limit=10""#));
    assert!(interactions.contains(r#""methodPath":"PATCH /v1/items/item_1""#));
    assert!(interactions.contains(r#""methodPath":"POST /v1/items""#));
    assert!(interactions.contains(r#""methodPath":"GET /escape""#));
    assert!(interactions.contains(r#""methodPath":"GET /dns-query""#));
    Ok(())
}

fn persist_artifact_dir(
    test_name: &str,
    artifact_name: &str,
    src: &Path,
) -> Result<(), Box<dyn std::error::Error>> {
    let Some(root) = daytona_artifact_root() else {
        return Ok(());
    };
    let dst = root.join(test_name).join(artifact_name);
    if dst.exists() {
        std::fs::remove_dir_all(&dst)?;
    }
    copy_dir_contents(src, &dst)?;
    eprintln!("persisted Daytona E2E artifacts to {}", dst.display());
    Ok(())
}

fn daytona_artifact_root() -> Option<PathBuf> {
    std::env::var_os("CHRONICLE_DAYTONA_E2E_ARTIFACT_DIR")
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
}

fn copy_dir_contents(src: &Path, dst: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        let file_type = entry.file_type()?;
        if file_type.is_dir() {
            copy_dir_contents(&src_path, &dst_path)?;
        } else if file_type.is_file() {
            if let Some(parent) = dst_path.parent() {
                std::fs::create_dir_all(parent)?;
            }
            std::fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}

fn compile_fixture_bundle(output_root: &Path) -> CompiledWorldBundle {
    let env_version = env_version();
    let snapshot = snapshot();
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

fn snapshot() -> DatasetSnapshot {
    let captures = vec![
        get_capture_payload(),
        get_capture_payload(),
        patch_capture_payload(),
    ];
    let events = captures
        .into_iter()
        .enumerate()
        .map(|(idx, payload)| StreamTimelineEvent {
            id: format!("ev_http_{idx}"),
            source: "capture".to_string(),
            event_type: "outbound_http".to_string(),
            occurred_at: Utc.timestamp_opt(1 + idx as i64, 0).unwrap(),
            actor: None,
            message: None,
            payload: Some(payload),
            stream: None,
            color: None,
            trace_id: Some("scenario_1".to_string()),
            parent_event_id: None,
            correlation_key: None,
            trace_label: None,
        })
        .collect::<Vec<_>>();
    let capture_count = events.len() as u32;
    DatasetSnapshot {
        dataset: Dataset {
            id: "ds".to_string(),
            name: "Dataset".to_string(),
            description: None,
            purpose: None,
            trace_count: 1,
            event_count: Some(capture_count),
            updated_at: None,
            created_by: None,
            tags: None,
        },
        traces: vec![TraceSummary {
            trace_id: "scenario_1".to_string(),
            label: "Scenario".to_string(),
            primary_source: "test".to_string(),
            sources: vec!["test".to_string()],
            event_count: capture_count,
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
        events: Some(events),
    }
}

fn get_capture_payload() -> Value {
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

fn patch_capture_payload() -> Value {
    json!({
        "request": {
            "method": "PATCH",
            "url": "https://api.example.com/v1/items/item_1",
            "headers": { "content-type": "application/json" },
            "body": { "label": "Patched password reset guide" }
        },
        "response": {
            "statusCode": 200,
            "headers": { "content-type": "application/json" },
            "body": {
                "id": "item_1",
                "label": "Patched password reset guide",
                "patched": true
            }
        }
    })
}

fn daytona_e2e_enabled() -> bool {
    match std::env::var("CHRONICLE_DAYTONA_E2E") {
        Ok(value) if value == "1" || value.eq_ignore_ascii_case("true") => true,
        _ => {
            eprintln!("skipping Daytona E2E; set CHRONICLE_DAYTONA_E2E=1 to run it");
            false
        }
    }
}

fn runtime_source() -> ImageSource {
    if let Ok(snapshot) = std::env::var("CHRONICLE_DAYTONA_RUNTIME_SNAPSHOT") {
        if !snapshot.is_empty() {
            return ImageSource::Snapshot(snapshot);
        }
    }
    for key in [
        "CHRONICLE_DAYTONA_RUNTIME_IMAGE",
        "CHRONICLE_WORLD_RUNTIME_IMAGE",
        "CHRONICLE_SANDBOX_RUNTIME_IMAGE",
    ] {
        if let Ok(image) = std::env::var(key) {
            if !image.is_empty() {
                return ImageSource::PrebuiltImage(image);
            }
        }
    }
    ImageSource::PrebuiltImage("chronicle/sandbox-runtime:latest".to_string())
}
