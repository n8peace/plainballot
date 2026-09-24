# Abuse and DDoS protection

Several layers of protection sit between a flood of traffic and the bill. Each layer catches what gets past the one before it.

| Layer | What it stops | Where |
|---|---|---|
| Vercel platform DDoS mitigation | Network and request floods. On by default for every plan; blocked traffic isn't billed. | Vercel (automatic) |
| Static pages on the CDN | The home and methodology pages are prebuilt, so a flood of page views never reaches a server. | `next build` |
| Vercel WAF rate-limit rules | Scripts and agents hammering the two API routes. | Rules below |
| BotID | Automated clients (headless browsers, agents) calling the paid endpoints, checked invisibly. | [instrumentation-client.ts](../instrumentation-client.ts), both API routes |
| Per-IP limits | 12 AI reads and 30 ballot lookups per 10 minutes per visitor. | [lib/ratelimit.ts](../lib/ratelimit.ts) |
| Spend circuit breaker | Caps paid AI calls per server instance per minute (`AI_CALLS_PER_MINUTE`, default 120). Past it, visitors are told to use the dials. | [lib/ratelimit.ts](../lib/ratelimit.ts) |
| Repeat cache | Identical text is answered from memory instead of calling the model again. | `/api/interpret` |
| Size and time caps | Bodies over 8 KB are rejected before parsing. Routes time out after 15–20 s. | API routes |

If AI or ballot lookup is ever blocked or unavailable, the site still works: the dials, matching and sample ballot run entirely in the browser.

## WAF rules to add after the first deploy

Run from the linked project (`vercel link`). Each rule starts in **log** mode; review the traffic in the dashboard for a few days, then switch it to enforce.

```bash
vercel firewall rules add "Rate limit AI reads" \
  --condition '{"type":"path","op":"eq","value":"/api/interpret"}' \
  --condition '{"type":"method","op":"eq","value":"POST"}' \
  --action rate_limit --rate-limit-window 60 --rate-limit-requests 10 \
  --rate-limit-keys ip --rate-limit-action log --yes

vercel firewall rules add "Rate limit ballot lookups" \
  --condition '{"type":"path","op":"eq","value":"/api/ballot"}' \
  --action rate_limit --rate-limit-window 60 --rate-limit-requests 20 \
  --rate-limit-keys ip --rate-limit-action log --yes

vercel firewall rules add "Block exploit probes" \
  --condition '{"type":"path","op":"inc","value":["/wp-admin","/wp-login.php","/.env","/.git/config","/phpmyadmin","/xmlrpc.php"]}' \
  --action log --yes

vercel firewall diff
```

Then publish (a person does this, not an agent): `vercel firewall publish --yes`.

To enforce later, change `--rate-limit-action log` to `rate_limit` (and `--action log` to `deny`) with `vercel firewall rules edit`, then publish again.

## Dashboard settings (one-time)

- **Firewall → Configure → Vercel BotID Deep Analysis:** on.
- **Firewall → Bot Protection managed ruleset:** start in log, then challenge.
- **Settings → Billing → Spend Management:** set a monthly cap and alert.
- **AI Gateway:** keep credits topped up only to a level you're comfortable losing; turn off auto top-up.

## During an active attack

Turn on Attack Mode (a person runs this): `vercel firewall attack-mode enable --duration 1h --yes`. Visitors see a short check, and known search crawlers are let through.
