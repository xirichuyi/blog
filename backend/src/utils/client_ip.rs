//! 反向代理链路上的访客 IP 判定（供公开端点限流使用）。
//!
//! 线上链路：Cloudflare → nginx → 本服务（127.0.0.1:3006）。转发头都能被客户端
//! 伪造，所以只采信我们自己这一侧写入的那一跳：
//! - 套接字对端不是本机：请求没有经过 nginx，直接用对端地址，忽略全部转发头。
//! - 对端是本机（nginx）：nginx 用 `$proxy_add_x_forwarded_for` 把它看到的上一跳
//!   追加在 `X-Forwarded-For` 末尾。上一跳属于 Cloudflare 时才采信
//!   `CF-Connecting-IP`；否则（有人绕过 Cloudflare 直连源站）上一跳就是访客本身。

use axum::http::HeaderMap;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr};

/// Cloudflare 回源地址段，见 https://www.cloudflare.com/ips/ 。
const CLOUDFLARE_V4: [(Ipv4Addr, u32); 15] = [
    (Ipv4Addr::new(173, 245, 48, 0), 20),
    (Ipv4Addr::new(103, 21, 244, 0), 22),
    (Ipv4Addr::new(103, 22, 200, 0), 22),
    (Ipv4Addr::new(103, 31, 4, 0), 22),
    (Ipv4Addr::new(141, 101, 64, 0), 18),
    (Ipv4Addr::new(108, 162, 192, 0), 18),
    (Ipv4Addr::new(190, 93, 240, 0), 20),
    (Ipv4Addr::new(188, 114, 96, 0), 20),
    (Ipv4Addr::new(197, 234, 240, 0), 22),
    (Ipv4Addr::new(198, 41, 128, 0), 17),
    (Ipv4Addr::new(162, 158, 0, 0), 15),
    (Ipv4Addr::new(104, 16, 0, 0), 13),
    (Ipv4Addr::new(104, 24, 0, 0), 14),
    (Ipv4Addr::new(172, 64, 0, 0), 13),
    (Ipv4Addr::new(131, 0, 72, 0), 22),
];

const CLOUDFLARE_V6: [(Ipv6Addr, u32); 7] = [
    (Ipv6Addr::new(0x2400, 0xcb00, 0, 0, 0, 0, 0, 0), 32),
    (Ipv6Addr::new(0x2606, 0x4700, 0, 0, 0, 0, 0, 0), 32),
    (Ipv6Addr::new(0x2803, 0xf800, 0, 0, 0, 0, 0, 0), 32),
    (Ipv6Addr::new(0x2405, 0xb500, 0, 0, 0, 0, 0, 0), 32),
    (Ipv6Addr::new(0x2405, 0x8100, 0, 0, 0, 0, 0, 0), 32),
    (Ipv6Addr::new(0x2a06, 0x98c0, 0, 0, 0, 0, 0, 0), 29),
    (Ipv6Addr::new(0x2c0f, 0xf248, 0, 0, 0, 0, 0, 0), 32),
];

/// 取用于限流的访客 IP。
pub fn client_ip(peer: SocketAddr, headers: &HeaderMap) -> IpAddr {
    let peer = peer.ip().to_canonical();
    if !peer.is_loopback() {
        return peer;
    }
    // nginx 追加的最后一段是它自己看到的对端，客户端写不到这个位置。
    let Some(hop) = last_forwarded_hop(headers) else {
        return peer;
    };
    if !is_cloudflare(hop) {
        return hop;
    }
    header_ip(headers, "cf-connecting-ip").unwrap_or(hop)
}

fn last_forwarded_hop(headers: &HeaderMap) -> Option<IpAddr> {
    headers
        .get_all("x-forwarded-for")
        .iter()
        .filter_map(|value| value.to_str().ok())
        .flat_map(|value| value.split(','))
        .last()
        .and_then(|hop| hop.trim().parse::<IpAddr>().ok())
        .map(|ip| ip.to_canonical())
}

fn header_ip(headers: &HeaderMap, name: &str) -> Option<IpAddr> {
    headers
        .get(name)?
        .to_str()
        .ok()?
        .trim()
        .parse::<IpAddr>()
        .ok()
        .map(|ip| ip.to_canonical())
}

fn is_cloudflare(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(ip) => CLOUDFLARE_V4.iter().any(|(net, len)| {
            let mask = u32::MAX.checked_shl(32 - len).unwrap_or(0);
            u32::from(ip) & mask == u32::from(*net) & mask
        }),
        IpAddr::V6(ip) => CLOUDFLARE_V6.iter().any(|(net, len)| {
            let mask = u128::MAX.checked_shl(128 - len).unwrap_or(0);
            u128::from(ip) & mask == u128::from(*net) & mask
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderValue;

    fn headers(pairs: &[(&'static str, &str)]) -> HeaderMap {
        let mut headers = HeaderMap::new();
        for (name, value) in pairs {
            headers.append(*name, HeaderValue::from_str(value).unwrap());
        }
        headers
    }

    const NGINX: &str = "127.0.0.1:40000";

    #[test]
    fn cloudflare_hop_trusts_cf_connecting_ip() {
        let headers = headers(&[
            ("cf-connecting-ip", "203.0.113.7"),
            ("x-forwarded-for", "198.51.100.1, 203.0.113.7, 172.64.1.2"),
        ]);
        assert_eq!(
            client_ip(NGINX.parse().unwrap(), &headers),
            "203.0.113.7".parse::<IpAddr>().unwrap()
        );
    }

    #[test]
    fn spoofed_cf_header_from_direct_origin_hit_is_ignored() {
        let headers = headers(&[
            ("cf-connecting-ip", "10.9.9.9"),
            ("x-forwarded-for", "172.64.1.2, 198.51.100.20"),
        ]);
        assert_eq!(
            client_ip(NGINX.parse().unwrap(), &headers),
            "198.51.100.20".parse::<IpAddr>().unwrap()
        );
    }

    #[test]
    fn non_local_peer_ignores_forwarding_headers() {
        let headers = headers(&[
            ("cf-connecting-ip", "10.9.9.9"),
            ("x-forwarded-for", "10.9.9.9"),
        ]);
        assert_eq!(
            client_ip("198.51.100.30:5555".parse().unwrap(), &headers),
            "198.51.100.30".parse::<IpAddr>().unwrap()
        );
    }
}
