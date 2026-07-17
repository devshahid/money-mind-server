# 1.0.0 (2026-07-17)


### Bug Fixes

* add env vars for AI tests in CI pipeline ([ccf1b56](https://github.com/devshahid/money-mind-server/commit/ccf1b56aa8a959a0e35f2de85dac6df83abba8dd))
* added logs for validation LLM response ([161ce74](https://github.com/devshahid/money-mind-server/commit/161ce74c5a86fe124385e6daa51329eeb2f33e30))
* handle stale MongoDB connections on Lambda cold starts ([69f12b0](https://github.com/devshahid/money-mind-server/commit/69f12b0b301aa7865b2d7a640dea05167950bd40))
* reduce AI batch size to 10 and add 25s LLM timeout to prevent 504s ([f5bbe43](https://github.com/devshahid/money-mind-server/commit/f5bbe43821371fae756e443ed3b5594563f190a0))
* switch to gpt-4o-mini, increase batch to 25, add LLM timeout ([a93c990](https://github.com/devshahid/money-mind-server/commit/a93c9905e5687b085913e6504a9aacc7457311ef))


### Features

* add isCredit to suggest-categories response and userOverride support in apply-suggestions ([8f5bc1f](https://github.com/devshahid/money-mind-server/commit/8f5bc1f62cc12d70ed9e0f8da4bcecaa36a6e0d1))
* add Refunds & Reversals category ([f40dad5](https://github.com/devshahid/money-mind-server/commit/f40dad58307b6908d543f91bcf4ef9d91f5f76a9))
* add uncategorized filter support with  query ([7ae6cf2](https://github.com/devshahid/money-mind-server/commit/7ae6cf2213bf84634d066ef4e5b16fed31cf7fc5))
* added docs modified ai category response ([d3cf55e](https://github.com/devshahid/money-mind-server/commit/d3cf55e286b7da0f84f524b7fb47e48e8f958fab))
* added unit and integration testing ([#3](https://github.com/devshahid/money-mind-server/issues/3)) ([4e284a2](https://github.com/devshahid/money-mind-server/commit/4e284a2ce7638943522248a3e0c24942484df18e))
