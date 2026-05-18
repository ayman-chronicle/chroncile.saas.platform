use anyhow::{bail, Context, Result};
use chronicle_world_runtime::{
    datastore_urls_from_state_dir, default_socket_for_bundle, pid_file_for_bundle, send_rpc,
    write_env, write_postgres_snapshot, WorldRpcRequest, WorldRpcResponse, WorldStatus,
    DATASTORE_RUNTIME_DIR, POSTGRES_METADATA_FILE, WORLD_SOCKET,
};
use serde_json::json;
use std::fs;
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

const MITMPROXY_REGULAR_PID: &str = "mitmproxy-regular.pid";
const MITMPROXY_TRANSPARENT_PID: &str = "mitmproxy-transparent.pid";
const MITMPROXY_ADDON: &str = "/opt/chronicle/chronicle_addon.py";
const REGULAR_PROXY_PORT: u16 = 8888;
const TRANSPARENT_PROXY_PORT: u16 = 8889;

fn main() -> Result<()> {
    let mut args: Vec<String> = std::env::args().skip(1).collect();
    let Some(command) = shift(&mut args) else {
        bail!("usage: worldctl <start|status|export|state-hash|stop>");
    };

    match command.as_str() {
        "start" => start(args),
        "status" => status(args),
        "export" => export(args),
        "state-hash" => state_hash(args),
        "stop" => stop(args),
        "--help" | "-h" => {
            println!("usage: worldctl <start|status|export|state-hash|stop>");
            Ok(())
        }
        other => bail!("unknown worldctl command: {other}"),
    }
}

fn start(mut args: Vec<String>) -> Result<()> {
    let bundle = take_value(&mut args, "--bundle")
        .map(PathBuf::from)
        .context("--bundle is required")?;
    let socket = take_value(&mut args, "--socket")
        .map(PathBuf::from)
        .unwrap_or_else(|| default_socket_for_bundle(&bundle));
    let state_dir = take_value(&mut args, "--state-dir")
        .map(PathBuf::from)
        .unwrap_or_else(|| bundle.join("runtime"));
    reject_unknown(args)?;

    fs::create_dir_all(&bundle)?;
    fs::create_dir_all(&state_dir)?;
    start_datastores(&bundle, &state_dir)?;

    if let Ok(existing) = query_status(&socket) {
        configure_interception(&bundle, &socket, &state_dir)?;
        let pid = existing.pid;
        let status = status_with_datastores(existing, &state_dir)?;
        write_env(&bundle, &status)?;
        println!("world already running pid {pid}");
        return Ok(());
    }

    let stdout = fs::File::create(state_dir.join("worldd.stdout.log"))?;
    let stderr = fs::File::create(state_dir.join("worldd.stderr.log"))?;
    let mut child = Command::new(resolve_worldd_binary())
        .arg("--bundle")
        .arg(&bundle)
        .arg("--socket")
        .arg(&socket)
        .arg("--state-dir")
        .arg(&state_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::from(stdout))
        .stderr(Stdio::from(stderr))
        .spawn()
        .context("spawn worldd")?;

    fs::write(pid_file_for_bundle(&bundle), child.id().to_string())?;
    let status = match wait_for_status(&socket, Duration::from_secs(5)) {
        Ok(status) => status,
        Err(err) => {
            let _ = child.kill();
            return Err(err);
        }
    };
    configure_interception(&bundle, &socket, &state_dir)?;
    let status = query_status(&socket).unwrap_or(status);
    let status = status_with_datastores(status, &state_dir)?;
    write_env(&bundle, &status)?;
    println!("world started pid {}", status.pid);
    Ok(())
}

fn status(mut args: Vec<String>) -> Result<()> {
    let json = take_bool(&mut args, "--json");
    let socket = socket_from_args(&mut args)?;
    reject_unknown(args)?;
    let status = query_status(&socket)?;
    if json {
        println!("{}", serde_json::to_string(&status)?);
    } else {
        println!("ready {}", status.ready);
        println!("pid {}", status.pid);
        println!("socket {}", status.socket);
        println!("bundle_sha {}", status.bundle_sha);
        println!("state_hash {}", status.state_hash);
        println!("interactions {}", status.interactions);
    }
    Ok(())
}

