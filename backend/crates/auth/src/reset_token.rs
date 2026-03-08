use sha2::{Digest, Sha256};

const PASSWORD_RESET_TOKEN_PREFIX: &str = "pwr_";

pub fn generate_password_reset_token() -> String {
    format!("{PASSWORD_RESET_TOKEN_PREFIX}{}", cuid2::create_id())
}

pub fn hash_password_reset_token(token: &str) -> String {
    let digest = Sha256::digest(token.as_bytes());
    hex::encode(digest)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_password_reset_token_prefix() {
        let token = generate_password_reset_token();
        assert!(token.starts_with(PASSWORD_RESET_TOKEN_PREFIX));
        assert!(token.len() > PASSWORD_RESET_TOKEN_PREFIX.len());
    }

    #[test]
    fn test_hash_password_reset_token_is_stable() {
        let token = "pwr_test_token";
        let hash_a = hash_password_reset_token(token);
        let hash_b = hash_password_reset_token(token);

        assert_eq!(hash_a, hash_b);
        assert_eq!(hash_a.len(), 64);
    }

    #[test]
    fn test_hash_password_reset_token_changes_with_input() {
        let hash_a = hash_password_reset_token("pwr_token_a");
        let hash_b = hash_password_reset_token("pwr_token_b");

        assert_ne!(hash_a, hash_b);
    }
}
