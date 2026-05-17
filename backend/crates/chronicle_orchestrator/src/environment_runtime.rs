//! Runtime adapter that starts optional world plumbing above the
//! generic `Sandbox` trait.
//!
//! The first implementation is single-container: upload/extract the
//! compiled world bundle into the sandbox, start `worldctl`, read the
//! env file it emits, and later export artifacts. Trials without a
//! `WorldPlan` use the `NoopEnvironmentRuntime` path.

use crate::error::{OrchestratorError, OrchestratorResult};
use async_trait::async_trait;
use chronicle_domain::WorldPlan;
use chronicle_sandbox::{ExecRequest, Sandbox};
use flate2::read::GzDecoder;
use flate2::{write::GzEncoder, Compression};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::time::Duration;

#[derive(Debug, Clone, Default)]
pub struct RuntimeEnv {
    pub vars: HashMap<String, String>,
}

#[derive(Debug, Clone)]
pub struct WorldHandle {
    pub bundle_sha256: String,
    pub remote_dir: String,
    pub runtime_env: HashMap<String, String>,
}

#[derive(Debug, Clone)]
pub struct WorldArtifacts {
    pub remote_dir: String,
    pub uri: String,
    pub size_bytes: Option<u64>,
}

#[async_trait]
pub trait EnvironmentRuntime: Send + Sync {
    async fn prepare(
        &self,
        sandbox: &dyn Sandbox,
        plan: Option<&WorldPlan>,
    ) -> OrchestratorResult<Option<WorldHandle>>;

    async fn start(
        &self,
        sandbox: &dyn Sandbox,
        handle: Option<&WorldHandle>,
    ) -> OrchestratorResult<RuntimeEnv>;

    async fn export(
        &self,
        sandbox: &dyn Sandbox,
        handle: Option<&WorldHandle>,
    ) -> OrchestratorResult<Option<WorldArtifacts>>;
}

#[derive(Debug, Clone, Default)]
pub struct NoopEnvironmentRuntime;

#[async_trait]
impl EnvironmentRuntime for NoopEnvironmentRuntime {
    async fn prepare(
        &self,
        _sandbox: &dyn Sandbox,
        _plan: Option<&WorldPlan>,
    ) -> OrchestratorResult<Option<WorldHandle>> {
        Ok(None)
    }

    async fn start(
        &self,
        _sandbox: &dyn Sandbox,
        _handle: Option<&WorldHandle>,
    ) -> OrchestratorResult<RuntimeEnv> {
        Ok(RuntimeEnv::default())
    }

    async fn export(
        &self,
        _sandbox: &dyn Sandbox,
        _handle: Option<&WorldHandle>,
    ) -> OrchestratorResult<Option<WorldArtifacts>> {
        Ok(None)
    }
}

#[derive(Debug, Clone, Default)]
pub struct SingleContainerRuntime;

#[async_trait]
impl EnvironmentRuntime for SingleContainerRuntime {
    async fn prepare(
        &self,
        sandbox: &dyn Sandbox,
        plan: Option<&WorldPlan>,
    ) -> OrchestratorResult<Option<WorldHandle>> {
        let Some(plan) = plan else {
            return Ok(None);
        };
        let local = local_bundle_path(&plan.bundle_ref.uri)?;
        let remote_dir = "/tmp/chronicle/world".to_string();
        sandbox
            .exec(
                ExecRequest::new(format!("rm -rf {remote_dir} && mkdir -p {remote_dir}"))
                    .with_timeout(Duration::from_secs(20)),
            )
            .await?;
        sandbox.upload_dir(&local, &remote_dir).await?;
        Ok(Some(WorldHandle {
            bundle_sha256: plan.bundle_ref.sha256.as_str().to_string(),
            remote_dir,
            runtime_env: plan.env.clone(),
        }))
    }

    async fn start(
        &self,
        sandbox: &dyn Sandbox,
        handle: Option<&WorldHandle>,
    ) -> OrchestratorResult<RuntimeEnv> {
        let Some(handle) = handle else {
            return Ok(RuntimeEnv::default());
        };
        let cmd = format!(
            "worldctl start --bundle {} && worldctl status --json && cat {}/env",
            shell_escape(&handle.remote_dir),
            shell_escape(&handle.remote_dir),
        );
        let mut req = ExecRequest::new(cmd).with_timeout(Duration::from_secs(60));
        for (key, value) in &handle.runtime_env {
            req = req.with_env(key.clone(), value.clone());
        }
        let result = sandbox.exec(req).await?;
        if result.return_code != 0 {
            return Err(OrchestratorError::SandboxStartFailed(format!(
                "worldctl start failed: stdout={} stderr={}",
                truncate(&result.stdout, 2048),
                truncate(&result.stderr, 2048)
            )));
        }
        Ok(RuntimeEnv {
            vars: parse_env_file(&result.stdout),
        })
    }