fn export(mut args: Vec<String>) -> Result<()> {
    let out = take_value(&mut args, "--out")
        .map(PathBuf::from)
        .context("--out is required")?;
    let socket = socket_from_args(&mut args)?;
    reject_unknown(args)?;
    match send_rpc(&socket, &WorldRpcRequest::Export { out_dir: out })? {
        WorldRpcResponse::Export { out_dir, files, .. } => {
            println!("world exported {}", out_dir.to_string_lossy());
            for file in files {
                println!("{file}");
            }
            Ok(())
        }
        other => bail!("unexpected worldd export response: {other:?}"),
    }
}

fn state_hash(mut args: Vec<String>) -> Result<()> {
    let socket = socket_from_args(&mut args)?;
    reject_unknown(args)?;
    match send_rpc(&socket, &WorldRpcRequest::StateHash)? {
        WorldRpcResponse::StateHash { state_hash } => {
            println!("{state_hash}");
            Ok(())
        }
        other => bail!("unexpected worldd state-hash response: {other:?}"),
    }
}

fn stop(mut args: Vec<String>) -> Result<()> {
    let bundle = take_value(&mut args, "--bundle").map(PathBuf::from);
    let pid_file = bundle.as_deref().map(pid_file_for_bundle);
    let socket = bundle
        .as_deref()
        .map(default_socket_for_bundle)
        .unwrap_or_else(|| PathBuf::from(WORLD_SOCKET));
    reject_unknown(args)?;

    let pid = pid_file
        .as_ref()
        .and_then(|path| fs::read_to_string(path).ok())
        .and_then(|raw| raw.trim().parse::<u32>().ok())
        .or_else(|| query_status(&socket).ok().map(|status| status.pid));
    let Some(pid) = pid else {
        println!("world not running");
        return Ok(());
    };

    if let Some(bundle) = &bundle {
        let state_dir = bundle.join("runtime");
        let _ = stop_datastores(&state_dir);
        let _ = kill_pid_file(&state_dir.join(MITMPROXY_REGULAR_PID));
        let _ = kill_pid_file(&state_dir.join(MITMPROXY_TRANSPARENT_PID));
    }

    terminate_process(pid).context("kill worldd")?;
    if let Some(pid_file) = pid_file {
        let _ = fs::remove_file(pid_file);
    }
    let _ = fs::remove_file(socket);
    println!("world stopped pid {pid}");
    Ok(())
}

fn configure_interception(bundle: &Path, socket: &Path, state_dir: &Path) -> Result<()> {
    let mode = intercept_mode();
    if mode == InterceptMode::Disabled {
        return Ok(());
    }
    run_intercept_step(mode, "install mitm CA trust", || install_ca_trust(bundle))?;
    run_intercept_step(mode, "start mitmproxy listeners", || {
        start_mitmproxy_listeners(bundle, socket, state_dir)
    })?;
    run_intercept_step(mode, "apply egress firewall rules", apply_egress_rules)?;
    Ok(())
}

#[derive(Debug, Clone)]
struct DatastoreSeed {
    name: String,
    seed_path: PathBuf,
}

fn start_datastores(bundle: &Path, state_dir: &Path) -> Result<()> {
    let datastores = discover_datastore_seeds(bundle)?;
    if datastores.is_empty() {
        return Ok(());
    }

    let runtime_root = state_dir.join(DATASTORE_RUNTIME_DIR);
    fs::create_dir_all(&runtime_root).context("create datastore runtime dir")?;
    for datastore in datastores {
        start_postgres_datastore(&datastore, &runtime_root)
            .with_context(|| format!("start Postgres datastore {}", datastore.name))?;
    }
    Ok(())
}

fn stop_datastores(state_dir: &Path) -> Result<()> {
    let runtime_root = state_dir.join(DATASTORE_RUNTIME_DIR);
    if !runtime_root.is_dir() {
        return Ok(());
    }
    let pg_ctl = resolve_postgres_binary("pg_ctl");
    for entry in fs::read_dir(runtime_root).context("read datastore runtime dir")? {
        let entry = entry?;
        let data_dir = entry.path().join("pgdata");
        if !data_dir.join("PG_VERSION").is_file() {
            continue;
        }
        let _ = run_postgres_command(
            "stop postgres",
            &pg_ctl,
            vec![
                "-D".to_string(),
                data_dir.to_string_lossy().to_string(),
                "-m".to_string(),
                "fast".to_string(),
                "-w".to_string(),
                "stop".to_string(),
            ],
        );
    }
    Ok(())
}

