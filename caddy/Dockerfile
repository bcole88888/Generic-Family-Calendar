# Caddy doesn't ship the Cloudflare DNS module by default, so build it in
# with xcaddy. This lets Caddy prove domain ownership via a DNS TXT record
# instead of an inbound HTTP challenge, so nothing needs to be reachable
# from the public internet.
FROM caddy:2-builder AS builder

RUN xcaddy build \
    --with github.com/caddy-dns/cloudflare

FROM caddy:2

COPY --from=builder /usr/bin/caddy /usr/bin/caddy
COPY Caddyfile /etc/caddy/Caddyfile
