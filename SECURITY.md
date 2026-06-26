# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Ta-Da!, please **do not** open a public GitHub issue.

Instead, report it privately via GitHub's [Security Advisories](https://github.com/InfantLab/tada/security/advisories/new) feature, or email **infantologist@gmail.com** with the subject line `[SECURITY] Ta-Da! vulnerability`.

Please include:
- A description of the vulnerability and its potential impact
- Steps to reproduce
- Any suggested remediation if you have one

You can expect an acknowledgement within 72 hours and a fix or mitigation plan within 14 days for confirmed vulnerabilities.

## Scope

This policy covers the Ta-Da! web app (`tada.living`) and Android app (`living.tada.app`).

## Notes on `google-services.json`

The `app/android/app/google-services.json` file contains a Firebase Web API key. This is a client-side identifier, not a secret — it is embedded in every Android APK by design. The key is restricted in Google Cloud Console to the `living.tada.app` package. See [Firebase documentation](https://firebase.google.com/support/privacy) for details.