fn discover_datastore_seeds(bundle: &Path) -> Result<Vec<DatastoreSeed>> {
    let datastores_dir = bundle.join("datastores");
    let mut datastores = Vec::new();
    if !datastores_dir.is_dir() {
        return Ok(datastores);
    }

    for entry in fs::read_dir(datastores_dir).context("read bundle datastores dir")? {
        let entry = entry?;
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let seed_path = path.join("seed.dump.zst");
        if !seed_path.is_file() {
            continue;
        }
        datastores.push(DatastoreSeed {
            name: entry.file_name().to_string_lossy().to_string(),
            seed_path,
        });
    }
    datastores.sort_by(|left, right| left.name.cmp(&right.name));
    Ok(datastores)
}

fn start_postgres_datastore(datastore: &DatastoreSeed, runtime_root: &Path) -> Result<()> {
    let runtime_dir = runtime_root.join(&datastore.name);
    let data_dir = runtime_dir.join("pgdata");
    let socket_dir = runtime_dir.join("socket");
    let log_path = runtime_dir.join("postgres.log");
    let restored_marker = runtime_dir.join("seed.restored");
    fs::create_dir_all(&data_dir).context("create pgdata dir")?;
    fs::create_dir_all(&socket_dir).context("create postgres socket dir")?;
    ensure_postgres_can_write(&runtime_dir)?;

    let port = read_postgres_metadata(&runtime_dir)
        .and_then(|metadata| metadata.get("port").and_then(serde_json::Value::as_u64))
        .and_then(|port| u16::try_from(port).ok())
        .unwrap_or(find_free_local_port()?);
    let database = postgres_database_name(&datastore.name);
    let user = "chronicle";

    if !data_dir.join("PG_VERSION").is_file() {
        let initdb = resolve_postgres_binary("initdb");
        run_postgres_command(
            "initdb",
            &initdb,
            vec![
                "-D".to_string(),
                data_dir.to_string_lossy().to_string(),
                "-U".to_string(),
                user.to_string(),
                "--auth=trust".to_string(),
                "--no-locale".to_string(),
            ],
        )?;
    }

    if !postgres_is_running(&data_dir)? {
        let pg_ctl = resolve_postgres_binary("pg_ctl");
        let options = format!(
            "-c listen_addresses=127.0.0.1 -p {port} -k {}",
            socket_dir.to_string_lossy()
        );
        run_postgres_command(
            "start postgres",
            &pg_ctl,
            vec![
                "-D".to_string(),
                data_dir.to_string_lossy().to_string(),
                "-l".to_string(),
                log_path.to_string_lossy().to_string(),
                "-o".to_string(),
                options,
                "-w".to_string(),
                "start".to_string(),
            ],
        )?;
    }
    wait_for_postgres(port, user)?;
    ensure_database(port, user, &database)?;

    if !restored_marker.is_file() {
        restore_seed_dump(&datastore.seed_path, &runtime_dir, port, user, &database)?;
        fs::write(&restored_marker, b"ok\n").context("write postgres restore marker")?;
    }

    let url = format!("postgres://{user}@127.0.0.1:{port}/{database}");
    write_postgres_metadata(
        &runtime_dir,
        &datastore.name,
        &url,
        port,
        &database,
        user,
        &data_dir,
    )?;
    let initial_snapshot = runtime_dir.join("initial_state.json");
    if !initial_snapshot.is_file() {
        write_postgres_snapshot(&datastore.name, &url, &initial_snapshot)
            .context("write initial datastore snapshot")?;
    }
    Ok(())
}

fn postgres_is_running(data_dir: &Path) -> Result<bool> {
    let pg_ctl = resolve_postgres_binary("pg_ctl");
    let mut command = postgres_command(&pg_ctl);
    let status = command
        .arg("-D")
        .arg(data_dir)
        .arg("status")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .context("check postgres status")?;
    Ok(status.success())
}

