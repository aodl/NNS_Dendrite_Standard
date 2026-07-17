#!/bin/sh
set -eu

required_version='cargo-llvm-cov 0.6.16'
installed_version=$(cargo llvm-cov --version 2>/dev/null || true)
if [ "$installed_version" != "$required_version" ]; then
    echo "coverage requires $required_version; found: ${installed_version:-not installed}" >&2
    echo "install with: rustup component add llvm-tools-preview && cargo install cargo-llvm-cov --version 0.6.16 --locked" >&2
    exit 1
fi

# Stable Rust supports source regions, functions, and lines. LLVM branch
# instrumentation remains nightly-only, so branch coverage is reported as an
# explicit release limitation rather than silently substituted.
cargo llvm-cov -p dendrite-types --summary-only \
    --fail-under-regions 95 \
    --fail-under-lines 95
cargo llvm-cov --workspace --summary-only
