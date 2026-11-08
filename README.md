# Beelzebub decoys vs real clients

Unofficial demo by Cheryl Aurelia: not affiliated with Beelzebub.

**Problem.** Against `beelzebub-labs/beelzebub` main (df6de36), real `redis-cli` hangs on every command against `configurations/services/tcp-6379-redis.yaml`, and the real `mysql` client fails at the greeting against `tcp-3306.yaml`. The same Redis hang was reported in [PR #290](https://github.com/beelzebub-labs/beelzebub/pull/290).

**Demo.** One page with recorded results per command: shipped file, each fix branch, real `redis:7.0.12`. `data/redis.json`, `data/mysql.txt` and `data/one-connection-*.txt` are the raw recordings; `scripts/record.py` made the Redis one (it expects ports 26379, 26389, 26399 and 26380).

**Fixes** (config plus a test, no runtime change): [Redis hang](https://github.com/cherylaurelia/beelzebub/tree/fix/redis-resp-decoy), [Redis write chain](https://github.com/cherylaurelia/beelzebub/tree/fix/redis-write-chain), [MySQL](https://github.com/cherylaurelia/beelzebub/tree/fix/mysql-greeting).

No PR is open: the project's CONTRIBUTING asks contributors to have authored 100% of the content, and these branches were written with Claude Code.

## Limits
Loopback only, no real attacker traffic. Redis pipelines and values over about 4 KB still misbehave. The MySQL salt is static. See the page for the full list.

## Run the page
```
npm install && npm run build && npm run start
```

## Reproduce
Build Beelzebub, bind a copy of each YAML to 127.0.0.1 only, start `redis:7.0.12` on another port, then run:
```
python3 scripts/record.py out.json
```
Use an isolated host and synthetic credentials.