fn wait_for_postgres(port: u16, user: &str) -> Result<()> {
    let pg_isready = resolve_postgres_binary("pg_isready");
    let started = Instant::now();
    while started.elapsed() < Duration::from_secs(15) {
        let status = Command::new(&pg_isready)
            .arg("-h")
            .arg("127.0.0.1")
            .arg("-p")
            .arg(port.to_string())
            .arg("-U")
            .arg(user)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .context("run pg_isready")?;
        if status.success() {
            return Ok(());
        }
        thread::sleep(Duration::from_millis(100));
    }
    bail!("Postgres did not become ready on 127.0.0.1:{port}");
}

fn ensure_database(port: u16, user: &str, database: &str) -> Result<()> {
    if database_exists(port, user, database)? {
        return Ok(());
    }
    let createdb = resolve_postgres_binary("createdb");
    let status = Command::new(&createdb)
        .arg("-h")
        .arg("127.0.0.1")
        .arg("-p")
        .arg(port.to_string())
        .arg("-U")
        .arg(user)
        .arg(database)
        .status()
        .context("run createdb")?;
    if status.success() || database_exists(port, user, database)? {
        return Ok(());
    }
    bail!("createdb failed for datastore database {database}");
}

fn database_exists(port: u16, user: &str, database: &str) -> Result<bool> {
    let psql = resolve_postgres_binary("psql");
    let query = format!(
        "SELECT 1 FROM pg_database WHERE datname = '{}'",
        database.replace('\'', "''")
    );
    let output = Command::new(&psql)
        .arg("-h")
        .arg("127.0.0.1")
        .arg("-p")
        .arg(port.to_string())
        .arg("-U")
        .arg(user)
        .arg("-d")
        .arg("postgres")
        .arg("-tAc")
        .arg(query)
        .output()
        .context("query pg_database")?;
    Ok(output.status.success() && String::from_utf8_lossy(&output.stdout).trim() == "1")
}

fn restore_seed_dump(
    seed_path: &Path,
    runtime_dir: &Path,
    port: u16,
    user: &str,
    database: &str,
) -> Result<()> {
    let expanded = runtime_dir.join("seed.dump");
    decompress_seed(seed_path, &expanded)?;

    let pg_restore = resolve_postgres_binary("pg_restore");
    let restore_output = Command::new(&pg_restore)
        .arg("--no-owner")
        .arg("--no-privileges")
        .arg("-h")
        .arg("127.0.0.1")
        .arg("-p")
        .arg(port.to_string())
        .arg("-U")
        .arg(user)
        .arg("-d")
        .arg(database)
        .arg(&expanded)
        .output()
        .context("run pg_restore")?;
    if restore_output.status.success() {
        return Ok(());
    }

    let psql = resolve_postgres_binary("psql");
    let sql_output = Command::new(&psql)
        .arg("-h")
        .arg("127.0.0.1")
        .arg("-p")
        .arg(port.to_string())
        .arg("-U")
        .arg(user)
        .arg("-d")
        .arg(database)
        .arg("-v")
        .arg("ON_ERROR_STOP=1")
        .arg("-f")
        .arg(&expanded)
        .output()
        .context("run psql seed fallback")?;
    if sql_output.status.success() {
        return Ok(());
    }

    bail!(
        "seed restore failed with pg_restore stderr: {}; psql stderr: {}",
        String::from_utf8_lossy(&restore_output.stderr),
        String::from_utf8_lossy(&sql_output.stderr)
    );
}

fn decompress_seed(seed_path: &Path, out_path: &Path) -> Result<()> {
    if seed_path.extension().and_then(|ext| ext.to_str()) == Some("zst") {
        if !command_exists("zstd") {
            bail!("seed is zstd-compressed but zstd is not installed");
        }
        let out = fs::File::create(out_path).context("create decompressed seed dump")?;
        let status = Command::new("zstd")
            .arg("-dc")
            .arg(seed_path)
            .stdout(Stdio::from(out))
            .status()
            .context("decompress postgres seed with zstd")?;
        if !status.success() {
            bail!("zstd failed to decompress {}", seed_path.to_string_lossy());
        }
    } else {
        fs::copy(seed_path, out_path).context("copy postgres seed dump")?;
    }
    Ok(())
}

