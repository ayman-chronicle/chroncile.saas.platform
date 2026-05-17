//! Local Docker sandbox driver.
//!
//! This is intentionally small: it exists so developers can exercise
//! the same `Sandbox` contract locally that Daytona uses in production.
//! The driver shells out to the Docker CLI, starts one container per
//! trial, and uses `docker exec` / `docker cp` for the trait surface.

use crate::capabilities::SandboxCapabilities;
use crate::error::{SandboxError, SandboxResult};
use crate::traits::Sandbox;
use crate::types::{ExecRequest, ExecResult, ImageSource, SandboxId, StartOpts};
use async_trait::async_trait;
use parking_lot::Mutex;
use std::path::Path;
use std::process::Stdio;
use std::sync::Arc;
use std::time::Duration;
use tokio::process::Command;
use tokio::time::timeout;

#[derive(Debug, Clone)]
pub struct DockerConfig {
    docker_bin: String,
}

impl DockerConfig {
    pub fn from_env() -> Self {
        Self {
            docker_bin: std::env::var("CHRONICLE_DOCKER_BIN")
                .ok()
                .filter(|value| !value.trim().is_empty())
                .unwrap_or_else(|| "docker".to_string()),
        }
    }

    pub fn preflight(&self) -> SandboxResult<()> {
        let output = std::process::Command::new(&self.docker_bin)
            .arg("version")
            .arg("--format")
            .arg("{{.Server.Version}}")
            .output()
            .map_err(|e| {
                SandboxError::Configuration(format!(
                    "Docker CLI '{}' is not available: {e}",
                    self.docker_bin
                ))
            })?;
        if !output.status.success() {
            return Err(SandboxError::Configuration(format!(
                "Docker daemon is not reachable: {}",
                String::from_utf8_lossy(&output.stderr)
            )));
        }
        Ok(())
    }
}

#[derive(Debug, Default)]
struct DockerState {
    id: Option<SandboxId>,
    name: Option<String>,
}

#[derive(Debug, Clone)]
pub struct DockerSandbox {
    cfg: DockerConfig,
    state: Arc<Mutex<DockerState>>,
}

impl DockerSandbox {
    pub fn new(cfg: DockerConfig) -> SandboxResult<Self> {
        cfg.preflight()?;
        Ok(Self {
            cfg,
            state: Arc::new(Mutex::new(DockerState::default())),
        })
    }

    fn require_name(&self) -> SandboxResult<String> {
        self.state.lock().name.clone().ok_or_else(|| {
            SandboxError::Internal("DockerSandbox operation called before start()".to_string())
        })
    }
}

#[async_trait]
impl Sandbox for DockerSandbox {
    fn capabilities(&self) -> SandboxCapabilities {
        SandboxCapabilities {
            gpus: false,
            disable_internet: true,
            network_block_all: true,
            windows: false,
            mounted: false,
            attach: true,
        }
    }

