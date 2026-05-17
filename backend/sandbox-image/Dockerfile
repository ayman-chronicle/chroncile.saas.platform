FROM rust:1.81-bookworm AS builder

WORKDIR /workspace

COPY Cargo.toml Cargo.lock ./
COPY crates ./crates
COPY bin ./bin

RUN cargo build --release -p worldctl -p worldd

FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bash \
        ca-certificates \
        curl \
        iproute2 \
        iptables \
        mitmproxy \
        postgresql-15 \
        redis-server \
        sudo \
        python3 \
        zstd \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -m -s /bin/bash agent \
    && mkdir -p /tmp/chronicle \
    && chmod 777 /tmp/chronicle

COPY --from=builder /workspace/target/release/worldctl /usr/local/bin/worldctl
COPY --from=builder /workspace/target/release/worldd /usr/local/bin/worldd
COPY sandbox-image/chronicle_addon.py /opt/chronicle/chronicle_addon.py

RUN chmod +x /usr/local/bin/worldctl /usr/local/bin/worldd

ENV CHRONICLE_WORLD_INTERCEPT=strict

WORKDIR /tmp/chronicle/work