fn read_postgres_metadata(runtime_dir: &Path) -> Option<serde_json::Value> {
    let path = runtime_dir.join(POSTGRES_METADATA_FILE);
    serde_json::from_slice(&fs::read(path).ok()?).ok()
}

fn write_postgres_metadata(
    runtime_dir: &Path,
    name: &str,
    url: &str,
    port: u16,
    database: &str,
    user: &str,
    data_dir: &Path,
) -> Result<()> {
    let metadata = json!({
        "name": name,
        "url": url,
        "host": "127.0.0.1",
        "port": port,
        "database": database,
        "user": user,
        "dataDir": data_dir.to_string_lossy(),
    });
    fs::write(
        runtime_dir.join(POSTGRES_METADATA_FILE),
        serde_json::to_vec_pretty(&metadata)?,
    )
    .context("write postgres datastore metadata")?;
    Ok(())
}

fn status_with_datastores(mut status: WorldStatus, state_dir: &Path) -> Result<WorldStatus> {
    status.datastore_urls = datastore_urls_from_state_dir(state_dir)?;
    Ok(status)
}

fn find_free_local_port() -> Result<u16> {
    let listener = TcpListener::bind(("127.0.0.1", 0)).context("bind ephemeral localhost port")?;
    Ok(listener.local_addr()?.port())
}

fn postgres_database_name(name: &str) -> String {
    let mut out = String::new();
    for ch in name.chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch.to_ascii_lowercase());
        } else {
            out.push('_');
        }
    }
    let mut out = out.trim_matches('_').to_string();
    if out.is_empty() {
        out = "chronicle".to_string();
    }
    if out.as_bytes().first().is_some_and(u8::is_ascii_digit) {
        out.insert_str(0, "db_");
    }
    out.truncate(48);
    out
}

fn ensure_postgres_can_write(path: &Path) -> Result<()> {
    if !running_as_root() || !command_exists("chown") {
        return Ok(());
    }
    let status = Command::new("chown")
        .arg("-R")
        .arg("postgres:postgres")
        .arg(path)
        .status()
        .context("chown postgres runtime dir")?;
    if !status.success() {
        bail!("failed to chown {} to postgres", path.to_string_lossy());
    }
    Ok(())
}

