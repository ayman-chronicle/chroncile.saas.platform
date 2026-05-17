//! `chronicle environments ...` — author and inspect world simulator
//! environments.

use crate::client::ChronicleClient;
use crate::error::{CliError, Result};
use crate::output::Format;
use chronicle_domain::{
    EnvironmentRecord, EnvironmentSpec, EnvironmentVersionRecord, EnvironmentVersionStatus,
};
use chronicle_world_compiler::{WorldCompileInput, WorldCompiler};
use chrono::Utc;
use clap::Subcommand;
use colored::Colorize;
use comfy_table::{presets::UTF8_FULL_CONDENSED, Cell, ContentArrangement, Table};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Subcommand)]
pub enum EnvironmentsCmd {
    /// Write a starter environment.toml.
    Init {
        /// Output path for the environment file.
        #[arg(default_value = "environment.toml")]
        path: PathBuf,
        /// Overwrite an existing file.
        #[arg(long, default_value_t = false)]
        force: bool,
    },
    /// Publish an environment version from environment.toml.
    Publish {
        /// Path to the environment TOML file.
        #[arg(default_value = "environment.toml")]
        path: PathBuf,
    },
    /// List authored environments and their versions.
    Ls,
    /// Show one environment, or one version if `--version` is passed.
    Show {
        /// Environment id.
        environment_id: String,
        /// Version id or semantic version string, e.g. `v1`.
        #[arg(long)]
        version: Option<String>,
    },
    /// Compile a published environment version, or a local environment.toml dry-run.
    Compile {
        /// Environment id/slug for backend compile, or local environment TOML path.
        #[arg(default_value = "environment.toml")]
        target: String,
        /// Published environment version id or semantic version for backend compile.
        #[arg(long)]
        version: Option<String>,
        /// Dataset snapshot id to bake into the bundle manifest.
        #[arg(long, alias = "dataset-snapshot", default_value = "snapshot_local")]
        dataset: String,
        /// Scenario id to bake into the bundle manifest.
        #[arg(long, default_value = "scenario_local")]
        scenario: String,
        /// Tenant id to bake into the local bundle manifest.
        #[arg(long, default_value = "local_tenant")]
        tenant: String,
        /// Stable local environment version id. Defaults to one derived from slug + version.
        #[arg(long)]
        version_id: Option<String>,
        /// Directory where compiled world bundles are written.
        #[arg(long, default_value = ".chronicle/world-bundles")]
        out_dir: PathBuf,
    },
}

const TEMPLATE: &str = include_str!("../../templates/environment.starter.toml");
const PATH: &str = "/api/platform/environments";

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct EnvironmentFile {
    slug: String,
    label: String,
    #[serde(default)]
    description: Option<String>,
    #[serde(default = "default_version")]
    version: String,
    #[serde(default = "default_status")]
    status: EnvironmentVersionStatus,
    #[serde(default)]
    spec: EnvironmentSpec,
}

fn default_version() -> String {
    "v1".to_string()
}

