//! 文章访问密码的哈希与校验（PBKDF2-HMAC-SHA256）。
//!
//! 存储格式：`pbkdf2-sha256$<迭代次数>$<盐 hex>$<哈希 hex>`。迭代次数随哈希
//! 保存，日后调高不影响已有密码。

use hmac::{Hmac, Mac};
use sha2::Sha256;

const SCHEME: &str = "pbkdf2-sha256";
const ITERATIONS: u32 = 100_000;
/// 密码长度上限（字符数），避免超长输入消耗 CPU。
pub const MAX_PASSWORD_CHARS: usize = 128;

fn pbkdf2(password: &[u8], salt: &[u8], iterations: u32) -> [u8; 32] {
    let keyed = Hmac::<Sha256>::new_from_slice(password).expect("HMAC accepts keys of any length");
    let mut mac = keyed.clone();
    mac.update(salt);
    mac.update(&1u32.to_be_bytes());
    let mut block: [u8; 32] = mac.finalize().into_bytes().into();
    let mut output = block;
    for _ in 1..iterations {
        let mut mac = keyed.clone();
        mac.update(&block);
        block = mac.finalize().into_bytes().into();
        for (out, byte) in output.iter_mut().zip(block) {
            *out ^= byte;
        }
    }
    output
}

pub fn hash_password(password: &str) -> String {
    let salt = *uuid::Uuid::new_v4().as_bytes();
    let hash = pbkdf2(password.as_bytes(), &salt, ITERATIONS);
    format!(
        "{SCHEME}${ITERATIONS}${}${}",
        hex::encode(salt),
        hex::encode(hash)
    )
}

pub fn verify_password(password: &str, stored: &str) -> bool {
    let mut parts = stored.split('$');
    let (Some(scheme), Some(iterations), Some(salt), Some(expected), None) = (
        parts.next(),
        parts.next(),
        parts.next(),
        parts.next(),
        parts.next(),
    ) else {
        return false;
    };
    let (Ok(iterations), Ok(salt), Ok(expected)) = (
        iterations.parse::<u32>(),
        hex::decode(salt),
        hex::decode(expected),
    ) else {
        return false;
    };
    if scheme != SCHEME || iterations == 0 || expected.len() != 32 {
        return false;
    }
    let actual = pbkdf2(password.as_bytes(), &salt, iterations);
    // 常数时间比较，不因首个不同字节提前返回。
    actual
        .iter()
        .zip(&expected)
        .fold(0u8, |diff, (a, b)| diff | (a ^ b))
        == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pbkdf2_matches_the_published_test_vector() {
        // RFC 7914 §11: PBKDF2-HMAC-SHA-256 (P="passwd", S="salt", c=1).
        assert_eq!(
            hex::encode(pbkdf2(b"passwd", b"salt", 1)),
            "55ac046e56e3089fec1691c22544b605f94185216dde0465e68b9d57c20dacbc"
        );
    }

    #[test]
    fn verifies_only_the_original_password() {
        let stored = hash_password("芝麻开门");
        assert!(verify_password("芝麻开门", &stored));
        assert!(!verify_password("芝麻开门 ", &stored));
        assert!(!verify_password("", &stored));
        assert_ne!(stored, hash_password("芝麻开门"), "salts must differ");
    }

    #[test]
    fn rejects_malformed_hashes() {
        assert!(!verify_password("x", ""));
        assert!(!verify_password("x", "pbkdf2-sha256$0$00$00"));
        assert!(!verify_password("x", "plain$1$00$00"));
    }
}
