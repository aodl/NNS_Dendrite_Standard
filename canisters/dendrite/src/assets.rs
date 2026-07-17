#[cfg(target_arch = "wasm32")]
use base64::{Engine, engine::general_purpose::STANDARD as BASE64};
use candid::{CandidType, Deserialize};
#[cfg(target_arch = "wasm32")]
use ic_certified_map::labeled;
use ic_certified_map::{AsHashTree, Hash, RbTree, labeled_hash};
use include_dir::{Dir, include_dir};
use sha2::{Digest, Sha256};
use std::cell::RefCell;

static ASSETS: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/public");
const CERT_LABEL: &[u8] = b"http_assets";
const CSP: &str = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self' https://icp-api.io https://*.icp0.io; img-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";

thread_local! { static HASHES: RefCell<RbTree<Vec<u8>, Hash>> = RefCell::new(build_hashes()); }

#[derive(Clone, CandidType, Deserialize)]
pub struct HeaderField(pub String, pub String);
#[derive(Clone, CandidType, Deserialize)]
pub struct HttpRequest {
    pub method: String,
    pub url: String,
    pub headers: Vec<HeaderField>,
    pub body: Vec<u8>,
    pub certificate_version: Option<u16>,
}
#[derive(Clone, CandidType, Deserialize)]
pub struct HttpResponse {
    pub status_code: u16,
    pub headers: Vec<HeaderField>,
    pub body: Vec<u8>,
    pub upgrade: Option<bool>,
}

