# Proposal: deploy Pair from the reviewed local commit

The current local Pi package differs substantially from commit `18d4c47`. Copying three files using the older `compat/install-live-backport.mjs` would not deliver context recovery or the full continuity implementation. Build the candidate from the committed package, including the explicitly reviewed owner-diagnostic fix exposed by the installed-version fixture, first verify compatibility with the actual installed package and preserved state in an isolated copy, then replace the package as one controlled promotion with an external SHA-verified backup. A running Pi must be restarted to ensure it and the worker use the newly installed code and global settings.

Human review is required before implementation. The installed extension must never be presented as activated merely because files were copied.
