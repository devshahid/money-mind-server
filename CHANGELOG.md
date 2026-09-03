## [4.0.0](https://github.com/devshahid/money-mind-server/compare/v3.0.0...v4.0.0) (2026-09-03)

### ⚠ BREAKING CHANGES

- **ledger:** enforce ledger entry user isolation, plus CI/tooling hardening (#19)
- **ledger:** enforce user ownership on ledger entry sync and add userId backstop (#18)

### Features

- **ledger:** process sync operations ([#22](https://github.com/devshahid/money-mind-server/issues/22)) ([c53546c](https://github.com/devshahid/money-mind-server/commit/c53546c2ee5ee2d8f05352d19bb58a4e1882afdb))

### Bug Fixes

- **ci:** pin conventionalcommits preset to v8 for semantic-release writer compatibility ([e3430e8](https://github.com/devshahid/money-mind-server/commit/e3430e898ed44fbbd74e14b6a18f0f14d457d074))
- **ledger:** enforce ledger entry user isolation, plus CI/tooling hardening ([#19](https://github.com/devshahid/money-mind-server/issues/19)) ([98f123e](https://github.com/devshahid/money-mind-server/commit/98f123ef459ce4c6063e918053a2bdd480680c9a))
- **ledger:** enforce user ownership on ledger entry sync and add userId backstop ([#18](https://github.com/devshahid/money-mind-server/issues/18)) ([3a546b2](https://github.com/devshahid/money-mind-server/commit/3a546b2f619330b2253d1d53f2d29590db477ab5))

## [3.0.0](https://github.com/devshahid/money-mind-server/compare/v2.0.0...v3.0.0) (2026-08-25)

### ⚠ BREAKING CHANGES

- **ledger:** enforce ledger entry user isolation (+ CI/semantic-release tooling) (#20)

### Bug Fixes

- **ci:** pin conventionalcommits preset to v8 for semantic-release compatibility ([#21](https://github.com/devshahid/money-mind-server/issues/21)) ([26642ec](https://github.com/devshahid/money-mind-server/commit/26642ecad3e0e569bab77ab979349daa9bcbffd9))
- **ledger:** enforce ledger entry user isolation (+ CI/semantic-release tooling) ([#20](https://github.com/devshahid/money-mind-server/issues/20)) ([c3c15e3](https://github.com/devshahid/money-mind-server/commit/c3c15e345052ce19f28e6a48c17a2a735fd2285a)), closes [#17](https://github.com/devshahid/money-mind-server/issues/17) [#15](https://github.com/devshahid/money-mind-server/issues/15) [#14](https://github.com/devshahid/money-mind-server/issues/14) [#12](https://github.com/devshahid/money-mind-server/issues/12) [#10](https://github.com/devshahid/money-mind-server/issues/10)

# 1.0.0 (2026-08-25)

### Bug Fixes

- add env vars for AI tests in CI pipeline ([ccf1b56](https://github.com/devshahid/money-mind-server/commit/ccf1b56aa8a959a0e35f2de85dac6df83abba8dd))
- added logs for validation LLM response ([161ce74](https://github.com/devshahid/money-mind-server/commit/161ce74c5a86fe124385e6daa51329eeb2f33e30))
- correct transactionType validation and default pagination limit ([#5](https://github.com/devshahid/money-mind-server/issues/5)) ([f574e54](https://github.com/devshahid/money-mind-server/commit/f574e54d0144412988d5da9443d741e1b0eca843))
- handle stale MongoDB connections on Lambda cold starts ([69f12b0](https://github.com/devshahid/money-mind-server/commit/69f12b0b301aa7865b2d7a640dea05167950bd40))
- reduce AI batch size to 10 and add 25s LLM timeout to prevent 504s ([f5bbe43](https://github.com/devshahid/money-mind-server/commit/f5bbe43821371fae756e443ed3b5594563f190a0))
- switch to gpt-4o-mini, increase batch to 25, add LLM timeout ([a93c990](https://github.com/devshahid/money-mind-server/commit/a93c9905e5687b085913e6504a9aacc7457311ef))

### Features

- add isCredit to suggest-categories response and userOverride support in apply-suggestions ([8f5bc1f](https://github.com/devshahid/money-mind-server/commit/8f5bc1f62cc12d70ed9e0f8da4bcecaa36a6e0d1))
- add Refunds & Reversals category ([f40dad5](https://github.com/devshahid/money-mind-server/commit/f40dad58307b6908d543f91bcf4ef9d91f5f76a9))
- add uncategorized filter support with query ([7ae6cf2](https://github.com/devshahid/money-mind-server/commit/7ae6cf2213bf84634d066ef4e5b16fed31cf7fc5))
- added docs modified ai category response ([d3cf55e](https://github.com/devshahid/money-mind-server/commit/d3cf55e286b7da0f84f524b7fb47e48e8f958fab))
- added unit and integration testing ([#3](https://github.com/devshahid/money-mind-server/issues/3)) ([4e284a2](https://github.com/devshahid/money-mind-server/commit/4e284a2ce7638943522248a3e0c24942484df18e))
- migrate AI from deprecated GitHub Models to local Ollama with async job processing ([ebad3e5](https://github.com/devshahid/money-mind-server/commit/ebad3e5999fe6ffa6b224aab2aba44dd28615027))
- migrate AI to local Ollama with async job processing ([08d54b4](https://github.com/devshahid/money-mind-server/commit/08d54b4b0d5825c2f886f323609f1fa3ec4dcbe1))

# 1.0.0 (2026-07-17)

### Bug Fixes

- add env vars for AI tests in CI pipeline ([ccf1b56](https://github.com/devshahid/money-mind-server/commit/ccf1b56aa8a959a0e35f2de85dac6df83abba8dd))
- added logs for validation LLM response ([161ce74](https://github.com/devshahid/money-mind-server/commit/161ce74c5a86fe124385e6daa51329eeb2f33e30))
- handle stale MongoDB connections on Lambda cold starts ([69f12b0](https://github.com/devshahid/money-mind-server/commit/69f12b0b301aa7865b2d7a640dea05167950bd40))
- reduce AI batch size to 10 and add 25s LLM timeout to prevent 504s ([f5bbe43](https://github.com/devshahid/money-mind-server/commit/f5bbe43821371fae756e443ed3b5594563f190a0))
- switch to gpt-4o-mini, increase batch to 25, add LLM timeout ([a93c990](https://github.com/devshahid/money-mind-server/commit/a93c9905e5687b085913e6504a9aacc7457311ef))

### Features

- add isCredit to suggest-categories response and userOverride support in apply-suggestions ([8f5bc1f](https://github.com/devshahid/money-mind-server/commit/8f5bc1f62cc12d70ed9e0f8da4bcecaa36a6e0d1))
- add Refunds & Reversals category ([f40dad5](https://github.com/devshahid/money-mind-server/commit/f40dad58307b6908d543f91bcf4ef9d91f5f76a9))
- add uncategorized filter support with query ([7ae6cf2](https://github.com/devshahid/money-mind-server/commit/7ae6cf2213bf84634d066ef4e5b16fed31cf7fc5))
- added docs modified ai category response ([d3cf55e](https://github.com/devshahid/money-mind-server/commit/d3cf55e286b7da0f84f524b7fb47e48e8f958fab))
- added unit and integration testing ([#3](https://github.com/devshahid/money-mind-server/issues/3)) ([4e284a2](https://github.com/devshahid/money-mind-server/commit/4e284a2ce7638943522248a3e0c24942484df18e))