fn sha256(bytes: &[u8]) -> Hash {
    Sha256::digest(bytes).into()
}
fn all_certified_routes() -> Vec<(String, Vec<u8>)> {
    let mut routes = Vec::new();
    fn visit(dir: &Dir<'_>, routes: &mut Vec<(String, Vec<u8>)>) {
        for file in dir.files() {
            let path = format!("/{}", file.path().to_string_lossy());
            if path != "/asset-manifest.json" {
                routes.push((path, file.contents().to_vec()));
            }
        }
        for child in dir.dirs() {
            visit(child, routes);
        }
    }
    visit(&ASSETS, &mut routes);
    if let Some(index) = ASSETS.get_file("index.html") {
        routes.push(("/".into(), index.contents().to_vec()));
    }
    routes.sort_by(|a, b| a.0.cmp(&b.0));
    routes
}
fn build_hashes() -> RbTree<Vec<u8>, Hash> {
    let mut tree = RbTree::new();
    for (path, body) in all_certified_routes() {
        tree.insert(path.into_bytes(), sha256(&body));
    }
    tree
}
pub fn certify_assets() {
    HASHES.with_borrow(|tree| {
        ic_cdk::api::certified_data_set(labeled_hash(CERT_LABEL, &tree.root_hash()))
    });
}
#[cfg(not(target_arch = "wasm32"))]
fn certification_header(_path: &str) -> Option<HeaderField> {
    None
}
#[cfg(target_arch = "wasm32")]
fn certification_header(path: &str) -> Option<HeaderField> {
    let certificate = ic_cdk::api::data_certificate()?;
    let tree = HASHES.with_borrow(|hashes| {
        serde_cbor::to_vec(&labeled(CERT_LABEL, hashes.witness(path.as_bytes()))).ok()
    })?;
    Some(HeaderField(
        "IC-Certificate".into(),
        format!(
            "certificate=:{}:, tree=:{}:, version=1",
            BASE64.encode(certificate),
            BASE64.encode(tree)
        ),
    ))
}
fn mime(path: &str) -> &'static str {
    if path.ends_with(".html") || path == "/" {
        "text/html; charset=utf-8"
    } else if path.ends_with(".js") {
        "text/javascript; charset=utf-8"
    } else if path.ends_with(".css") {
        "text/css; charset=utf-8"
    } else if path.ends_with(".svg") {
        "image/svg+xml"
    } else if path.ends_with(".png") {
        "image/png"
    } else if path.contains("ii-alternative-origins") {
        "application/json; charset=utf-8"
    } else {
        "application/octet-stream"
    }
}
fn security_headers(path: &str, body: &[u8]) -> Vec<HeaderField> {
    let immutable = path.starts_with("/generated/");
    vec![
        HeaderField("Content-Type".into(), mime(path).into()),
        HeaderField("X-Content-Type-Options".into(), "nosniff".into()),
        HeaderField(
            "Strict-Transport-Security".into(),
            "max-age=31536000; includeSubDomains".into(),
        ),
        HeaderField("Referrer-Policy".into(), "no-referrer".into()),
        HeaderField(
            "Permissions-Policy".into(),
            "camera=(), microphone=(), geolocation=(), payment=()".into(),
        ),
        HeaderField("Content-Security-Policy".into(), CSP.into()),
        HeaderField(
            "Cross-Origin-Opener-Policy".into(),
            "same-origin-allow-popups".into(),
        ),
        HeaderField("Cross-Origin-Resource-Policy".into(), "same-origin".into()),
        HeaderField(
            "Cache-Control".into(),
            if immutable {
                "public, max-age=31536000, immutable"
            } else {
                "no-cache, no-store, must-revalidate"
            }
            .into(),
        ),
        HeaderField("ETag".into(), format!("\"{}\"", hex::encode(sha256(body)))),
    ]
}
fn route(url: &str) -> (&str, u16) {
    let path = url.split('?').next().unwrap_or("/");
    if path == "/" {
        return ("/", 200);
    }
    let relative = path.trim_start_matches('/');
    if relative != "asset-manifest.json" && ASSETS.get_file(relative).is_some() {
        return (path, 200);
    }
    if !path.rsplit('/').next().unwrap_or("").contains('.') {
        ("/", 200)
    } else {
        ("/404.html", 404)
    }
}
pub fn http_request(request: HttpRequest) -> HttpResponse {
    if request.method != "GET" && request.method != "HEAD" {
        return HttpResponse {
            status_code: 405,
            headers: vec![HeaderField("Allow".into(), "GET, HEAD".into())],
            body: vec![],
            upgrade: None,
        };
    }
    let (path, status_code) = route(&request.url);
    let file_path = if path == "/" {
        "index.html"
    } else {
        path.trim_start_matches('/')
    };
    let body = ASSETS
        .get_file(file_path)
        .map_or_else(Vec::new, |file| file.contents().to_vec());
    let mut headers = security_headers(path, &body);
    if let Some(header) = certification_header(path) {
        headers.push(header);
    }
    HttpResponse {
        status_code,
        headers,
        body: if request.method == "HEAD" {
            vec![]
        } else {
            body
        },
        upgrade: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn get(url: &str) -> HttpResponse {
        http_request(HttpRequest {
            method: "GET".into(),
            url: url.into(),
            headers: vec![],
            body: vec![],
            certificate_version: None,
        })
    }
    #[test]
    fn routes_and_policies_are_bounded() {
        assert_eq!(get("/").status_code, 200);
        assert_eq!(get("/index.html").status_code, 200);
        assert_eq!(get("/#/neuron/1").status_code, 200);
        assert_eq!(get("/missing.js").status_code, 404);
        assert_eq!(get("/asset-manifest.json").status_code, 404);
        assert_eq!(get("/.well-known/ii-alternative-origins").status_code, 200);
        let generated = all_certified_routes()
            .into_iter()
            .find(|(path, _)| path.ends_with(".js"))
            .unwrap()
            .0;
        let response = get(&generated);
        assert!(
            response
                .headers
                .iter()
                .any(|h| h.0 == "Cache-Control" && h.1.contains("immutable"))
        );
        for name in [
            "Content-Security-Policy",
            "Strict-Transport-Security",
            "X-Content-Type-Options",
            "Referrer-Policy",
            "Permissions-Policy",
            "ETag",
        ] {
            assert!(response.headers.iter().any(|h| h.0 == name), "{name}");
        }
    }
    #[test]
    fn head_and_unsupported_methods_are_explicit() {
        let mut request = HttpRequest {
            method: "HEAD".into(),
            url: "/".into(),
            headers: vec![],
            body: vec![],
            certificate_version: None,
        };
        let response = http_request(request.clone());
        assert_eq!(response.status_code, 200);
        assert!(response.body.is_empty());
        request.method = "POST".into();
        assert_eq!(http_request(request).status_code, 405);
    }
}