fn default_status() -> EnvironmentVersionStatus {
    EnvironmentVersionStatus::Published
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct CreateEnvironmentRequest {
    slug: String,
    label: String,
    description: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct EnvironmentResponse {
    environment: EnvironmentRecord,
    #[serde(default)]
    versions: Vec<EnvironmentVersionRecord>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct CreateEnvironmentVersionRequest {
    version: String,
    spec: EnvironmentSpec,
    status: EnvironmentVersionStatus,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct EnvironmentVersionResponse {
    environment: EnvironmentRecord,
    version: EnvironmentVersionRecord,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct EnvironmentWithVersions {
    environment: EnvironmentRecord,
    versions: Vec<EnvironmentVersionRecord>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ListEnvironmentsResponse {
    environments: Vec<EnvironmentWithVersions>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct CompileEnvironmentResponse {
    environment_id: String,
    environment_slug: String,
    version_id: String,
    version: String,
    tenant_id: String,
    dataset_snapshot_id: String,
    scenario_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    bundle_id: Option<String>,
    sha256: String,
    uri: String,
    #[serde(default)]
    package_uri: String,
    root_dir: String,
    size_bytes: u64,
    #[serde(default)]
    warnings: Vec<String>,
    #[serde(default)]
    files: Vec<String>,
    manifest: serde_json::Value,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct CompileEnvironmentRequest {
    dataset_snapshot_id: String,
    scenario_id: String,
}

pub async fn run(
    client: Option<&ChronicleClient>,
    cmd: EnvironmentsCmd,
    format: Format,
) -> Result<()> {
    match cmd {
        EnvironmentsCmd::Init { path, force } => init(path, force),
        EnvironmentsCmd::Publish { path } => {
            let client =
                client.ok_or_else(|| CliError::config("publish requires a backend client"))?;
            publish(client, path, format).await
        }
        EnvironmentsCmd::Ls => {
            let client = client.ok_or_else(|| CliError::config("ls requires a backend client"))?;
            ls(client, format).await
        }
        EnvironmentsCmd::Show {
            environment_id,
            version,
        } => {
            let client =
                client.ok_or_else(|| CliError::config("show requires a backend client"))?;
            show(client, &environment_id, version.as_deref(), format).await
        }
        EnvironmentsCmd::Compile {
            target,
            version,
            dataset,
            scenario,
            tenant,
            version_id,
            out_dir,
        } => {
            compile(
                client,
                &target,
                version.as_deref(),
                &dataset,
                &scenario,
                &tenant,
                version_id.as_deref(),
                out_dir,
                format,
            )
            .await
        }
    }
}

fn init(path: PathBuf, force: bool) -> Result<()> {
    let path = absolutize(&path)?;
    if path.exists() && !force {
        return Err(CliError::config(format!(
            "{} already exists; pass --force to overwrite",
            path.display()
        )));
    }
    std::fs::write(&path, TEMPLATE)?;
    println!(
        "{} wrote starter environment to {}",
        "✓".green().bold(),
        path.display()
    );
    println!();
    println!("  next:");
    println!("    chronicle environments publish {}", path.display());
    Ok(())
}

async fn publish(client: &ChronicleClient, path: PathBuf, format: Format) -> Result<()> {
    let path = absolutize(&path)?;
    let body =
        std::fs::read_to_string(&path).map_err(|_| CliError::RecipeNotFound(path.clone()))?;
    let file: EnvironmentFile = toml::from_str(&body).map_err(|e| CliError::RecipeParse {
        path: path.clone(),
        message: e.to_string(),
    })?;

    let existing: ListEnvironmentsResponse = client.get_json(PATH).await?;
    let existing_row = existing
        .environments
        .iter()
        .find(|row| row.environment.slug == file.slug);
    let environment = match existing_row {
        Some(row) => row.environment.clone(),
        None => {
            let created: EnvironmentResponse = client
                .post_json(
                    PATH,
                    &CreateEnvironmentRequest {
                        slug: file.slug.clone(),
                        label: file.label.clone(),
                        description: file.description.clone(),
                    },
                )
                .await?;
            created.environment
        }
    };

    if let Some(version) = existing_row.and_then(|row| {
        row.versions
            .iter()
            .find(|version| version.version == file.version)
    }) {
        return render(
            &EnvironmentVersionResponse {
                environment,
                version: version.clone(),
            },
            format,
            render_version_detail,
        );
    }

    let version: EnvironmentVersionResponse = client
        .post_json(
            &format!("{PATH}/{}/versions", environment.id),
            &CreateEnvironmentVersionRequest {
                version: file.version,
                spec: file.spec,
                status: file.status,
            },
        )
        .await?;

    render(&version, format, render_version_detail)
}

async fn ls(client: &ChronicleClient, format: Format) -> Result<()> {
    let resp: ListEnvironmentsResponse = client.get_json(PATH).await?;
    render(&resp, format, render_environments_table)
}

async fn show(
    client: &ChronicleClient,
    environment_id: &str,
    version: Option<&str>,
    format: Format,
) -> Result<()> {
    if let Some(version) = version {
        let resp: EnvironmentVersionResponse = client
            .get_json(&format!("{PATH}/{environment_id}/versions/{version}"))
            .await?;
        render(&resp, format, render_version_detail)
    } else {
        let resp: EnvironmentResponse =
            client.get_json(&format!("{PATH}/{environment_id}")).await?;
        render(&resp, format, render_environment_detail)
    }
}

async fn compile(
    client: Option<&ChronicleClient>,
    target: &str,
    backend_version: Option<&str>,
    dataset_snapshot_id: &str,
    scenario_id: &str,
    tenant_id: &str,
    version_id: Option<&str>,
    out_dir: PathBuf,
    format: Format,
) -> Result<()> {
    if let Some(version) = backend_version {
        let client =
            client.ok_or_else(|| CliError::config("backend compile requires a backend client"))?;
        return compile_backend(
            client,
            target,
            version,
            dataset_snapshot_id,
            scenario_id,
            format,
        )
        .await;
    }

    compile_local(
        PathBuf::from(target),
        dataset_snapshot_id,
        scenario_id,
        tenant_id,
        version_id,
        out_dir,
        format,
    )
}

async fn compile_backend(
    client: &ChronicleClient,
    environment_id: &str,
    version: &str,
    dataset_snapshot_id: &str,
    scenario_id: &str,
    format: Format,
) -> Result<()> {
    let response: CompileEnvironmentResponse = client
        .post_json(
            &format!("{PATH}/{environment_id}/versions/{version}/compile"),
            &CompileEnvironmentRequest {
                dataset_snapshot_id: dataset_snapshot_id.to_string(),
                scenario_id: scenario_id.to_string(),
            },
        )
        .await?;
    render(&response, format, render_compile_detail)
}

fn compile_local(
    path: PathBuf,
    dataset_snapshot_id: &str,
    scenario_id: &str,
    tenant_id: &str,
    version_id: Option<&str>,
    out_dir: PathBuf,
    format: Format,
) -> Result<()> {
    let path = absolutize(&path)?;
    let body =
        std::fs::read_to_string(&path).map_err(|_| CliError::RecipeNotFound(path.clone()))?;
    let file: EnvironmentFile = toml::from_str(&body).map_err(|e| CliError::RecipeParse {
        path: path.clone(),
        message: e.to_string(),
    })?;

    let environment_id = format!("env_local_{}", slug_key(&file.slug));
    let version_id = version_id.map(str::to_string).unwrap_or_else(|| {
        format!(
            "envver_{}_{}",
            slug_key(&file.slug),
            slug_key(&file.version)
        )
    });
    let env_version = EnvironmentVersionRecord {
        id: version_id.clone(),
        environment_id: environment_id.clone(),
        tenant_id: tenant_id.to_string(),
        version: file.version.clone(),
        spec: file.spec,
        status: file.status,
        created_at: Utc::now(),
    };
    let out_dir = absolutize(&out_dir)?;
    let compiler = WorldCompiler::new(&out_dir);
    let compiled = compiler
        .compile(WorldCompileInput {
            tenant_id,
            env_version: &env_version,
            dataset_snapshot_id,
            scenario_id,
            dataset_snapshot: None,
            environment_base_dir: path.parent(),
        })
        .map_err(|e| CliError::Internal(format!("world compile: {e}")))?;
    let files = collect_files(&compiled.root_dir)?;
    let response = CompileEnvironmentResponse {
        environment_id,
        environment_slug: file.slug,
        version_id,
        version: env_version.version,
        tenant_id: tenant_id.to_string(),
        dataset_snapshot_id: dataset_snapshot_id.to_string(),
        scenario_id: scenario_id.to_string(),
        bundle_id: None,
        sha256: compiled.bundle_ref.sha256.0,
        uri: compiled.bundle_ref.uri.clone(),
        package_uri: compiled.bundle_ref.uri,
        root_dir: compiled.root_dir.display().to_string(),
        size_bytes: compiled.size_bytes,
        warnings: compiled.warnings,
        files,
        manifest: compiled.manifest,
    };
    render(&response, format, render_compile_detail)
}

fn render<T: serde::Serialize>(
    value: &T,
    format: Format,
    table: impl FnOnce(&T) -> String,
) -> Result<()> {
    match format {
        Format::Json => println!("{}", serde_json::to_string_pretty(value)?),
        Format::Table => println!("{}", table(value)),
    }
    Ok(())
}

fn render_environments_table(resp: &ListEnvironmentsResponse) -> String {
    if resp.environments.is_empty() {
        return "no environments published".dimmed().to_string();
    }
    let mut t = build_table();
    t.set_header(vec![
        Cell::new("ID"),
        Cell::new("SLUG"),
        Cell::new("LABEL"),
        Cell::new("VERSIONS"),
        Cell::new("LATEST"),
    ]);
    for row in &resp.environments {
        let latest = row.versions.first();
        t.add_row(vec![
            Cell::new(&row.environment.id),
            Cell::new(&row.environment.slug),
            Cell::new(&row.environment.label),
            Cell::new(row.versions.len().to_string()),
            Cell::new(
                latest
                    .map(|v| format!("{} ({:?})", v.version, v.status).to_lowercase())
                    .unwrap_or_else(|| "—".to_string()),
            ),
        ]);
    }
    t.to_string()
}

fn render_environment_detail(resp: &EnvironmentResponse) -> String {
    let mut out = String::new();
    out.push_str(&format!("{}\n", "Environment".bold()));
    out.push_str(&format!("  id          : {}\n", resp.environment.id));
    out.push_str(&format!("  slug        : {}\n", resp.environment.slug));
    out.push_str(&format!("  label       : {}\n", resp.environment.label));
    if let Some(description) = &resp.environment.description {
        out.push_str(&format!("  description : {description}\n"));
    }
    out.push('\n');
    out.push_str(&render_versions_table(&resp.versions));
    out
}

fn render_version_detail(resp: &EnvironmentVersionResponse) -> String {
    let mut out = String::new();
    out.push_str(&format!("{}\n", "Environment Version".bold()));
    out.push_str(&format!("  environment : {}\n", resp.environment.id));
    out.push_str(&format!("  slug        : {}\n", resp.environment.slug));
    out.push_str(&format!("  version id  : {}\n", resp.version.id));
    out.push_str(&format!("  version     : {}\n", resp.version.version));
    out.push_str(&format!(
        "  status      : {}\n",
        format!("{:?}", resp.version.status).to_lowercase()
    ));
    out.push_str(&format!(
        "  services    : {}\n",
        resp.version.spec.services.len()
    ));
    out.push_str(&format!(
        "  datastores  : {}\n",
        resp.version.spec.datastores.len()
    ));
    out.push_str(&format!(
        "  mcp         : {}\n",
        resp.version.spec.mcp.len()
    ));
    out.push_str(&format!(
        "\n  recipe block:\n    [recipe.environment]\n    id = \"{}\"\n    label = \"{}\"\n    versionId = \"{}\"\n",
        resp.environment.id, resp.environment.label, resp.version.id
    ));
    out
}

fn render_compile_detail(resp: &CompileEnvironmentResponse) -> String {
    let mut out = String::new();
    out.push_str(&format!(
        "{} {}\n",
        "✓".green().bold(),
        "World bundle compiled".bold()
    ));
    out.push_str(&format!("  sha256      : {}\n", resp.sha256));
    if let Some(bundle_id) = &resp.bundle_id {
        out.push_str(&format!("  bundle id   : {bundle_id}\n"));
    }
    out.push_str(&format!("  root        : {}\n", resp.root_dir));
    out.push_str(&format!("  package     : {}\n", package_uri(resp)));
    out.push_str(&format!("  size        : {} bytes\n", resp.size_bytes));
    out.push_str(&format!("  environment : {}\n", resp.environment_id));
    out.push_str(&format!("  version id  : {}\n", resp.version_id));
    out.push_str(&format!("  dataset     : {}\n", resp.dataset_snapshot_id));
    out.push_str(&format!("  scenario    : {}\n", resp.scenario_id));
    if !resp.warnings.is_empty() {
        out.push_str("\nWarnings\n");
        for warning in &resp.warnings {
            out.push_str(&format!("  {warning}\n"));
        }
    }
    if !resp.files.is_empty() {
        out.push_str("\nFiles\n");
        for file in &resp.files {
            out.push_str(&format!("  {file}\n"));
        }
    }
    out
}

fn package_uri(resp: &CompileEnvironmentResponse) -> &str {
    if resp.package_uri.is_empty() {
        &resp.uri
    } else {
        &resp.package_uri
    }
}

fn render_versions_table(versions: &[EnvironmentVersionRecord]) -> String {
    if versions.is_empty() {
        return "Versions\n  no versions yet\n".to_string();
    }
    let mut t = build_table();
    t.set_header(vec![
        Cell::new("ID"),
        Cell::new("VERSION"),
        Cell::new("STATUS"),
        Cell::new("CREATED"),
    ]);
    for version in versions {
        t.add_row(vec![
            Cell::new(&version.id),
            Cell::new(&version.version),
            Cell::new(format!("{:?}", version.status).to_lowercase()),
            Cell::new(version.created_at.format("%Y-%m-%d %H:%M").to_string()),
        ]);
    }
    format!("Versions\n{t}\n")
}

fn build_table() -> Table {
    let mut t = Table::new();
    t.load_preset(UTF8_FULL_CONDENSED);
    t.set_content_arrangement(ContentArrangement::Dynamic);
    t
}

fn absolutize(p: &Path) -> Result<PathBuf> {
    if p.is_absolute() {
        return Ok(p.to_path_buf());
    }
    let cwd = std::env::current_dir()
        .map_err(|e| CliError::config(format!("could not read current dir: {e}")))?;
    Ok(cwd.join(p))
}

fn slug_key(value: &str) -> String {
    let mut out = String::new();
    let mut last_was_sep = false;
    for ch in value.chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch.to_ascii_lowercase());
            last_was_sep = false;
        } else if !last_was_sep {
            out.push('_');
            last_was_sep = true;
        }
    }
    let trimmed = out.trim_matches('_').to_string();
    if trimmed.is_empty() {
        "local".to_string()
    } else {
        trimmed
    }
}

fn collect_files(root: &Path) -> Result<Vec<String>> {
    let mut files = Vec::new();
    collect_files_inner(root, root, &mut files)?;
    files.sort();
    Ok(files)
}

fn collect_files_inner(root: &Path, dir: &Path, out: &mut Vec<String>) -> Result<()> {
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            collect_files_inner(root, &path, out)?;
        } else {
            let rel = path
                .strip_prefix(root)
                .unwrap_or(&path)
                .to_string_lossy()
                .replace('\\', "/");
            out.push(rel);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn environment_template_parses() {
        let parsed: EnvironmentFile = toml::from_str(TEMPLATE).unwrap();
        assert_eq!(parsed.slug, "daytona-dev");
        assert_eq!(parsed.version, "v1");
        assert_eq!(parsed.status, EnvironmentVersionStatus::Published);
        assert_eq!(parsed.spec.interception.regular_proxy_port, 8888);
    }

    #[test]
    fn slug_key_is_stable_for_local_compile_ids() {
        assert_eq!(slug_key("Daytona Dev/v1"), "daytona_dev_v1");
        assert_eq!(slug_key("***"), "local");
    }

    #[test]
    fn local_compile_derives_expected_delta_from_snapshot_fixtures() {
        let root =
            std::env::temp_dir().join(format!("chronicle-cli-env-compile-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(root.join("snapshots")).unwrap();
        std::fs::write(
            root.join("snapshots/appdb.initial.json"),
            serde_json::to_vec_pretty(&serde_json::json!({
                "name": "appdb",
                "tables": [{
                    "schema": "public",
                    "name": "items",
                    "rows": [{ "id": 1, "name": "seed" }]
                }]
            }))
            .unwrap(),
        )
        .unwrap();
        std::fs::write(
            root.join("snapshots/appdb.expected.json"),
            serde_json::to_vec_pretty(&serde_json::json!({
                "name": "appdb",
                "tables": [{
                    "schema": "public",
                    "name": "items",
                    "rows": [
                        { "id": 1, "name": "seed" },
                        { "id": 2, "name": "agent" }
                    ]
                }]
            }))
            .unwrap(),
        )
        .unwrap();
        let env_path = root.join("environment.toml");
        std::fs::write(
            &env_path,
            r#"
slug = "cli-delta-smoke"
label = "CLI Delta Smoke"
version = "v1"
status = "published"

[spec.interception]
regularProxyPort = 8888
transparentProxyPort = 8889
installCa = true

[[spec.datastores]]
name = "appdb"
kind = "postgres"
stateDiffSpec = { initialStateUri = "./snapshots/appdb.initial.json", expectedFinalStateUri = "./snapshots/appdb.expected.json" }
"#,
        )
        .unwrap();

        compile_local(
            env_path,
            "snapshot_cli",
            "scenario_cli",
            "tenant_cli",
            None,
            root.join("out"),
            Format::Json,
        )
        .unwrap();

        let state_diff_path =
            find_state_diff_spec(&root.join("out")).expect("compiled state_diff_spec.json");
        let state_diff: serde_json::Value =
            serde_json::from_slice(&std::fs::read(state_diff_path).unwrap()).unwrap();
        assert_eq!(
            state_diff["datastores"][0]["expectedDelta"]["insertedRows"],
            1
        );
        assert_eq!(
            state_diff["datastores"][0]["expectedDelta"]["tables"][0]["insertedRows"][0]["name"],
            "agent"
        );
        let _ = std::fs::remove_dir_all(&root);
    }

    fn find_state_diff_spec(root: &Path) -> Option<PathBuf> {
        for entry in std::fs::read_dir(root).ok()? {
            let path = entry.ok()?.path();
            if path.is_dir() {
                if let Some(found) = find_state_diff_spec(&path) {
                    return Some(found);
                }
            } else if path
                .to_string_lossy()
                .ends_with("grading/state_diff_spec.json")
            {
                return Some(path);
            }
        }
        None
    }
}