fn run_postgres_command(label: &str, binary: &Path, args: Vec<String>) -> Result<()> {
    let mut command = postgres_command(binary);
    let output = command
        .args(args)
        .output()
        .with_context(|| format!("run postgres command: {label}"))?;
    if !output.status.success() {
        bail!(
            "postgres command failed ({label}) with status {}; stdout: {}; stderr: {}",
            output.status,
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
    }
    Ok(())
}

fn postgres_command(binary: &Path) -> Command {
    if running_as_root() {
        if command_exists("runuser") {
            let mut command = Command::new("runuser");
            command.arg("-u").arg("postgres").arg("--").arg(binary);
            return command;
        }
        if command_exists("sudo") {
            let mut command = Command::new("sudo");
            command.arg("-u").arg("postgres").arg(binary);
            return command;
        }
    }
    Command::new(binary)
}

fn resolve_postgres_binary(name: &str) -> PathBuf {
    for version in ["17", "16", "15", "14", "13"] {
        let path = PathBuf::from(format!("/usr/lib/postgresql/{version}/bin/{name}"));
        if path.is_file() {
            return path;
        }
    }
    if command_exists(name) {
        return PathBuf::from(name);
    }
    PathBuf::from(name)
}

fn running_as_root() -> bool {
    Command::new("id")
        .arg("-u")
        .output()
        .map(|output| {
            output.status.success() && String::from_utf8_lossy(&output.stdout).trim() == "0"
        })
        .unwrap_or(false)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum InterceptMode {
    Disabled,
    BestEffort,
    Strict,
}

fn intercept_mode() -> InterceptMode {
    match std::env::var("CHRONICLE_WORLD_INTERCEPT") {
        Ok(value)
            if matches!(
                value.to_ascii_lowercase().as_str(),
                "0" | "false" | "off" | "disabled"
            ) =>
        {
            InterceptMode::Disabled
        }
        Ok(value)
            if matches!(
                value.to_ascii_lowercase().as_str(),
                "1" | "true" | "strict" | "required"
            ) =>
        {
            InterceptMode::Strict
        }
        _ => InterceptMode::BestEffort,
    }
}

fn run_intercept_step<F>(mode: InterceptMode, label: &str, step: F) -> Result<()>
where
    F: FnOnce() -> Result<()>,
{
    match step() {
        Ok(()) => Ok(()),
        Err(err) if mode == InterceptMode::Strict => Err(err).with_context(|| label.to_string()),
        Err(err) => {
            eprintln!("worldctl interception warning: {label}: {err:#}");
            Ok(())
        }
    }
}

fn install_ca_trust(bundle: &Path) -> Result<()> {
    let security_dir = bundle.join("security");
    let ca_crt = security_dir.join("ca.crt");
    let mitm_ca = security_dir.join("mitmproxy-ca.pem");
    let confdir = security_dir.join("mitmproxy");
    fs::create_dir_all(&confdir).context("create mitmproxy confdir")?;

    if !ca_crt.is_file() {
        bail!("bundle CA certificate is missing at {}", ca_crt.display());
    }
    if !mitm_ca.is_file() {
        bail!("mitmproxy CA material is missing at {}", mitm_ca.display());
    }
    fs::copy(&mitm_ca, confdir.join("mitmproxy-ca.pem")).with_context(|| {
        format!(
            "copy mitmproxy CA from {} into confdir",
            mitm_ca.to_string_lossy()
        )
    })?;

    if command_exists("update-ca-certificates") {
        fs::copy(
            &ca_crt,
            "/usr/local/share/ca-certificates/chronicle-world.crt",
        )
        .context("install Chronicle world CA into system trust store")?;
        let status = Command::new("update-ca-certificates")
            .status()
            .context("run update-ca-certificates")?;
        if !status.success() {
            bail!("update-ca-certificates failed with status {status}");
        }
    }
    Ok(())
}

fn start_mitmproxy_listeners(bundle: &Path, socket: &Path, state_dir: &Path) -> Result<()> {
    if !command_exists("mitmdump") {
        bail!("mitmdump is not installed");
    }
    if !Path::new(MITMPROXY_ADDON).is_file() {
        bail!("mitmproxy addon is missing at {MITMPROXY_ADDON}");
    }
    fs::create_dir_all(state_dir)?;
    let confdir = bundle.join("security").join("mitmproxy");
    start_mitmproxy_listener(
        "regular",
        "regular",
        REGULAR_PROXY_PORT,
        &confdir,
        socket,
        state_dir,
        MITMPROXY_REGULAR_PID,
    )?;
    start_mitmproxy_listener(
        "transparent",
        "transparent",
        TRANSPARENT_PROXY_PORT,
        &confdir,
        socket,
        state_dir,
        MITMPROXY_TRANSPARENT_PID,
    )?;
    Ok(())
}

fn start_mitmproxy_listener(
    name: &str,
    mode: &str,
    port: u16,
    confdir: &Path,
    socket: &Path,
    state_dir: &Path,
    pid_name: &str,
) -> Result<()> {
    let pid_path = state_dir.join(pid_name);
    if let Some(pid) = read_pid(&pid_path) {
        if process_alive(pid) {
            return Ok(());
        }
        let _ = fs::remove_file(&pid_path);
    }

    let stdout = fs::File::create(state_dir.join(format!("mitmproxy-{name}.stdout.log")))?;
    let stderr = fs::File::create(state_dir.join(format!("mitmproxy-{name}.stderr.log")))?;
    let child = Command::new("mitmdump")
        .arg("--mode")
        .arg(mode)
        .arg("--listen-host")
        .arg("127.0.0.1")
        .arg("--listen-port")
        .arg(port.to_string())
        .arg("--set")
        .arg(format!("confdir={}", confdir.to_string_lossy()))
        .arg("--set")
        .arg("ssl_insecure=false")
        .arg("--set")
        .arg("connection_strategy=lazy")
        .arg("--set")
        .arg("upstream_cert=false")
        .arg("--scripts")
        .arg(MITMPROXY_ADDON)
        .env("WORLD_SOCKET", socket)
        .stdin(Stdio::null())
        .stdout(Stdio::from(stdout))
        .stderr(Stdio::from(stderr))
        .spawn()
        .with_context(|| format!("spawn mitmproxy {name} listener"))?;
    let pid = child.id();
    fs::write(pid_path, pid.to_string())?;
    wait_for_mitmproxy_listener(name, port, pid, state_dir)?;
    Ok(())
}

fn wait_for_mitmproxy_listener(name: &str, port: u16, pid: u32, state_dir: &Path) -> Result<()> {
    let started = Instant::now();
    let timeout = Duration::from_secs(10);
    let addr = format!("127.0.0.1:{port}");
    while started.elapsed() < timeout {
        if TcpStream::connect(&addr).is_ok() {
            return Ok(());
        }
        if !process_alive(pid) {
            bail!(
                "mitmproxy {name} listener exited before accepting connections on {addr}; stderr={}",
                tail_log(&state_dir.join(format!("mitmproxy-{name}.stderr.log")), 4096)
            );
        }
        thread::sleep(Duration::from_millis(100));
    }
    bail!(
        "mitmproxy {name} listener did not accept connections on {addr} within {:?}; stderr={}",
        timeout,
        tail_log(
            &state_dir.join(format!("mitmproxy-{name}.stderr.log")),
            4096
        )
    );
}

fn tail_log(path: &Path, max_bytes: usize) -> String {
    let Ok(bytes) = fs::read(path) else {
        return String::new();
    };
    let start = bytes.len().saturating_sub(max_bytes);
    String::from_utf8_lossy(&bytes[start..]).to_string()
}

fn apply_egress_rules() -> Result<()> {
    if !command_exists("iptables") {
        bail!("iptables is not installed");
    }

    run_shell_rule(
        "allow loopback TCP before transparent redirect",
        "iptables -t nat -C OUTPUT -p tcp -d 127.0.0.0/8 -j RETURN 2>/dev/null || \
         iptables -t nat -A OUTPUT -p tcp -d 127.0.0.0/8 -j RETURN",
    )?;
    run_shell_rule(
        "redirect non-root TCP 80/443 to mitmproxy transparent listener",
        "iptables -t nat -C OUTPUT -p tcp -m multiport --dports 80,443 -m owner ! --uid-owner 0 -j REDIRECT --to-ports 8889 2>/dev/null || \
         iptables -t nat -A OUTPUT -p tcp -m multiport --dports 80,443 -m owner ! --uid-owner 0 -j REDIRECT --to-ports 8889",
    )?;
    run_shell_rule(
        "block QUIC/DoQ UDP 443",
        "iptables -C OUTPUT -p udp --dport 443 -j REJECT 2>/dev/null || \
         iptables -A OUTPUT -p udp --dport 443 -j REJECT",
    )?;
    run_shell_rule(
        "block external DNS UDP 53",
        "iptables -C OUTPUT -p udp --dport 53 ! -d 127.0.0.1/32 -j REJECT 2>/dev/null || \
         iptables -A OUTPUT -p udp --dport 53 ! -d 127.0.0.1/32 -j REJECT",
    )?;
    run_shell_rule(
        "block DNS-over-TLS TCP 853",
        "iptables -C OUTPUT -p tcp --dport 853 -j REJECT 2>/dev/null || \
         iptables -A OUTPUT -p tcp --dport 853 -j REJECT",
    )?;
    Ok(())
}

fn run_shell_rule(label: &str, script: &str) -> Result<()> {
    let status = Command::new("sh")
        .arg("-lc")
        .arg(script)
        .status()
        .with_context(|| format!("apply iptables rule: {label}"))?;
    if !status.success() {
        bail!("iptables rule failed ({label}) with status {status}");
    }
    Ok(())
}

fn command_exists(name: &str) -> bool {
    Command::new("sh")
        .arg("-lc")
        .arg(format!("command -v {name} >/dev/null 2>&1"))
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

fn read_pid(path: &Path) -> Option<u32> {
    fs::read_to_string(path).ok()?.trim().parse::<u32>().ok()
}

fn process_alive(pid: u32) -> bool {
    Command::new("sh")
        .arg("-lc")
        .arg(format!("kill -0 {pid}"))
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

fn kill_pid_file(path: &Path) -> Result<()> {
    let Some(pid) = read_pid(path) else {
        return Ok(());
    };
    terminate_process(pid).with_context(|| format!("kill pid from {}", path.to_string_lossy()))?;
    let _ = fs::remove_file(path);
    Ok(())
}

fn terminate_process(pid: u32) -> Result<()> {
    let status = Command::new("sh")
        .arg("-lc")
        .arg(format!("kill {pid}"))
        .status()
        .context("run kill")?;
    if !status.success() && process_alive(pid) {
        bail!("failed to kill pid {pid}");
    }
    Ok(())
}

fn socket_from_args(args: &mut Vec<String>) -> Result<PathBuf> {
    if let Some(socket) = take_value(args, "--socket") {
        return Ok(PathBuf::from(socket));
    }
    if let Some(bundle) = take_value(args, "--bundle") {
        return Ok(default_socket_for_bundle(Path::new(&bundle)));
    }
    Ok(PathBuf::from(WORLD_SOCKET))
}

fn query_status(socket: &Path) -> Result<WorldStatus> {
    match send_rpc(socket, &WorldRpcRequest::Status)? {
        WorldRpcResponse::Status(status) => Ok(status),
        other => bail!("unexpected worldd status response: {other:?}"),
    }
}

fn wait_for_status(socket: &Path, timeout: Duration) -> Result<WorldStatus> {
    let started = Instant::now();
    let mut last_error = None;
    while started.elapsed() < timeout {
        match query_status(socket) {
            Ok(status) if status.ready => return Ok(status),
            Ok(_) => {}
            Err(err) => last_error = Some(err),
        }
        thread::sleep(Duration::from_millis(100));
    }
    if let Some(err) = last_error {
        return Err(err).context("worldd did not become ready");
    }
    bail!("worldd did not become ready");
}

fn resolve_worldd_binary() -> PathBuf {
    if let Ok(current) = std::env::current_exe() {
        if let Some(dir) = current.parent() {
            let sibling = dir.join("worldd");
            if sibling.is_file() {
                return sibling;
            }
        }
    }
    PathBuf::from("worldd")
}

fn shift(args: &mut Vec<String>) -> Option<String> {
    if args.is_empty() {
        None
    } else {
        Some(args.remove(0))
    }
}

fn take_bool(args: &mut Vec<String>, name: &str) -> bool {
    if let Some(index) = args.iter().position(|arg| arg == name) {
        args.remove(index);
        true
    } else {
        false
    }
}

fn take_value(args: &mut Vec<String>, name: &str) -> Option<String> {
    let index = args.iter().position(|arg| arg == name)?;
    args.remove(index);
    if index >= args.len() {
        return None;
    }
    Some(args.remove(index))
}

fn reject_unknown(args: Vec<String>) -> Result<()> {
    if args.is_empty() {
        Ok(())
    } else {
        bail!("unknown worldctl argument(s): {}", args.join(" "))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn discovers_datastore_seed_dumps_in_bundle_order() {
        let tmp = tempfile::tempdir().unwrap();
        fs::create_dir_all(tmp.path().join("datastores/zeta")).unwrap();
        fs::create_dir_all(tmp.path().join("datastores/appdb")).unwrap();
        fs::write(tmp.path().join("datastores/zeta/seed.dump.zst"), b"z").unwrap();
        fs::write(tmp.path().join("datastores/appdb/seed.dump.zst"), b"a").unwrap();
        fs::write(tmp.path().join("datastores/appdb/ignored.txt"), b"x").unwrap();

        let datastores = discover_datastore_seeds(tmp.path()).unwrap();

        assert_eq!(
            datastores
                .iter()
                .map(|datastore| datastore.name.as_str())
                .collect::<Vec<_>>(),
            vec!["appdb", "zeta"]
        );
    }

    #[test]
    fn postgres_database_names_are_safe() {
        assert_eq!(postgres_database_name("App DB"), "app_db");
        assert_eq!(postgres_database_name("123-main"), "db_123_main");
        assert_eq!(postgres_database_name("!!!"), "chronicle");
    }

    #[test]
    fn free_local_port_returns_non_zero_port() {
        assert!(find_free_local_port().unwrap() > 0);
    }
}
