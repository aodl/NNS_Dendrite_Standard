use candid::{CandidType, Decode, Deserialize, Encode, Principal, Reserved};
use pocket_ic::{PocketIc, PocketIcBuilder};
use std::path::PathBuf;

#[derive(CandidType)]
struct HttpRequest {
    method: String,
    url: String,
    headers: Vec<(String, String)>,
    body: Vec<u8>,
    certificate_version: Option<u16>,
}

#[derive(CandidType, Deserialize)]
struct HttpResponse {
    status_code: u16,
    headers: Vec<(String, String)>,
    body: Vec<u8>,
    upgrade: Option<bool>,
}

fn wasm() -> Vec<u8> {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../target/wasm32-unknown-unknown/release/dendrite.wasm");
    std::fs::read(&path).unwrap_or_else(|error| {
        panic!(
            "read frontend-embedded Wasm at {} (run cargo xtask test): {error}",
            path.display()
        )
    })
}

fn pocket_ic() -> PocketIc {
    let server = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../dist/tools/pocket-ic-server-15.0.0/pocket-ic");
    assert!(
        server.is_file(),
        "run cargo xtask test to provision PocketIC"
    );
    PocketIcBuilder::new()
        .with_application_subnet()
        .with_server_binary(server)
        .build()
}

#[test]
fn public_api_certified_http_and_upgrade_work_anonymously() {
    let pic = pocket_ic();
    let canister = pic.create_canister();
    pic.add_cycles(canister, 5_000_000_000_000);
    let wasm = wasm();
    pic.install_canister(canister, wasm.clone(), Encode!().unwrap(), None);

    let request = HttpRequest {
        method: "GET".into(),
        url: "/".into(),
        headers: vec![],
        body: vec![],
        certificate_version: Some(2),
    };
    let reply = pic
        .query_call(
            canister,
            Principal::anonymous(),
            "http_request",
            Encode!(&request).unwrap(),
        )
        .unwrap();
    let response = Decode!(&reply, HttpResponse).unwrap();
    assert_eq!(response.status_code, 200);
    assert_eq!(response.upgrade, None);
    assert!(
        String::from_utf8(response.body)
            .unwrap()
            .contains("Dendrite")
    );
    for required in [
        "content-security-policy",
        "strict-transport-security",
        "x-content-type-options",
        "ic-certificate",
    ] {
        assert!(
            response
                .headers
                .iter()
                .any(|(name, _)| name.eq_ignore_ascii_case(required)),
            "missing {required}"
        );
    }

    let checked = pic
        .update_call(
            canister,
            Principal::anonymous(),
            "check_neuron",
            Encode!(&7_u64).unwrap(),
        )
        .unwrap();
    let refresh_result = Decode!(&checked, Result<Reserved, Reserved>).unwrap();
    assert!(
        refresh_result.is_ok(),
        "fixed upstream rejection is evaluated"
    );
    pic.upgrade_canister(canister, wasm, Encode!().unwrap(), None)
        .unwrap();
    let reply = pic
        .query_call(
            canister,
            Principal::anonymous(),
            "http_request",
            Encode!(&request).unwrap(),
        )
        .unwrap();
    assert_eq!(Decode!(&reply, HttpResponse).unwrap().status_code, 200);
}