    async fn export(
        &self,
        sandbox: &dyn Sandbox,
        handle: Option<&WorldHandle>,
    ) -> OrchestratorResult<Option<WorldArtifacts>> {
        let Some(handle) = handle else {
            return Ok(None);
        };
        let out = "/tmp/chronicle/world_artifacts";
        let cmd = format!(
            "rm -rf {out} && mkdir -p {out} && worldctl export --bundle {} --out {out}",
            shell_escape(&handle.remote_dir),
        );
        let result = sandbox
            .exec(ExecRequest::new(cmd).with_timeout(Duration::from_secs(60)))
            .await?;
        if result.return_code != 0 {
            return Err(OrchestratorError::SandboxStartFailed(format!(
                "worldctl export failed: stdout={} stderr={}",
                truncate(&result.stdout, 2048),
                truncate(&result.stderr, 2048)
            )));
        }
        let (uri, size_bytes) = persist_world_artifacts(sandbox, handle, out).await?;
        Ok(Some(WorldArtifacts {
            remote_dir: out.to_string(),
            uri,
            size_bytes: Some(size_bytes),
        }))
    }
}

async fn persist_world_artifacts(
    sandbox: &dyn Sandbox,
    handle: &WorldHandle,
    remote_dir: &str,
) -> OrchestratorResult<(String, u64)> {
    let artifact_id = format!("{}-{}", handle.bundle_sha256, ulid::Ulid::new());
    let root = world_artifact_root();
    let expanded = root.join("expanded").join(&artifact_id);
    let packages = root.join("packages");
    fs::create_dir_all(&expanded).map_err(|e| {
        OrchestratorError::SandboxStartFailed(format!(
            "failed to create world artifact dir {}: {e}",
            expanded.display()
        ))
    })?;
    fs::create_dir_all(&packages).map_err(|e| {
        OrchestratorError::SandboxStartFailed(format!(
            "failed to create world artifact package dir {}: {e}",
            packages.display()
        ))
    })?;

    sandbox.download_dir(remote_dir, &expanded).await?;

    let package = packages.join(format!("{artifact_id}.tar.gz"));
    write_dir_tar_gz(&expanded, &package)?;
    let size_bytes = fs::metadata(&package)
        .map_err(|e| {
            OrchestratorError::SandboxStartFailed(format!(
                "failed to stat world artifact package {}: {e}",
                package.display()
            ))
        })?
        .len();
    Ok((format!("file://{}", package.display()), size_bytes))
}

fn world_artifact_root() -> PathBuf {
    std::env::var("CHRONICLE_WORLD_ARTIFACT_ROOT")
        .ok()
        .filter(|path| !path.trim().is_empty())
        .map(PathBuf::from)
        .unwrap_or_else(|| std::env::temp_dir().join("chronicle/world-artifacts"))
}

fn local_bundle_path(uri: &str) -> OrchestratorResult<PathBuf> {
    if let Some(path) = uri.strip_prefix("file://") {
        let path = PathBuf::from(path);
        if path.is_file()
            && path
                .file_name()
                .and_then(|name| name.to_str())
                .map(|name| name.ends_with(".tar.gz"))
                .unwrap_or(false)
        {
            return materialize_tar_gz(&path);
        }
        return Ok(path);
    }
    if let Some(rest) = uri.strip_prefix("local://") {
        return Ok(std::env::temp_dir().join("chronicle").join(rest));
    }
    Err(OrchestratorError::SandboxStartFailed(format!(
        "unsupported world bundle uri for single-container runtime: {uri}"
    )))
}

fn materialize_tar_gz(path: &std::path::Path) -> OrchestratorResult<PathBuf> {
    let file_stem = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("bundle.tar.gz")
        .trim_end_matches(".tar.gz");
    let out = std::env::temp_dir()
        .join("chronicle/world-bundle-materialized")
        .join(file_stem);
    if out.exists() {
        fs::remove_dir_all(&out).map_err(|e| {
            OrchestratorError::SandboxStartFailed(format!(
                "failed to clear materialized world bundle {}: {e}",
                out.display()
            ))
        })?;
    }
    fs::create_dir_all(&out).map_err(|e| {
        OrchestratorError::SandboxStartFailed(format!(
            "failed to create materialized world bundle dir {}: {e}",
            out.display()
        ))
    })?;
    let file = fs::File::open(path).map_err(|e| {
        OrchestratorError::SandboxStartFailed(format!(
            "failed to open world bundle package {}: {e}",
            path.display()
        ))
    })?;
    let decoder = GzDecoder::new(file);
    let mut archive = tar::Archive::new(decoder);
    archive.unpack(&out).map_err(|e| {
        OrchestratorError::SandboxStartFailed(format!(
            "failed to extract world bundle package {}: {e}",
            path.display()
        ))
    })?;
    let world = out.join("world");
    if !world.join("manifest.json").is_file() {
        return Err(OrchestratorError::SandboxStartFailed(format!(
            "world bundle package {} did not contain world/manifest.json",
            path.display()
        )));
    }
    Ok(world)
}

