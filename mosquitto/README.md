# Mosquitto MQTT Broker — Local Dev Setup

This broker enforces authentication (`allow_anonymous false`). Credentials live in
`mosquitto/passwd` (a Mosquitto-hashed password file — not human-editable) and access
control is defined in `mosquitto/acl.conf`.

`mosquitto/passwd` is **gitignored** — it will hold real hashed credentials once
provisioned, and must never be committed. `mosquitto/passwd.example` is the tracked,
empty (0 byte) placeholder, mirroring this project's `.env.example` → `.env` convention.

Before first boot, copy the placeholder into place:

```bash
cp mosquitto/passwd.example mosquitto/passwd
```

Mosquitto refuses to start if `password_file` points to a path that doesn't exist at
all, so an empty `mosquitto/passwd` is required just so the container can boot before
any users are provisioned. It has no valid users until you run the commands below.

After restoring/recreating `mosquitto/passwd` on a host that already has the container
running, a plain `docker compose restart mosquitto` is not enough — Docker may have
resolved the bind mount while the file was missing. Use
`docker compose up -d --force-recreate mosquitto` to make sure the mount re-resolves
against the real file (verified needed during Day 10 integration testing: a restart
alone kept failing with `Unable to open pwfile`, force-recreate fixed it immediately).

## Provisioning users

All commands run via `mosquitto_passwd` inside the running `mosquitto` container, against
the file mounted at `/mosquitto/config/passwd`.

> **Correction (found during Day 10 live testing):** the warning below originally said
> `-c` wipes the file if it already exists. That's wrong for this image's `mosquitto_passwd`
> (2.1.2) — it actually **refuses to run** with `Unable to open file ... File exists` if
> the target file is already there (which it always is here, since the bootstrap step
> above already created it from `passwd.example`). **Practical result: never use `-c`
> after following the `cp passwd.example passwd` step — not even for the very first user.**
> Only use `-c` if `mosquitto/passwd` doesn't exist on disk at all yet.

### First user ever (gateway)

```bash
docker compose exec mosquitto mosquitto_passwd -b /mosquitto/config/passwd iot_gateway <password>
```

### Every subsequent user (each vehicle) — same command, no `-c`

```bash
docker compose exec mosquitto mosquitto_passwd -b /mosquitto/config/passwd <vehicle_uuid> <password>
```

Use the vehicle's Postgres UUID as the username — this is what the `pattern write
vehicle/%u/data` rule in `acl.conf` keys off of, so the vehicle can only ever publish to
its own telemetry topic.

### After adding/changing any user

**Correction (found during Day 10 live testing): password file changes are NOT picked
up live.** A freshly-provisioned user got `Connection refused: Not authorized` from the
gateway until the broker was explicitly told to reload — confirmed by testing against
a real running container, not assumed. Always reload after running `mosquitto_passwd`:

```bash
docker compose exec mosquitto mosquitto_passwd -b /mosquitto/config/passwd <username> <password>
docker compose kill -s HUP mosquitto   # or: docker compose restart mosquitto
```

## Files

- `mosquitto.conf` — broker config (auth required, points at `passwd` and `acl.conf`)
- `acl.conf` — access control rules (`iot_gateway` read-only on `vehicle/+/data`,
  each vehicle write-only on its own `vehicle/<uuid>/data` topic via `%u` substitution)
- `passwd.example` — tracked, empty placeholder; copy to `passwd` before first boot
- `passwd` — gitignored, Mosquitto-hashed credentials file, provisioned via `mosquitto_passwd` as above
