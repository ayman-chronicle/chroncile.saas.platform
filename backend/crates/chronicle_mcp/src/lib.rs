mod auth;
mod data_access;
mod eval;
mod eval_anthropic;
mod eval_context_dump;
mod eval_fragmented_tools;
mod eval_seed;
mod eval_transport;
mod error;
mod resources;
mod server;

pub use auth::{ChronicleMcpAuthResolver, McpSessionContext};
pub use data_access::{
    ChronicleMcpDataAccess, EventQueryInput, InProcessChronicleMcpDataAccess, ListAuditLogsInput,
    ListRunsInput, ReplayTimelineInput, ReplayTimelineOutput, SearchInput, TimelineInput,
    WatchEventsInput, WatchEventsOutput,
};
pub use eval::{
    ChronicleBaselineEvalResult, ChronicleEvalBaseline, ChronicleEvalComparison,
    ChronicleMcpEvalMatrix, ChronicleMcpEvalResult, ChronicleMcpEvalRunner,
    ChronicleMcpEvalScenario, McpEvalTransport, compare_mcp_to_baseline,
};
pub use eval_anthropic::{AnthropicEvalConfig, AnthropicMcpEvalRunner};
pub use eval_context_dump::AnthropicContextDumpEvalRunner;
pub use eval_fragmented_tools::{
    AnthropicFragmentedToolEvalRunner, FragmentedToolEvalResult,
    ToolSurfaceBenchmarkComparison, compare_mcp_to_fragmented_tools,
};
pub use error::ChronicleMcpError;
pub use server::{ChronicleMcpServer, ChronicleMcpServerOptions};