fn write_dir_tar_gz(src: &std::path::Path, dst: &std::path::Path) -> OrchestratorResult<()> {
    let file = fs::File::create(dst).map_err(|e| {
        OrchestratorError::SandboxStartFailed(format!(
            "failed to create world artifact package {}: {e}",
            dst.display()
        ))
    })?;
    let enc = GzEncoder::new(file, Compression::default());
    let mut builder = tar::Builder::new(enc);
    builder.append_dir_all(".", src).map_err(|e| {
        OrchestratorError::SandboxStartFailed(format!(
            "failed to tar world artifacts from {}: {e}",
            src.display()
        ))
    })?;
    let enc = builder.into_inner().map_err(|e| {
        OrchestratorError::SandboxStartFailed(format!(
            "failed to finish world artifact tar {}: {e}",
            dst.display()
        ))
    })?;
    enc.finish().map_err(|e| {
        OrchestratorError::SandboxStartFailed(format!(
            "failed to finish world artifact gzip {}: {e}",
            dst.display()
        ))
    })?;
    Ok(())
}

fn parse_env_file(raw: &str) -> HashMap<String, String> {
    raw.lines()
        .filter_map(|line| {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                return None;
            }
            let line = line.strip_prefix("export ").unwrap_or(line);
            let (k, v) = line.split_once('=')?;
            Some((k.trim().to_string(), v.trim().trim_matches('"').to_string()))
        })
        .collect()
}

fn shell_escape(s: &str) -> String {
    if s.chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '-' | '/' | '.' | ':'))
    {
        return s.to_string();
    }
    format!("'{}'", s.replace('\'', "'\\''"))
}

fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        return s.to_string();
    }
    format!("{}...[+{} bytes]", &s[..max], s.len() - max)
}

#[cfg(test)]
mod tests {
    use super::*;
    use flate2::{write::GzEncoder, Compression, GzBuilder};
    use std::io::Write;

    #[test]
    fn local_bundle_path_accepts_expanded_directory_uri() {
        let tmp = tempfile::tempdir().unwrap();
        let world = tmp.path().join("world");
        fs::create_dir_all(&world).unwrap();
        let resolved = local_bundle_path(&format!("file://{}", world.display())).unwrap();
        assert_eq!(resolved, world);
    }

    #[test]
    fn local_bundle_path_materializes_tar_gz_uri() {
        let tmp = tempfile::tempdir().unwrap();
        let package = tmp.path().join("bundle.tar.gz");
        write_test_package(&package);
        let resolved = local_bundle_path(&format!("file://{}", package.display())).unwrap();
        assert!(resolved.join("manifest.json").is_file());
    }

    #[test]
    fn parse_env_file_accepts_exported_shell_lines() {
        let vars = parse_env_file(
            r#"
            export WORLD_SOCKET=/tmp/world.sock
            HTTP_PROXY=http://127.0.0.1:8888
            "#,
        );
        assert_eq!(vars["WORLD_SOCKET"], "/tmp/world.sock");
        assert_eq!(vars["HTTP_PROXY"], "http://127.0.0.1:8888");
    }

    fn write_test_package(path: &std::path::Path) {
        let file = fs::File::create(path).unwrap();
        let encoder: GzEncoder<fs::File> = GzBuilder::new()
            .mtime(0)
            .write(file, Compression::default());
        let mut builder = tar::Builder::new(encoder);
        let bytes = br#"{"sha256":"test"}"#;
        let mut header = tar::Header::new_gnu();
        header.set_size(bytes.len() as u64);
        header.set_mode(0o644);
        header.set_mtime(0);
        header.set_cksum();
        builder
            .append_data(&mut header, "world/manifest.json", &bytes[..])
            .unwrap();
        let mut encoder = builder.into_inner().unwrap();
        encoder.flush().unwrap();
        encoder.finish().unwrap();
    }
}