    fn driver(&self) -> &'static str {
        "docker"
    }

    fn id(&self) -> Option<&SandboxId> {
        None
    }

    async fn start(&mut self, opts: StartOpts) -> SandboxResult<SandboxId> {
        if self.state.lock().id.is_some() {
            return Err(SandboxError::Internal(
                "DockerSandbox: start() called twice".to_string(),
            ));
        }

        let image = image_for_start(&opts.image)?;
        let name = docker_name(&opts.session_id);
        let mut args = vec![
            "run".to_string(),
            "--detach".to_string(),
            "--name".to_string(),
            name.clone(),
            "--cpus".to_string(),
            opts.resources.cpus.max(1).to_string(),
            "--memory".to_string(),
            format!("{}m", opts.resources.memory_mb.max(256)),
        ];
        if !opts.allow_internet {
            args.push("--network".to_string());
            args.push("none".to_string());
            // World-backed local runs install iptables rules inside the
            // container. Daytona exposes this as a sandbox capability;
            // Docker needs the Linux capability explicitly.
            args.push("--cap-add".to_string());
            args.push("NET_ADMIN".to_string());
            args.push("--cap-add".to_string());
            args.push("NET_RAW".to_string());
        }
        for (key, value) in &opts.labels {
            args.push("--label".to_string());
            args.push(format!("{key}={value}"));
        }
        for (key, value) in &opts.env {
            args.push("--env".to_string());
            args.push(format!("{key}={value}"));
        }
        args.push(image);
        args.push("sh".to_string());
        args.push("-lc".to_string());
        args.push("while true; do sleep 3600; done".to_string());

        let output = run_docker(&self.cfg.docker_bin, args, opts.max_lifetime).await?;
        if output.return_code != 0 {
            return Err(SandboxError::StartFailed(format!(
                "docker run failed: stdout={} stderr={}",
                truncate(&output.stdout, 2048),
                truncate(&output.stderr, 2048)
            )));
        }
        let container_id = output.stdout.trim().to_string();
        let id = SandboxId::new(if container_id.is_empty() {
            name.clone()
        } else {
            container_id
        });
        let mut state = self.state.lock();
        state.id = Some(id.clone());
        state.name = Some(name);
        Ok(id)
    }

    async fn stop(&mut self, delete: bool) -> SandboxResult<()> {
        let name = {
            let mut state = self.state.lock();
            state.id.take();
            state.name.take()
        };
        let Some(name) = name else {
            return Ok(());
        };
        if !delete {
            return Ok(());
        }
        let output = run_docker(
            &self.cfg.docker_bin,
            vec!["rm".to_string(), "-f".to_string(), name],
            Duration::from_secs(30),
        )
        .await?;
        if output.return_code != 0 {
            return Err(SandboxError::Transient(format!(
                "docker rm failed: stdout={} stderr={}",
                truncate(&output.stdout, 1024),
                truncate(&output.stderr, 1024)
            )));
        }
        Ok(())
    }

    async fn exec(&self, req: ExecRequest) -> SandboxResult<ExecResult> {
        let name = self.require_name()?;
        let mut args = vec!["exec".to_string()];
        if let Some(user) = &req.user {
            args.push("--user".to_string());
            args.push(user.clone());
        }
        if let Some(cwd) = &req.cwd {
            args.push("--workdir".to_string());
            args.push(cwd.clone());
        }
        for (key, value) in &req.env {
            args.push("--env".to_string());
            args.push(format!("{key}={value}"));
        }
        args.push(name);
        args.push("sh".to_string());
        args.push("-lc".to_string());
        args.push(req.command);
        run_docker(
            &self.cfg.docker_bin,
            args,
            req.timeout.unwrap_or_else(|| Duration::from_secs(300)),
        )
        .await
    }

    async fn upload_file(&self, src: &Path, dst: &str) -> SandboxResult<()> {
        let name = self.require_name()?;
        if let Some(parent) = Path::new(dst).parent() {
            let mkdir = self
                .exec(ExecRequest::new(format!(
                    "mkdir -p {}",
                    shell_escape(&parent.to_string_lossy())
                )))
                .await?;
            if mkdir.return_code != 0 {
                return Err(SandboxError::FileTransfer(format!(
                    "docker upload_file mkdir failed: {}",
                    mkdir.stderr
                )));
            }
        }
        let output = run_docker(
            &self.cfg.docker_bin,
            vec![
                "cp".to_string(),
                src.to_string_lossy().to_string(),
                format!("{name}:{dst}"),
            ],
            Duration::from_secs(120),
        )
        .await?;
        if output.return_code != 0 {
            return Err(SandboxError::FileTransfer(format!(
                "docker cp upload_file failed: stdout={} stderr={}",
                truncate(&output.stdout, 1024),
                truncate(&output.stderr, 1024)
            )));
        }
        Ok(())
    }

    async fn upload_dir(&self, src: &Path, dst: &str) -> SandboxResult<()> {
        if !src.is_dir() {
            return Err(SandboxError::FileTransfer(format!(
                "DockerSandbox::upload_dir: not a directory: {}",
                src.display()
            )));
        }
        let name = self.require_name()?;
        let mkdir = self
            .exec(ExecRequest::new(format!("mkdir -p {}", shell_escape(dst))))
            .await?;
        if mkdir.return_code != 0 {
            return Err(SandboxError::FileTransfer(format!(
                "docker upload_dir mkdir failed: {}",
                mkdir.stderr
            )));
        }
        let output = run_docker(
            &self.cfg.docker_bin,
            vec![
                "cp".to_string(),
                format!("{}/.", src.to_string_lossy()),
                format!("{name}:{}", dst.trim_end_matches('/')),
            ],
            Duration::from_secs(300),
        )
        .await?;
        if output.return_code != 0 {
            return Err(SandboxError::FileTransfer(format!(
                "docker cp upload_dir failed: stdout={} stderr={}",
                truncate(&output.stdout, 1024),
                truncate(&output.stderr, 1024)
            )));
        }
        Ok(())
    }

    async fn download_file(&self, src: &str, dst: &Path) -> SandboxResult<()> {
        let name = self.require_name()?;
        if let Some(parent) = dst.parent() {
            tokio::fs::create_dir_all(parent).await.map_err(|e| {
                SandboxError::FileTransfer(format!(
                    "DockerSandbox::download_file create_dir_all: {e}"
                ))
            })?;
        }
        let output = run_docker(
            &self.cfg.docker_bin,
            vec![
                "cp".to_string(),
                format!("{name}:{src}"),
                dst.to_string_lossy().to_string(),
            ],
            Duration::from_secs(120),
        )
        .await?;
        if output.return_code != 0 {
            return Err(SandboxError::FileTransfer(format!(
                "docker cp download_file failed: stdout={} stderr={}",
                truncate(&output.stdout, 1024),
                truncate(&output.stderr, 1024)
            )));
        }
        Ok(())
    }

    async fn download_dir(&self, src: &str, dst: &Path) -> SandboxResult<()> {
        let name = self.require_name()?;
        tokio::fs::create_dir_all(dst).await.map_err(|e| {
            SandboxError::FileTransfer(format!("DockerSandbox::download_dir create_dir_all: {e}"))
        })?;
        let output = run_docker(
            &self.cfg.docker_bin,
            vec![
                "cp".to_string(),
                format!("{name}:{}/.", src.trim_end_matches('/')),
                dst.to_string_lossy().to_string(),
            ],
            Duration::from_secs(300),
        )
        .await?;
        if output.return_code != 0 {
            return Err(SandboxError::FileTransfer(format!(
                "docker cp download_dir failed: stdout={} stderr={}",
                truncate(&output.stdout, 1024),
                truncate(&output.stderr, 1024)
            )));
        }
        Ok(())
    }
}

