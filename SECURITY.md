# Security Policy

This server handles OAuth tokens for personal health data, so security reports get top priority.

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/Rajskij/oura-mcp/security/advisories/new): the Security tab, then "Report a vulnerability". Please don't open public issues for security problems.

You can expect a first response within a few days. If the report is valid, the fix ships before any details go public.

## Especially interested in

- Anything that lets a third party read Oura data through this server
- Oura token or client secret leaking into logs, error messages, or tool responses
- Ways around the secret-path access control
- The server being tricked into calling non-Oura hosts (SSRF)

## Supported versions

The latest `main` and the `latest` Docker image. Older commits are not patched.
