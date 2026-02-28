use std::fmt;

#[derive(Debug)]
pub enum PipedreamError {
    Unauthorized,
    RateLimited { retry_after: Option<u64> },
    NotFound,
    ApiError { status: u16, message: String },
    Network(reqwest::Error),
    Deserialize(String),
}

impl fmt::Display for PipedreamError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Unauthorized => write!(f, "unauthorized: invalid or expired credentials"),
            Self::RateLimited { retry_after } => match retry_after {
                Some(secs) => write!(f, "rate limited: retry after {secs}s"),
                None => write!(f, "rate limited"),
            },
            Self::NotFound => write!(f, "not found"),
            Self::ApiError { status, message } => write!(f, "API error ({status}): {message}"),
            Self::Network(e) => write!(f, "network error: {e}"),
            Self::Deserialize(msg) => write!(f, "deserialization error: {msg}"),
        }
    }
}

impl std::error::Error for PipedreamError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Network(e) => Some(e),
            _ => None,
        }
    }
}

impl From<reqwest::Error> for PipedreamError {
    fn from(err: reqwest::Error) -> Self {
        Self::Network(err)
    }
}

pub type Result<T> = std::result::Result<T, PipedreamError>;