fn image_for_start(image: &ImageSource) -> SandboxResult<String> {
    match image {
        ImageSource::PrebuiltImage(image) => Ok(image.clone()),
        ImageSource::Snapshot(snapshot) => Err(SandboxError::Unsupported(format!(
            "DockerSandbox cannot start provider snapshot image '{snapshot}'; use a prebuilt Docker image"
        ))),
        ImageSource::Dockerfile { .. } => Err(SandboxError::Unsupported(
            "DockerSandbox does not build Dockerfile images yet; build the image first".to_string(),
        )),
        ImageSource::None => Ok("alpine:3.19".to_string()),
    }
}

async fn run_docker(
    docker_bin: &str,
    args: Vec<String>,
    budget: Duration,
) -> SandboxResult<ExecResult> {
    let mut command = Command::new(docker_bin);
    command
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    let child = command.spawn().map_err(|e| {
        SandboxError::ExecFailed(format!(
            "failed to spawn docker command '{docker_bin}': {e}"
        ))
    })?;
    let output = timeout(budget, child.wait_with_output())
        .await
        .map_err(|_| {
            SandboxError::ExecFailed(format!("docker command timed out after {budget:?}"))
        })?
        .map_err(|e| SandboxError::ExecFailed(format!("docker command failed: {e}")))?;
    Ok(ExecResult {
        return_code: output.status.code().unwrap_or(1),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

fn docker_name(session_id: &str) -> String {
    let mut out = String::from("chronicle-");
    for ch in session_id.chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch.to_ascii_lowercase());
        } else {
            out.push('-');
        }
    }
    while out.contains("--") {
        out = out.replace("--", "-");
    }
    out = out.trim_matches('-').to_string();
    out.truncate(48);
    format!(
        "{}-{}",
        out,
        ulid::Ulid::new().to_string().to_ascii_lowercase()
    )
}

fn shell_escape(s: &str) -> String {
    if s.is_empty() {
        return "''".to_string();
    }
    if s.chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '-' | '/' | '.' | ':' | '='))
    {
        return s.to_string();
    }
    let escaped = s.replace('\'', "'\\''");
    format!("'{escaped}'")
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

    #[test]
    fn docker_name_is_container_safe() {
        let name = docker_name("job_1__trial/with spaces");
        assert!(name.starts_with("chronicle-job-1-trial-with-spaces-"));
        assert!(name
            .chars()
            .all(|ch| ch.is_ascii_lowercase() || ch.is_ascii_digit() || ch == '-'));
    }

    #[test]
    fn prebuilt_image_is_used_directly() {
        assert_eq!(
            image_for_start(&ImageSource::PrebuiltImage(
                "chronicle/test:dev".to_string()
            ))
            .unwrap(),
            "chronicle/test:dev"
        );
    }
}
